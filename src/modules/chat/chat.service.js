const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// ============================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================

const SYSTEM_PROMPT = `Eres "Huellita IA", un asistente cálido y empático inspirado en Huellita Feliz. Puedes responder CUALQUIER tipo de pregunta: animales, adopciones, programación, matemáticas, tecnología, salud general, historia y más. Prioriza temas de rescate animal, adopción y donaciones, pero eres una IA general similar a ChatGPT. Responde siempre con claridad, orden y amabilidad.`;

// ============================================
// VALIDACIÓN DE API KEYS
// ============================================

const isClaudeConfigured = () => 
    process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== '';

const isGeminiConfigured = () => 
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';

const isOpenAIConfigured = () => 
    process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';

// ============================================
// SERVICIO CLAUDE (ANTHROPIC) - PRIORIDAD 1
// ============================================

const tryClaude = async (userMessage, history = []) => {
    if (!isClaudeConfigured()) {
        console.log('[Chat Service] Claude no configurado, se omite.');
        return null;
    }

    try {
        console.log('[Chat Service] Intentando con Claude...');
        
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        // Construir mensajes para Claude
        const messages = [
            ...history.slice(-10).map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 800,
            system: SYSTEM_PROMPT,
            messages: messages
        });

        const text = response.content[0]?.text;
        
        if (!text || text.trim().length === 0) {
            throw new Error('Respuesta vacía de Claude');
        }

        console.log('[Chat Service] ✅ Claude OK');
        return text.trim();

    } catch (err) {
        console.error('[Chat Service] ❌ Claude falló:', err.message);
        return null;
    }
};

// ============================================
// SERVICIO GOOGLE GEMINI - PRIORIDAD 2
// ============================================

const tryGemini = async (userMessage, history = []) => {
    if (!isGeminiConfigured()) {
        console.log('[Chat Service] Gemini no configurado, se omite.');
        return null;
    }

    try {
        console.log('[Chat Service] Intentando con Gemini...');
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
        });

        // Construir prompt con historial
        let fullPrompt = SYSTEM_PROMPT + '\n\n';
        
        history.slice(-10).forEach(msg => {
            const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
            fullPrompt += `${role}: ${msg.content}\n`;
        });
        
        fullPrompt += `Usuario: ${userMessage}\nAsistente:`;

        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();

        if (!text || text.trim().length === 0) {
            throw new Error('Respuesta vacía de Gemini');
        }

        console.log('[Chat Service] ✅ Gemini OK');
        return text.trim();

    } catch (err) {
        console.error('[Chat Service] ❌ Gemini falló:', err.message);
        return null;
    }
};

// ============================================
// SERVICIO OPENAI - PRIORIDAD 3
// ============================================

const tryOpenAI = async (userMessage, history = []) => {
    if (!isOpenAIConfigured()) {
        console.log('[Chat Service] OpenAI no configurado, se omite.');
        return null;
    }

    try {
        console.log('[Chat Service] Intentando con OpenAI...');
        
        const client = new OpenAI({ 
            apiKey: process.env.OPENAI_API_KEY 
        });
        
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        // Construir mensajes para OpenAI
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-10).filter(m => 
                m && typeof m.content === 'string' && 
                (m.role === 'user' || m.role === 'assistant')
            ),
            { role: 'user', content: userMessage }
        ];

        const completion = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 800
        });

        const text = completion.choices[0]?.message?.content;

        if (!text || text.trim().length === 0) {
            throw new Error('Respuesta vacía de OpenAI');
        }

        console.log('[Chat Service] ✅ OpenAI OK');
        return text.trim();

    } catch (err) {
        console.error('[Chat Service] ❌ OpenAI falló:', err.message);
        return null;
    }
};

// ============================================
// SERVICIO PRINCIPAL DE CHAT CON FALLBACK
// ============================================

const getChatResponse = async (userMessage, history = []) => {
    // Validar entrada
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
        throw new Error('Mensaje inválido');
    }

    if (!Array.isArray(history)) {
        history = [];
    }

    // Verificar que al menos un servicio esté configurado
    const claudeAvailable = isClaudeConfigured();
    const geminiAvailable = isGeminiConfigured();
    const openAIAvailable = isOpenAIConfigured();

    if (!claudeAvailable && !geminiAvailable && !openAIAvailable) {
        throw new Error('No hay servicios de IA configurados. Configure ANTHROPIC_API_KEY, GEMINI_API_KEY o OPENAI_API_KEY');
    }

    // FALLBACK PRIORITY: Claude → Gemini → OpenAI

    // 1️⃣ Intentar con Claude (Anthropic) primero
    if (claudeAvailable) {
        const response = await tryClaude(userMessage, history);
        if (response) return response;
    }

    // 2️⃣ Intentar con Google Gemini
    if (geminiAvailable) {
        const response = await tryGemini(userMessage, history);
        if (response) return response;
    }

    // 3️⃣ Intentar con OpenAI como última opción
    if (openAIAvailable) {
        const response = await tryOpenAI(userMessage, history);
        if (response) return response;
    }

    // Si todos fallaron
    throw new Error('Ningún servicio de IA respondió');
};

// ============================================
// EXPORTAR
// ============================================

module.exports = { getChatResponse };
