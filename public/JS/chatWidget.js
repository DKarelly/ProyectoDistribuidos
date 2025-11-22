// Chat Widget para Huellita Feliz - IA Assistant
(function() {
    'use strict';

    const STORAGE_KEY = 'huellita_chat_history';
    let chatHistory = [];

    // Crear estructura del widget
    function createChatWidget() {
        const widgetHTML = `
            <div id="huellita-chat-widget">
                <!-- Burbuja flotante -->
                <div id="chat-bubble" class="chat-bubble">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="chat-notification-badge" id="chat-badge" style="display: none;">1</span>
                </div>

                <!-- Ventana de chat -->
                <div id="chat-window" class="chat-window" style="display: none;">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar">🐾</div>
                            <div>
                                <h3>Huellita IA</h3>
                                <span class="chat-status">En línea</span>
                            </div>
                        </div>
                        <button id="chat-close" class="chat-close-btn">&times;</button>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages">
                        <div class="chat-message bot-message">
                            <div class="message-content">
                                ¡Hola! 👋 Soy Huellita IA, tu asistente virtual. Puedo ayudarte con adopciones, donaciones, cuidado de mascotas y mucho más. ¿En qué puedo ayudarte hoy?
                            </div>
                        </div>
                    </div>
                    
                    <div class="chat-input-container">
                        <input 
                            type="text" 
                            id="chat-input" 
                            class="chat-input" 
                            placeholder="Escribe tu mensaje..."
                            autocomplete="off"
                        />
                        <button id="chat-send" class="chat-send-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
    }

    // Cargar historial desde localStorage
    function loadHistory() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                chatHistory = JSON.parse(stored);
                renderHistory();
            }
        } catch (e) {
            console.error('Error cargando historial:', e);
        }
    }

    // Guardar historial en localStorage
    function saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-20)));
        } catch (e) {
            console.error('Error guardando historial:', e);
        }
    }

    // Renderizar historial existente
    function renderHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        const initialMessage = messagesContainer.querySelector('.bot-message');
        
        chatHistory.forEach(msg => {
            const messageDiv = createMessageElement(msg.content, msg.role === 'assistant');
            messagesContainer.appendChild(messageDiv);
        });

        scrollToBottom();
    }

    // Crear elemento de mensaje
    function createMessageElement(content, isBot) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isBot ? 'bot-message' : 'user-message'}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }

    // Crear mensaje de carga (typing indicator)
    function createTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <span></span><span></span><span></span>
            </div>
        `;
        return typingDiv;
    }

    // Scroll al final
    function scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Enviar mensaje
    async function sendMessage(message) {
        if (!message.trim()) return;

        const messagesContainer = document.getElementById('chat-messages');
        const input = document.getElementById('chat-input');

        // Agregar mensaje del usuario
        const userMessage = createMessageElement(message, false);
        messagesContainer.appendChild(userMessage);
        chatHistory.push({ role: 'user', content: message });
        
        input.value = '';
        scrollToBottom();

        // Mostrar indicador de escritura
        const typingIndicator = createTypingIndicator();
        messagesContainer.appendChild(typingIndicator);
        scrollToBottom();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    history: chatHistory.slice(-10)
                })
            });

            // Remover indicador de escritura
            typingIndicator.remove();

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const data = await response.json();

            if (data.success && data.message) {
                const botMessage = createMessageElement(data.message, true);
                messagesContainer.appendChild(botMessage);
                chatHistory.push({ role: 'assistant', content: data.message });
                saveHistory();
            } else {
                throw new Error('Respuesta inválida del servidor');
            }
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            typingIndicator.remove();
            const errorMessage = createMessageElement(
                'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                true
            );
            messagesContainer.appendChild(errorMessage);
        }

        scrollToBottom();
    }

    // Event Listeners
    function setupEventListeners() {
        const bubble = document.getElementById('chat-bubble');
        const closeBtn = document.getElementById('chat-close');
        const sendBtn = document.getElementById('chat-send');
        const input = document.getElementById('chat-input');
        const chatWindow = document.getElementById('chat-window');

        // Abrir/cerrar chat
        bubble.addEventListener('click', () => {
            const isVisible = chatWindow.style.display === 'flex';
            chatWindow.style.display = isVisible ? 'none' : 'flex';
            bubble.classList.toggle('active', !isVisible);
            
            if (!isVisible) {
                input.focus();
                document.getElementById('chat-badge').style.display = 'none';
            }
        });

        closeBtn.addEventListener('click', () => {
            chatWindow.style.display = 'none';
            bubble.classList.remove('active');
        });

        // Enviar mensaje
        sendBtn.addEventListener('click', () => {
            const message = input.value;
            sendMessage(message);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = input.value;
                sendMessage(message);
            }
        });
    }

    // Inicializar widget
    function init() {
        createChatWidget();
        loadHistory();
        setupEventListeners();
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
