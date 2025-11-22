const { getChatResponse } = require('./chat.service.js');

const sendMessage = async (req, res) => {
    try {
        const { message, history = [] } = req.body || {};

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ 
                success: false, 
                error: 'El mensaje es requerido' 
            });
        }

        const response = await getChatResponse(message, history);

        res.json({
            success: true,
            message: response
        });
    } catch (error) {
        console.error('Error en chat controller:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Error al procesar el mensaje'
        });
    }
};

module.exports = { sendMessage };
