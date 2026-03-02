/**
 * chat.js — Zirèl Widget: Logica chat condivisa tra index.html e demo.html
 *
 * Dipendenze:
 *   - config.js deve essere caricato prima di questo file (imposta window.ZirelConfig)
 *   - Ogni pagina ospite deve definire window.zirelTooltipMessages[] prima del tag <script src="chat.js">
 *     Se non definito, vengono usati i messaggi di default.
 */

// ─── Configurazione runtime ───────────────────────────────────────────────────
(function () {
    'use strict';

    const cfg = window.ZirelConfig || {};
    const webhookUrl = cfg.webhookUrl || 'https://zirel.app.n8n.cloud/webhook/zirel-chat';
    const tenantId = cfg.tenantId || 'zirel_official';

    // Sessione utente — prefissata con tenantId per garantire isolamento
    // nel Postgres Chat Memory (evita collisioni tra sessioni di tenant diversi)
    const sessionKey = 'zirel_session_' + tenantId;
    if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(
            sessionKey,
            tenantId + '__' + Math.random().toString(36).substring(2, 10)
        );
    }
    const sessionId = sessionStorage.getItem(sessionKey);

    // Messaggi tooltip (sovrascrivibili dalla pagina ospite)
    const tooltipMessages = window.zirelTooltipMessages || [
        'Serve aiuto? Ci pensa Zirèl! 💬',
        'Fissa una Demo Gratuita! 🚀',
        "Scopri come funziona l'AI 🤖",
        'Aumenta le tue prenotazioni! 📈',
    ];
    let tooltipIndex = 0;

    // ─── Utility ─────────────────────────────────────────────────────────────
    function escapeHTML(str) {
        const s = String(str == null ? '' : str);
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return s.replace(/[&<>'"]/g, tag => map[tag] || tag);
    }

    // ─── Tooltip ──────────────────────────────────────────────────────────────
    function hideTooltip() {
        const tooltip = document.getElementById('chat-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
        if (window.tooltipTimer) clearTimeout(window.tooltipTimer);
    }

    function showAndCycleTooltip() {
        const tooltip = document.getElementById('chat-tooltip');
        const widget = document.getElementById('n8n-widget-mock');
        if (widget && widget.classList.contains('scale-0') && tooltip) {
            tooltip.innerText = tooltipMessages[tooltipIndex];
            tooltip.classList.add('visible');
            tooltipIndex = (tooltipIndex + 1) % tooltipMessages.length;
            window.tooltipTimer = setTimeout(() => tooltip.classList.remove('visible'), 4000);
        }
    }

    // Avvia ciclo tooltip dopo 5s, poi ogni 7s
    setTimeout(() => {
        showAndCycleTooltip();
        setInterval(showAndCycleTooltip, 7000);
    }, 5000);

    // ─── Widget toggle ────────────────────────────────────────────────────────
    window.toggleDemo = function () {
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
            icon.innerHTML = '<span class="text-3xl">💬</span>';
        }
    };

    // ─── Invio messaggio ──────────────────────────────────────────────────────
    window.sendChatMessage = async function (text) {
        const container = document.getElementById('chat-messages');
        const quickReplies = document.getElementById('quick-replies-container');
        if (quickReplies) quickReplies.style.display = 'none';

        // Messaggio utente
        const userMsg = document.createElement('div');
        userMsg.className = 'bg-brand-orange/10 p-3 rounded-2xl rounded-tr-none shadow-sm ml-auto max-w-[85%] text-sm text-brand-blue border border-brand-orange/20';
        userMsg.innerText = text;
        container.appendChild(userMsg);
        container.scrollTop = container.scrollHeight;

        // Loading
        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[50%] text-sm border border-brand-sand/50 mt-4 italic text-slate-400';
        loadingMsg.innerText = 'Scrivendo...';
        container.appendChild(loadingMsg);
        container.scrollTop = container.scrollHeight;

        console.log(`[Zirèl Chat] Sending message for tenant: ${tenantId}`);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: text,
                    sessionId: sessionId,
                    metadata: { tenant_id: tenantId },
                }),
            });

            let responseData;
            const clonedResponse = response.clone();
            try {
                responseData = await response.json();
            } catch (_) {
                const textResponse = await clonedResponse.text();
                responseData = { output: textResponse };
            }

            loadingMsg.remove();

            let botText = 'Scusa, ho avuto un imprevisto con la connessione.';
            if (responseData && responseData.output) {
                botText = responseData.output;
            } else if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].output) {
                botText = responseData[0].output;
            } else if (typeof responseData === 'object' && Object.keys(responseData).length > 0) {
                botText = JSON.stringify(responseData);
            } else if (typeof responseData === 'string') {
                botText = responseData;
            }

            const botMsg = document.createElement('div');
            botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-brand-sand/50 mt-4 whitespace-pre-line';
            // Escape XSS prima di applicare il parser Markdown
            const safeText = escapeHTML(botText);
            botMsg.innerHTML = safeText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-brand-orange">$1</strong>');
            container.appendChild(botMsg);
            container.scrollTop = container.scrollHeight;

        } catch (e) {
            loadingMsg.remove();
            const botMsg = document.createElement('div');
            botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-red-200 mt-4 text-red-500';
            botMsg.innerText = 'Non sono riuscito a contattare il server. Riprova tra poco.';
            container.appendChild(botMsg);
            container.scrollTop = container.scrollHeight;
            console.error('Chat error:', e);
        }
    };

    // ─── Input da tastiera ────────────────────────────────────────────────────
    window.handleTextInput = function () {
        const input = document.getElementById('chat-input-field');
        const text = input.value.trim();
        if (text) {
            window.sendChatMessage(text);
            input.value = '';
        }
    };

}());
