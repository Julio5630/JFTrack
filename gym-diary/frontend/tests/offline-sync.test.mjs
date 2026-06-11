import assert from 'node:assert/strict';

const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};
global.window = { dispatchEvent: () => {} };
global.CustomEvent = class {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};
Object.defineProperty(global, 'navigator', { value: { onLine: false }, configurable: true });
localStorage.setItem('authToken', 'token-test');

const offline = await import('../src/services/offlineApi.js');
const exerciseResult = offline.queueOfflineMutation('/exercises', {
  method: 'POST',
  body: JSON.stringify({ name: 'Exercicio Offline Teste', category: 'Peito', videoUrl: '' })
});
const templateResult = offline.queueOfflineMutation('/templates', {
  method: 'POST',
  body: JSON.stringify({ name: 'Treino Offline Teste', exercises: [{ id: exerciseResult.exercise.id, defaultSets: 3 }] })
});
offline.queueOfflineMutation('/history', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Treino Offline Teste',
    template_id: templateResult.templateId,
    source_type: 'own',
    date: '2026-06-11',
    exercises: [{ exerciseId: exerciseResult.exercise.id, sets: [{ reps: 10, weight: 20, completed: true }] }]
  })
});

assert.equal(offline.getOfflineQueueSize(), 3);

const calls = [];
global.navigator.onLine = true;
global.fetch = async (url, options = {}) => {
  const endpoint = new URL(url).pathname.replace('/api', '');
  const body = options.body ? JSON.parse(options.body) : null;
  calls.push({ endpoint, method: options.method || 'GET', body });

  if (endpoint === '/exercises' && options.method === 'POST') return new Response(JSON.stringify({ message: 'ok' }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  if (endpoint === '/exercises') return new Response(JSON.stringify([{ id: 101, name: 'Exercicio Offline Teste', category: 'Peito' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (endpoint === '/templates') return new Response(JSON.stringify({ templateId: 202 }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  if (endpoint === '/history') return new Response(JSON.stringify({ workoutId: 303 }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
};

const result = await offline.syncOfflineQueue('http://localhost/api', 'token-test');
const templateCall = calls.find((call) => call.endpoint === '/templates');
const historyCall = calls.find((call) => call.endpoint === '/history');

assert.deepEqual(result, { synced: 3, pending: 0 });
assert.equal(templateCall.body.exercises[0].id, 101);
assert.equal(historyCall.body.template_id, 202);
assert.equal(historyCall.body.exercises[0].exerciseId, 101);
assert.equal(offline.getOfflineQueueSize(), 0);

console.log('Offline sync test passed: exercise -> template -> workout history.');
