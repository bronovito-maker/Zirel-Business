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

    // Nuova logica SaaS: Legge dal tag <script src=".../chat.js" data-tenant-id="...">
    const me = document.currentScript;
    const cfg = window.ZirelConfig || {};

    const tenantId = me?.getAttribute('data-tenant-id') || cfg.tenantId || 'zirel_official';
    const webhookUrl = me?.getAttribute('data-webhook-url') || cfg.webhookUrl || 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';

    // Sessione runtime: resta stabile finche la pagina e aperta, ma si resetta al reload.
    // In questo modo un refresh forza una nuova conversazione e non riprende
    // automaticamente la memoria precedente sul backend.
    const runtimeSessions = window.__zirelRuntimeSessions || (window.__zirelRuntimeSessions = {});
    if (!runtimeSessions[tenantId]) {
        runtimeSessions[tenantId] =
            tenantId + '__' + Math.random().toString(36).substring(2, 10);
    }
    const sessionId = runtimeSessions[tenantId];

    // Messaggi tooltip (sovrascrivibili dalla pagina ospite)
    const tooltipMessages = window.zirelTooltipMessages || [
        'Serve aiuto? Ci pensa Zirèl! 💬',
        'Fissa una Demo Gratuita! 🚀',
        "Scopri come funziona l'AI 🤖",
        'Aumenta le tue prenotazioni! 📈',
    ];
    let tooltipIndex = 0;

    // ─── Fetch Widget Configuration ───────────────────────────────────────────
    async function applyWidgetCustomization() {
        if (!tenantId) return;

        try {
            // Fetch configuration from Supabase at runtime for real-time sync
            const supabaseUrl = 'https://ighmsttwjfoywhklgluf.supabase.co';
            const anonKey = 'sb_publishable_757hQTSKPmrOs9iVEGRb4A_21Ccx-AT';

            const response = await fetch(`${supabaseUrl}/rest/v1/tenants?tenant_id=eq.${tenantId}&select=widget_title,widget_subtitle,widget_color,widget_icon`, {
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                }
            });

            if (!response.ok) throw new Error('Supabase fetch failed');

            const data = await response.json();
            const config = data?.[0] || window.ZirelWidgetConfig || {};

            const { widget_title, widget_subtitle, widget_color, widget_icon } = config;

            if (widget_title) {
                const titleEl = document.querySelector('#n8n-widget-mock h6');
                if (titleEl) titleEl.innerText = widget_title;
            }
            if (widget_subtitle) {
                const subtitleEl = document.querySelector('#n8n-widget-mock p');
                if (subtitleEl) subtitleEl.innerText = widget_subtitle;
            }
            if (widget_icon) {
                const iconContainer = document.querySelector('#n8n-widget-mock .flex-shrink-0.text-2xl') ||
                    document.querySelector('#n8n-widget-mock .bg-white\\/20.rounded-full.text-2xl');
                if (iconContainer) iconContainer.innerText = widget_icon;

                const toggleIconHtml = `<span class="text-white drop-shadow-md flex items-center justify-center text-3xl">${widget_icon}</span>`;
                const toggleIcon = document.getElementById('toggle-icon-open');
                const widget = document.getElementById('n8n-widget-mock');

                if (toggleIcon && (!widget || widget.classList.contains('scale-0'))) {
                    toggleIcon.innerHTML = toggleIconHtml;
                }
            }
            if (widget_color) {
                // Apply theme color to header
                const header = document.querySelector('#n8n-widget-mock .brand-gradient') ||
                    document.querySelector('#n8n-widget-mock .demo-gradient');
                if (header) {
                    header.style.background = `linear-gradient(135deg, ${widget_color} 0%, ${widget_color}CC 100%)`;
                }

                // Apply theme color to toggle button
                const toggleBtn = document.getElementById('chat-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.background = widget_color;
                    toggleBtn.style.boxShadow = `0 10px 25px -5px ${widget_color}66`;
                }

                // Apply theme color to user messages (optional enhancement)
                // We'll skip for now to maintain consistency with the CSS variables approach if possible
            }
        } catch (err) {
            console.warn('[Zirèl] Error applying dynamic customization, using defaults:', err);
            // Fallback to static window config if available
            const { widget_title, widget_subtitle, widget_color, widget_icon } = window.ZirelWidgetConfig || {};
            // ... rest of logic if needed, but the catch already logs it.
        }
    }

    // Initialize customization
    document.addEventListener('DOMContentLoaded', applyWidgetCustomization);
    // Also run immediately in case DOM is already ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        applyWidgetCustomization();
    }

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

    function elevateWidgetLayer(isMobile, isOpen) {
        const widget = document.getElementById('n8n-widget-mock');
        const toggleBtn = document.getElementById('chat-toggle-btn');

        if (!widget) return;

        widget.style.zIndex = '2147483646';
        if (toggleBtn) toggleBtn.style.zIndex = '2147483647';

        if (isMobile && isOpen) {
            widget.style.top = '0';
            widget.style.left = '0';
            widget.style.right = '0';
            widget.style.bottom = '0';
            widget.style.width = '100vw';
            widget.style.height = '100dvh';
            widget.style.maxWidth = '100vw';
            widget.style.maxHeight = '100dvh';
        } else if (isMobile) {
            widget.style.top = '0';
            widget.style.left = '0';
            widget.style.right = '0';
            widget.style.bottom = '0';
            widget.style.width = '';
            widget.style.height = '';
            widget.style.maxWidth = '';
            widget.style.maxHeight = '';
        } else {
            widget.style.top = '';
            widget.style.left = '';
            widget.style.right = '';
            widget.style.bottom = '';
            widget.style.width = '';
            widget.style.height = '';
            widget.style.maxWidth = '';
            widget.style.maxHeight = '';
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
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const isMobile = window.innerWidth < 640; // sm breakpoint in Tailwind

        hideTooltip();

        if (widget.classList.contains('scale-0')) {
            elevateWidgetLayer(isMobile, true);
            widget.classList.remove('scale-0');
            widget.classList.add('scale-100');
            icon.innerHTML = '<span class="text-2xl font-bold">✕</span>';

            if (isMobile) {
                if (toggleBtn) toggleBtn.style.display = 'none';
                document.body.style.overflow = 'hidden'; // Lock scroll
            }
        } else {
            widget.classList.remove('scale-100');
            widget.classList.add('scale-0');
            icon.innerHTML = '<span class="text-3xl">💬</span>';
            elevateWidgetLayer(isMobile, false);

            if (isMobile) {
                if (toggleBtn) toggleBtn.style.display = 'flex';
                document.body.style.overflow = ''; // Restore scroll
            }
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
            const traceId = crypto.randomUUID();
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zirel-Source': 'widget-public',
                    'X-Zirel-Timestamp': new Date().toISOString(),
                    'X-Zirel-Trace-Id': traceId,
                },
                body: JSON.stringify({
                    chatInput: text,
                    sessionId: sessionId,
                    metadata: {
                        tenant_id: tenantId,
                        client: 'widget-public',
                        protocol_version: '1.1',
                        trace_id: traceId,
                    },
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
