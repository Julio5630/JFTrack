const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const ensureGroqConfigured = () => {
    if (!process.env.GROQ_API_KEY) {
        const error = new Error('GROQ_API_KEY nao configurada');
        error.statusCode = 503;
        throw error;
    }
};

const parseJsonResponse = (content) => {
    if (!content) {
        throw new Error('Resposta vazia da IA');
    }

    const normalized = String(content).trim();
    const fencedMatch = normalized.match(/```json\s*([\s\S]*?)```/i) || normalized.match(/```\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : normalized;
    return JSON.parse(candidate);
};

const createChatCompletion = async ({ system, user, temperature = 0.6, max_tokens = 1400 }) => {
    ensureGroqConfigured();

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature,
            max_tokens,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user }
            ]
        })
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const error = new Error(`Erro Groq: ${response.status}`);
        error.statusCode = 502;
        error.details = errorBody;
        throw error;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    return parseJsonResponse(content);
};

module.exports = {
    createChatCompletion
};
