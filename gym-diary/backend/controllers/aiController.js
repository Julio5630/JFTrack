const { createChatCompletion } = require('../services/groqService');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const suggestWorkout = async (req, res) => {
    try {
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
            error: error.statusCode ? error.message : 'Erro ao gerar sugestao de treino com IA'
        });
    }
};

const summarizeAssessment = async (req, res) => {
    try {
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
            error: error.statusCode ? error.message : 'Erro ao gerar resumo da avaliacao com IA'
        });
    }
};

module.exports = {
    suggestWorkout,
    summarizeAssessment
};
