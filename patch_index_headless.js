const fs = require('fs');

const path = 'demo/index.html';
const content = fs.readFileSync(path, 'utf8');

// The replacement HTML for the chat UI
const chatHtml = `
    <!-- Chat Tooltip -->
    <div id="chat-tooltip" class="chat-tooltip">
        Serve aiuto? Ci pensa Zirèl! 💬
    </div>

    <!-- Custom Chat Widget -->
    <div id="n8n-widget-mock"
        class="fixed bottom-24 right-6 z-[100] scale-0 transition-transform origin-bottom-right duration-500">
        <div class="bg-white w-[350px] h-[500px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-brand-sand">
            <div class="brand-gradient p-5 text-white flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                            <path fill-rule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div>
                        <h6 class="font-bold text-sm">Zirèl Assistant</h6>
                        <p class="text-[10px] opacity-70">Risponde istantaneamente</p>
                    </div>
                </div>
                <button onclick="toggleDemo()" class="opacity-50 hover:opacity-100 italic">Chiudi</button>
            </div>

            <div class="flex-grow p-4 space-y-4 bg-brand-sand/10 overflow-y-auto" id="chat-messages">
                <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-brand-sand/50">
                    <p class="mb-2">Ciao! 👋 Sono <strong class="text-brand-orange font-sans">Zirèl</strong>, l'assistente ufficiale del team.</p>
                    <p>Posso spiegarti come rivoluzionare la tua struttura, mostrarti i piani o fissarti una Demo. Come posso aiutarti?</p>
                </div>

                <div class="quick-replies" id="quick-replies-container">
                    <button class="quick-reply-btn"
                        onclick="sendChatMessage('✨ Come funziona Zirèl?')">
                        ✨ Come funziona Zirèl?
                    </button>
                    <button class="quick-reply-btn" onclick="sendChatMessage('💰 Mostrami i piani e i Prezzi')">
                        💰 Piani e Prezzi
                    </button>
                    <button class="quick-reply-btn"
                        onclick="sendChatMessage('🚀 Vorrei prenotare una Demo Gratuita')">
                        🚀 Prenota una Demo
                    </button>
                    <button class="quick-reply-btn" onclick="sendChatMessage('📞 Vorrei parlare con Federico')">
                        📞 Parla con Federico
                    </button>
                </div>
            </div>

            <div class="p-4 border-t border-brand-sand flex gap-2 items-center bg-white">
                <input type="text" id="chat-input-field" placeholder="Scrivi un messaggio..."
                    class="flex-grow bg-slate-100 h-10 rounded-full px-4 text-sm text-brand-blue border border-slate-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange placeholder:text-slate-400"
                    onkeypress="if(event.key === 'Enter') handleTextInput()">
                <button onclick="handleTextInput()"
                    class="w-10 h-10 min-w-[40px] bg-brand-orange hover:bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 ml-1">
                        <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Chat Toggle Button -->
    <button onclick="toggleDemo()" id="chat-toggle-btn"
        class="fixed bottom-6 right-6 w-14 h-14 bg-brand-orange hover:bg-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl z-[101] hover:-translate-y-1 active:scale-95 transition-all duration-300 flex overflow-hidden border-2 border-white">
        <span id="toggle-icon-open" class="text-white drop-shadow-md flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.38-.432 1.628-1.4 3.053-1.4 3.053s1.423-.132 2.871-.58a9.492 9.492 0 005.256 1.647z" />
            </svg>
        </span>
    </button>
`;

// Extract the script tag we inserted previously and replace it
const parts = content.split('<script type="module">');
const beforeScript = parts[0];

const scriptBody = `    <script>
        // Custom Headless Chat Logic
        // Genera un ID sessione casuale per l'utente, così n8n ricorda la cronologia
        if(!sessionStorage.getItem('zirel_session_id')) {
            sessionStorage.setItem('zirel_session_id', 'session_' + Math.random().toString(36).substring(2, 10));
        }
        const sessionId = sessionStorage.getItem('zirel_session_id');
        const webhookUrl = 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';

        function hideTooltip() {
            const tooltip = document.getElementById('chat-tooltip');
            if(tooltip) tooltip.classList.remove('visible');
            if(window.tooltipTimer) clearTimeout(window.tooltipTimer);
        }

        function toggleDemo() {
            const widget = document.getElementById('n8n-widget-mock');
            const icon = document.getElementById('toggle-icon-open');
            hideTooltip();
            if (widget.classList.contains('scale-0')) {
                widget.classList.remove('scale-0');
                widget.classList.add('scale-100');
                icon.innerHTML = '<span class="text-2xl font-bold">✕</span>';
            } else {
                widget.classList.remove('scale-100');
                widget.classList.add('scale-0');
                // Restore icon
                icon.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-8 h-8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.38-.432 1.628-1.4 3.053-1.4 3.053s1.423-.132 2.871-.58a9.492 9.492 0 005.256 1.647z" /></svg>\`;
            }
        }

        async function sendChatMessage(text) {
            const container = document.getElementById('chat-messages');
            const quickReplies = document.getElementById('quick-replies-container');
            if (quickReplies) quickReplies.style.display = 'none';

            // User Message HTML
            const userMsg = document.createElement('div');
            userMsg.className = 'bg-brand-cyan/10 p-3 rounded-2xl rounded-tr-none shadow-sm ml-auto max-w-[85%] text-sm text-brand-blue border border-brand-cyan/20';
            userMsg.innerText = text;
            container.appendChild(userMsg);
            container.scrollTop = container.scrollHeight;

            // Loading state
            const loadingMsg = document.createElement('div');
            loadingMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[50%] text-sm border border-brand-sand/50 mt-4 italic text-slate-400';
            loadingMsg.innerText = 'Scrivendo...';
            container.appendChild(loadingMsg);
            container.scrollTop = container.scrollHeight;

            try {
                // Call n8n webhook
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chatInput: text,
                        sessionId: sessionId,
                        tenant_id: 'zirel_official'
                    })
                });

                let responseData;
                const clonedResponse = response.clone();
                try {
                    responseData = await response.json();
                } catch(e) {
                    const textResponse = await clonedResponse.text();
                    responseData = { output: textResponse };
                }

                // Remove loading
                loadingMsg.remove();

                // Get bot text
                let botText = "Scusa, ho avuto un imprevisto con la connessione.";
                if(responseData && responseData.output) {
                    botText = responseData.output;
                } else if(Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
                    botText = responseData[0].output;
                } else if(typeof responseData === 'object' && Object.keys(responseData).length > 0) {
                    botText = JSON.stringify(responseData);
                } else if (typeof responseData === 'string') {
                    botText = responseData;
                }

                const botMsg = document.createElement('div');
                botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-brand-sand/50 mt-4 whitespace-pre-line';
                botMsg.innerHTML = botText; // Use innerHTML to allow links if n8n returns them
                container.appendChild(botMsg);
                container.scrollTop = container.scrollHeight;

            } catch(e) {
                loadingMsg.remove();
                const botMsg = document.createElement('div');
                botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-red-200 mt-4 text-red-500';
                botMsg.innerText = "Non sono riuscito a contattare il server. Riprova tra poco.";
                container.appendChild(botMsg);
                container.scrollTop = container.scrollHeight;
                console.error("Chat error:", e);
            }
        }

        function handleTextInput() {
            const input = document.getElementById('chat-input-field');
            const text = input.value.trim();
            if(text) {
                sendChatMessage(text);
                input.value = '';
            }
        }

`;

// Now keep the rest of the file which starts at /* Script to safely color (or actually I removed everything after <script type=module> in parts extraction)
const afterScriptParts = parts[1].split('// Carousel Logic');
const remainingJs = '// Carousel Logic' + afterScriptParts[1];

const finalContent = beforeScript + chatHtml + scriptBody + remainingJs;
fs.writeFileSync(path, finalContent);
console.log("Patched index.html for headless chat");
