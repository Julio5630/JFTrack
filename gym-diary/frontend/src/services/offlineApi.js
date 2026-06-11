const CACHE_PREFIX = 'jftrack.api.cache.';
const QUEUE_KEY = 'jftrack.offline.queue';
const ID_MAP_KEY = 'jftrack.offline.idMap';
let syncInFlight = null;

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const getContextKey = () => [
  (localStorage.getItem('authToken') || 'anonymous').slice(-18),
  localStorage.getItem('activeProfile') || 'none',
  localStorage.getItem('studentTrainingMode') || 'none',
  localStorage.getItem('selectedStudentGymId') || 'none'
].join(':');

const getCacheKey = (endpoint) => `${CACHE_PREFIX}${getContextKey()}:${endpoint}`;
const getQueue = () => parseJson(localStorage.getItem(QUEUE_KEY), []);
const setQueue = (queue) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
const getIdMap = () => parseJson(localStorage.getItem(ID_MAP_KEY), {});
const setIdMap = (map) => localStorage.setItem(ID_MAP_KEY, JSON.stringify(map));
const temporaryId = () => -Math.max(Date.now(), Math.floor(Math.random() * 1000000000));

export const cacheApiResponse = (endpoint, data) => {
  localStorage.setItem(getCacheKey(endpoint), JSON.stringify({ data, savedAt: Date.now() }));
};

export const getCachedApiResponse = (endpoint) => (
  parseJson(localStorage.getItem(getCacheKey(endpoint)), null)?.data ?? null
);

const updateCachedList = (endpoint, updater) => {
  const current = getCachedApiResponse(endpoint);
  const next = updater(Array.isArray(current) ? current : []);
  cacheApiResponse(endpoint, next);
  return next;
};

const buildOfflineResult = (endpoint, body) => {
  if (endpoint === '/exercises') {
    const exercise = { id: temporaryId(), user_id: null, ...body, video_url: body.videoUrl || '', offlinePending: true };
    updateCachedList('/exercises', (items) => [exercise, ...items]);
    return { message: 'Exercício salvo no aparelho', exercise, offlinePending: true };
  }

  if (endpoint === '/templates') {
    const templateId = temporaryId();
    const template = {
      id: templateId,
      name: body.name,
      exercises: body.exercises || [],
      frequency: body.frequency || '',
      splitType: body.splitType || '',
      notes: body.notes || '',
      status: 'active',
      canEdit: true,
      createdByProfile: 'student',
      offlinePending: true
    };
    updateCachedList('/templates', (items) => [template, ...items]);
    return { message: 'Treino salvo no aparelho', templateId, offlinePending: true };
  }

  if (endpoint === '/history') {
    const workoutId = temporaryId();
    const workout = {
      id: workoutId,
      ...body,
      templateId: body.template_id || null,
      source_type: body.source_type || 'own',
      offlinePending: true
    };
    updateCachedList('/history', (items) => [workout, ...items]);
    return { message: 'Treino concluído e salvo no aparelho', workoutId, offlinePending: true };
  }

  return null;
};

export const queueOfflineMutation = (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const body = parseJson(options.body, {});
  const result = buildOfflineResult(endpoint, body);
  if (!result) return null;

  const queue = getQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    endpoint,
    method,
    body,
    tempId: result.exercise?.id || result.templateId || result.workoutId,
    context: {
      owner: (localStorage.getItem('authToken') || 'anonymous').slice(-18),
      activeProfile: localStorage.getItem('activeProfile'),
      studentTrainingMode: localStorage.getItem('studentTrainingMode'),
      selectedStudentGymId: localStorage.getItem('selectedStudentGymId')
    },
    createdAt: Date.now()
  });
  setQueue(queue);
  window.dispatchEvent(new CustomEvent('jftrack:offline-queue', { detail: { pending: queue.length } }));
  return result;
};

const resolveId = (value, idMap) => Number(value) < 0 ? idMap[value] || value : value;
const resolveBody = (entry, idMap) => {
  const body = structuredClone(entry.body);
  if (body.template_id) body.template_id = resolveId(body.template_id, idMap);
  if (Array.isArray(body.exercises)) {
    body.exercises = body.exercises.map((exercise) => ({
      ...exercise,
      id: exercise.id ? resolveId(exercise.id, idMap) : exercise.id,
      exerciseId: exercise.exerciseId ? resolveId(exercise.exerciseId, idMap) : exercise.exerciseId
    }));
  }
  return body;
};

const getHeadersForEntry = (entry, token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (entry.context.activeProfile) headers['X-Active-Profile'] = entry.context.activeProfile;
  if (entry.context.studentTrainingMode) headers['X-Student-Training-Mode'] = entry.context.studentTrainingMode;
  if (entry.context.selectedStudentGymId) headers['X-Selected-Student-Gym-Id'] = entry.context.selectedStudentGymId;
  return headers;
};

const performOfflineSync = async (apiUrl, token) => {
  if (!navigator.onLine) return { synced: 0, pending: getQueue().length };

  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  const idMap = getIdMap();
  const pending = [];
  let synced = 0;
  const currentOwner = (token || 'anonymous').slice(-18);

  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index];
    if (entry.context.owner && entry.context.owner !== currentOwner) {
      pending.push(entry);
      continue;
    }
    const body = resolveBody(entry, idMap);
    const hasUnresolvedId = JSON.stringify(body).match(/:-\d+/);
    if (hasUnresolvedId) {
      pending.push(entry);
      continue;
    }

    try {
      const response = await fetch(`${apiUrl}${entry.endpoint}`, {
        method: entry.method,
        headers: getHeadersForEntry(entry, token),
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Erro ${response.status}`);
      const result = response.status === 204 ? null : await response.json();

      let realId = result?.exercise?.id || result?.templateId || result?.workoutId;
      if (!realId && entry.endpoint === '/exercises') {
        const exerciseResponse = await fetch(`${apiUrl}/exercises`, { headers: getHeadersForEntry(entry, token) });
        if (exerciseResponse.ok) {
          const exercises = await exerciseResponse.json();
          realId = exercises.find((exercise) => exercise.name === body.name && exercise.category === body.category)?.id;
        }
      }
      if (entry.tempId && realId) idMap[entry.tempId] = realId;
      synced += 1;
    } catch (error) {
      pending.push(entry, ...queue.slice(index + 1));
      break;
    }
  }

  setIdMap(idMap);
  setQueue(pending);
  if (synced > 0) window.dispatchEvent(new CustomEvent('jftrack:offline-synced', { detail: { synced, pending: pending.length } }));
  return { synced, pending: pending.length };
};

export const syncOfflineQueue = (apiUrl, token) => {
  if (syncInFlight) return syncInFlight;
  syncInFlight = performOfflineSync(apiUrl, token).finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
};

export const getOfflineQueueSize = () => getQueue().length;
