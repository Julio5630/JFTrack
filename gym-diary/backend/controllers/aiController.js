const { createChatCompletion } = require('../services/groqService');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const AI_REQUEST_COOLDOWN_MS = Math.max(0, Number(process.env.AI_REQUEST_COOLDOWN_MS || 20000));
const aiRequestCooldownByUser = new Map();

const ensureAiRequestCooldown = (req, scope) => {
    const actorKey = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || 'unknown'}`;
    const cooldownKey = `${actorKey}:${scope}`;
    const now = Date.now();
    const availableAt = Number(aiRequestCooldownByUser.get(cooldownKey) || 0);

    if (availableAt > now) {
        const retryAfterMs = availableAt - now;
        const seconds = Math.ceil(retryAfterMs / 1000);
        const error = new Error(`Aguarde ${seconds}s antes de fazer outra solicitação para a IA.`);
        error.statusCode = 429;
        error.code = 'AI_COOLDOWN';
        error.retryAfterMs = retryAfterMs;
        throw error;
    }

    aiRequestCooldownByUser.set(cooldownKey, now + AI_REQUEST_COOLDOWN_MS);
};

const normalizeExerciseCatalog = (exercises = []) => exercises
    .map((exercise) => ({
        id: Number(exercise.id),
        name: String(exercise.name || '').trim(),
        category: String(exercise.category || 'Outros').trim() || 'Outros'
    }))
    .filter((exercise) => Number.isFinite(exercise.id) && exercise.id > 0 && exercise.name);

const buildWorkoutSuggestionPrompt = ({
    goal = '',
    level = '',
    daysPerWeek = '',
    sessionMinutes = '',
    focusAreas = '',
    restrictions = '',
    notes = '',
    exercises = []
}) => `
Crie uma sugestao inicial de treino para um app de academia.

Regras obrigatorias:
- Responda apenas em JSON valido.
- Use somente exercicios da lista enviada.
- Para exercicios de categoria "Cardio", retorne "durationMinutes" e defina "defaultSets" como 1.
- Para exercicios que nao sao cardio, retorne "defaultSets" e nao use "durationMinutes".
- Nao repita exercicios.
- Gere uma sugestao enxuta e pratica, com no maximo 8 exercicios.
- O campo "name" deve ser um nome curto do treino em portugues.

Formato exato:
{
  "name": "string",
  "rationale": "string",
  "exercises": [
    {
      "id": 1,
      "defaultSets": 3,
      "durationMinutes": null
    }
  ]
}

Contexto do aluno:
- objetivo: ${goal || 'nao informado'}
- nivel: ${level || 'nao informado'}
- dias por semana: ${daysPerWeek || 'nao informado'}
- tempo por sessao: ${sessionMinutes || 'nao informado'} minutos
- focos: ${focusAreas || 'nao informado'}
- restricoes: ${restrictions || 'nao informado'}
- observacoes extras: ${notes || 'nao informado'}

Biblioteca de exercicios disponiveis:
${JSON.stringify(exercises, null, 2)}
`;

const buildAssessmentSummaryPrompt = (assessment) => `
Você está resumindo uma avaliação física para o próprio aluno.

Regras obrigatórias:
- Responda apenas em JSON válido.
- Use linguagem clara, acolhedora e objetiva.
- Não faça diagnóstico médico.
- Quando houver alerta de saúde, apenas reforce que o aluno deve seguir orientação profissional.
- O texto deve ser em português do Brasil.

Formato exato:
{
  "headline": "string",
  "summary": "string",
  "highlights": ["string", "string"],
  "attentionPoints": ["string"],
  "nextSteps": ["string", "string"]
}

Dados da avaliação:
${JSON.stringify(assessment, null, 2)}
`;

const buildAssessmentPlanPrompt = ({
    assessment = {},
    exercises = []
}) => `
Voce esta ajudando um personal trainer a concluir uma avaliacao fisica e montar um plano inicial de treino.

Regras obrigatorias:
- Responda apenas em JSON valido.
- Todo o texto deve estar em portugues do Brasil.
- Use somente exercicios da biblioteca enviada.
- Para exercicios de categoria "Cardio", use "durationMinutes" e defina "defaultSets" como 1.
- Para exercicios que nao sao cardio, use "defaultSets" e "defaultReps", e nao use "durationMinutes".
- Nao repita o mesmo exercicio dentro do mesmo treino.
- Gere um plano pratico, seguro e coerente com a disponibilidade semanal.
- Nao faça diagnostico medico.

Formato exato:
{
  "insights": {
    "headline": "string",
    "summary": "string",
    "observations": ["string", "string", "string"]
  },
  "trainingPlan": {
    "name": "string",
    "splitType": "string",
    "frequency": "string",
    "notes": "string",
    "workouts": [
      {
        "name": "string",
        "frequency": "string",
        "notes": "string",
        "exercises": [
          {
            "id": 1,
            "defaultSets": 3,
            "defaultReps": "10-12",
            "durationMinutes": null,
            "note": "string"
          }
        ]
      }
    ]
  }
}

Orientacoes de montagem:
- Se o aluno for iniciante ou treinar ate 3x por semana, prefira full body.
- Se houver 4 ou mais dias e nivel intermediario/avancado, pode dividir melhor os grupos.
- Cada treino deve ter em media 5 a 7 exercicios.
- O nome do plano deve seguir o estilo: "Emagrecimento - Full body inicial".
- O campo "frequency" deve seguir o estilo: "3x na semana".
- O resumo deve soar como uma observacao profissional clara e editavel pelo personal.

Dados da avaliacao:
${JSON.stringify(assessment, null, 2)}

Biblioteca de exercicios disponiveis:
${JSON.stringify(exercises, null, 2)}
`;

const validateWorkoutSuggestion = (suggestion, availableExercises) => {
    const availableMap = new Map(availableExercises.map((exercise) => [exercise.id, exercise]));
    const normalizedExercises = [];

    for (const item of suggestion?.exercises || []) {
        const exerciseId = Number(item.id);
        const matchedExercise = availableMap.get(exerciseId);
        if (!matchedExercise) continue;

        if (matchedExercise.category === 'Cardio') {
            normalizedExercises.push({
                id: exerciseId,
                defaultSets: 1,
                durationMinutes: clamp(Number(item.durationMinutes) || 20, 5, 180)
            });
            continue;
        }

        normalizedExercises.push({
            id: exerciseId,
            defaultSets: clamp(Number(item.defaultSets) || 3, 1, 10),
            durationMinutes: null
        });
    }

    const uniqueExercises = normalizedExercises.filter(
        (exercise, index, array) => array.findIndex((candidate) => candidate.id === exercise.id) === index
    );

    if (!suggestion?.name || uniqueExercises.length === 0) {
        const error = new Error('A IA nao retornou uma sugestao de treino valida.');
        error.statusCode = 502;
        throw error;
    }

    return {
        name: String(suggestion.name).trim().slice(0, 120),
        rationale: String(suggestion.rationale || '').trim(),
        exercises: uniqueExercises
    };
};

const validateAssessmentSummary = (summary) => {
    const normalizeList = (list, fallback = []) => (
        Array.isArray(list)
            ? list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
            : fallback
    );

    return {
        headline: String(summary?.headline || 'Resumo da sua avaliação').trim(),
        summary: String(summary?.summary || '').trim(),
        highlights: normalizeList(summary?.highlights),
        attentionPoints: normalizeList(summary?.attentionPoints),
        nextSteps: normalizeList(summary?.nextSteps)
    };
};

const validateAssessmentPlan = (result, availableExercises) => {
    const availableMap = new Map(availableExercises.map((exercise) => [exercise.id, exercise]));
    const normalizeWorkoutExercises = (items = []) => items
        .map((item) => {
            const exerciseId = Number(item.id);
            const matchedExercise = availableMap.get(exerciseId);
            if (!matchedExercise) return null;

            if (matchedExercise.category === 'Cardio') {
                return {
                    id: exerciseId,
                    defaultSets: 1,
                    defaultReps: '0',
                    durationMinutes: clamp(Number(item.durationMinutes) || 20, 5, 180),
                    note: String(item.note || '').trim(),
                    name: matchedExercise.name,
                    category: matchedExercise.category
                };
            }

            return {
                id: exerciseId,
                defaultSets: clamp(Number(item.defaultSets) || 3, 1, 10),
                defaultReps: String(item.defaultReps || '10-12').trim().slice(0, 20),
                durationMinutes: null,
                note: String(item.note || '').trim(),
                name: matchedExercise.name,
                category: matchedExercise.category
            };
        })
        .filter(Boolean)
        .filter((exercise, index, array) => array.findIndex((candidate) => candidate.id === exercise.id) === index)
        .slice(0, 8);

    const workouts = Array.isArray(result?.trainingPlan?.workouts)
        ? result.trainingPlan.workouts
            .map((workout, index) => ({
                name: String(workout?.name || `Treino ${index + 1}`).trim().slice(0, 120),
                frequency: String(workout?.frequency || `${index + 1}/${Math.max(1, result.trainingPlan.workouts.length)} da semana`).trim().slice(0, 60),
                notes: String(workout?.notes || '').trim(),
                exercises: normalizeWorkoutExercises(workout?.exercises)
            }))
            .filter((workout) => workout.name && workout.exercises.length > 0)
            .slice(0, 7)
        : [];

    if (workouts.length === 0) {
        const error = new Error('A IA nao retornou um plano de avaliacao valido.');
        error.statusCode = 502;
        throw error;
    }

    return {
        insights: {
            headline: String(result?.insights?.headline || 'Leitura inicial da avaliacao').trim(),
            summary: String(result?.insights?.summary || '').trim(),
            observations: Array.isArray(result?.insights?.observations)
                ? result.insights.observations.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
                : []
        },
        trainingPlan: {
            name: String(result?.trainingPlan?.name || 'Plano inicial').trim().slice(0, 120),
            splitType: String(result?.trainingPlan?.splitType || 'Full body').trim().slice(0, 60),
            frequency: String(result?.trainingPlan?.frequency || `${workouts.length}x na semana`).trim().slice(0, 60),
            notes: String(result?.trainingPlan?.notes || '').trim(),
            workouts
        }
    };
};

const suggestWorkout = async (req, res) => {
    try {
        ensureAiRequestCooldown(req, 'workout-suggestion');

        const availableExercises = normalizeExerciseCatalog(req.body.availableExercises);
        if (availableExercises.length === 0) {
            return res.status(400).json({ error: 'Envie a biblioteca de exercicios para gerar a sugestao.' });
        }

        const result = await createChatCompletion({
            system: 'Você é um especialista em prescrição inicial de treinos de musculação para um app fitness.',
            user: buildWorkoutSuggestionPrompt({
                goal: req.body.goal,
                level: req.body.level,
                daysPerWeek: req.body.daysPerWeek,
                sessionMinutes: req.body.sessionMinutes,
                focusAreas: req.body.focusAreas,
                restrictions: req.body.restrictions,
                notes: req.body.notes,
                exercises: availableExercises
            }),
            temperature: 0.5,
            max_tokens: 1200
        });

        res.json({
            suggestion: validateWorkoutSuggestion(result, availableExercises)
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Erro ao gerar sugestao de treino com IA',
            code: error.code || '',
            retryAfterMs: error.retryAfterMs || 0
        });
    }
};

const summarizeAssessment = async (req, res) => {
    try {
        ensureAiRequestCooldown(req, 'assessment-summary');

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Envie os dados da avaliacao para gerar o resumo.' });
        }

        const result = await createChatCompletion({
            system: 'Você resume avaliações físicas com linguagem clara e segura para o aluno.',
            user: buildAssessmentSummaryPrompt(req.body),
            temperature: 0.4,
            max_tokens: 1000
        });

        res.json({
            summary: validateAssessmentSummary(result)
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Erro ao gerar resumo da avaliacao com IA',
            code: error.code || '',
            retryAfterMs: error.retryAfterMs || 0
        });
    }
};

const generateAssessmentPlan = async (req, res) => {
    try {
        ensureAiRequestCooldown(req, 'assessment-plan');

        const availableExercises = normalizeExerciseCatalog(req.body.availableExercises);
        if (availableExercises.length === 0) {
            return res.status(400).json({ error: 'Envie a biblioteca de exercicios para gerar o plano da avaliacao.' });
        }

        const result = await createChatCompletion({
            system: 'Voce cria insights profissionais e um plano inicial de treino para avaliacao fisica, com linguagem clara e segura.',
            user: buildAssessmentPlanPrompt({
                assessment: req.body.assessment || req.body,
                exercises: availableExercises
            }),
            temperature: 0.45,
            max_tokens: 1800
        });

        res.json({
            plan: validateAssessmentPlan(result, availableExercises)
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : 'Erro ao gerar plano final da avaliacao com IA',
            code: error.code || '',
            retryAfterMs: error.retryAfterMs || 0
        });
    }
};

module.exports = {
    suggestWorkout,
    summarizeAssessment,
    generateAssessmentPlan
};
