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
    function resolveChatScriptTag() {
        // In script type="module", document.currentScript può essere null.
        if (document.currentScript) return document.currentScript;

        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const chatCandidates = scripts.filter((s) => {
            const src = s.getAttribute('src') || '';
            return /(^|\/)chat\.js(\?|$)/.test(src);
        });

        // Preferisci quello con data-tenant-id esplicito.
        const withTenant = chatCandidates.filter((s) => s.hasAttribute('data-tenant-id'));
        if (withTenant.length > 0) return withTenant[withTenant.length - 1];
        if (chatCandidates.length > 0) return chatCandidates[chatCandidates.length - 1];
        return null;
    }

    const me = resolveChatScriptTag();
    const cfg = window.ZirelConfig || {};

    function sanitizeTenantId(value) {
        const raw = String(value == null ? '' : value).trim();
        return /^[a-z0-9_:-]{3,80}$/i.test(raw) ? raw : 'zirel_official';
    }

    function sanitizeHexColor(value) {
        const raw = String(value == null ? '' : value).trim();
        return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : '#FF8C42';
    }

    function sanitizeWidgetIcon(value) {
        const raw = String(value == null ? '' : value).trim();
        return /^[\p{L}\p{N}\p{Emoji_Presentation}\p{Extended_Pictographic}\s._-]{1,4}$/u.test(raw) ? raw : '💬';
    }

    function sanitizeTimeout(value, fallback = 30000) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.min(Math.max(parsed, 5000), 120000);
    }

    const tenantId = sanitizeTenantId(me?.getAttribute('data-tenant-id') || cfg.tenantId || 'zirel_official');
    const webhookUrl = me?.getAttribute('data-webhook-url') || cfg.webhookUrl || 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';
    const chatTimeoutMs = sanitizeTimeout(me?.getAttribute('data-timeout-ms') || cfg.chatTimeoutMs || 30000);
    let tenantServiceDisabled = false;
    let tenantServicePublicMessage = 'Il servizio chat di questa struttura è temporaneamente non disponibile. Per assistenza contatta direttamente la struttura.';

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
    const defaultTooltipMessages = [
        'Serve aiuto? Ci pensa Zirèl! 💬',
        'Fissa una Demo Gratuita! 🚀',
        "Scopri come funziona l'AI 🤖",
        'Aumenta le tue prenotazioni! 📈',
    ];
    if (!Array.isArray(window.zirelTooltipMessages) || !window.zirelTooltipMessages.length) {
        window.zirelTooltipMessages = defaultTooltipMessages;
    }
    let tooltipIndex = 0;

    // ─── Fetch Widget Configuration ───────────────────────────────────────────
    const widgetConfigUrl = `${'https://dashboard.zirel.org'}/api/public/widget-config`;

    function renderWelcomeMessage(message) {
        const safeText = escapeHTML(String(message || '').trim() || 'Ciao! Sono Zirèl.\nTi aiuto a rispondere subito ai tuoi clienti.');
        return safeText
            .split(/\n{2,}/)
            .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    function renderQuickReplies(items) {
        const quickReplies = document.getElementById('quick-replies-container');
        if (!quickReplies) return;

        const normalized = Array.isArray(items)
            ? items
                .map((item) => {
                    if (typeof item === 'string') {
                        const value = String(item || '').trim();
                        return value ? { label: value, prompt: value } : null;
                    }

                    if (!item || typeof item !== 'object') return null;

                    const label = String(item.label || '').trim();
                    const prompt = String(item.prompt || item.message || label).trim();
                    return label && prompt ? { label, prompt } : null;
                })
                .filter(Boolean)
                .slice(0, 4)
            : [];

        quickReplies.innerHTML = '';
        quickReplies.style.display = normalized.length ? 'grid' : 'none';
        quickReplies.style.flexWrap = '';
        quickReplies.style.overflowX = '';
        quickReplies.style.overflowY = '';

        normalized.forEach((item) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'quick-reply-btn';
            button.textContent = item.label;
            button.style.whiteSpace = '';
            button.style.flex = '';
            button.style.minWidth = '';
            button.addEventListener('click', () => window.sendChatMessage(item.prompt));
            quickReplies.appendChild(button);
        });
    }

    async function applyWidgetCustomization() {
        if (!tenantId) return;

        try {
            const response = await fetch(`${widgetConfigUrl}?tenant_id=${encodeURIComponent(tenantId)}`);

            if (!response.ok) throw new Error('Supabase fetch failed');

            const data = await response.json();
            const config = data?.config || window.ZirelWidgetConfig || {};
            tenantServiceDisabled = Boolean(data?.disabled || config?.disabled);
            tenantServicePublicMessage = String(data?.service_public_message || config?.service_public_message || tenantServicePublicMessage).trim() || tenantServicePublicMessage;
            applyServiceVisibility(tenantServiceDisabled);

            const {
                widget_title,
                widget_subtitle,
                widget_color,
                widget_icon,
                welcome_message,
                quick_replies,
                teaser_messages,
            } = config;

            if (widget_title) {
                const titleEl = document.getElementById('zirel-widget-title');
                if (titleEl) titleEl.innerText = widget_title;
            }
            if (widget_subtitle) {
                const subtitleEl = document.getElementById('zirel-widget-subtitle');
                if (subtitleEl) subtitleEl.innerText = widget_subtitle;
            }
            if (widget_icon) {
                const safeIcon = sanitizeWidgetIcon(widget_icon);
                const iconContainer = document.getElementById('zirel-widget-icon');
                if (iconContainer) iconContainer.innerText = safeIcon;
                const toggleIcon = document.getElementById('toggle-icon-open');
                const widget = document.getElementById('n8n-widget-mock');

                if (toggleIcon && (!widget || widget.classList.contains('scale-0'))) {
                    toggleIcon.textContent = safeIcon;
                }
            }
            if (widget_color) {
                const safeColor = sanitizeHexColor(widget_color);
                // Apply theme color to header
                const header = document.querySelector('#n8n-widget-mock .brand-gradient') ||
                    document.querySelector('#n8n-widget-mock .demo-gradient');
                if (header) {
                    header.style.background = `linear-gradient(135deg, ${safeColor} 0%, ${safeColor}CC 100%)`;
                }

                // Apply theme color to toggle button
                const toggleBtn = document.getElementById('chat-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.background = safeColor;
                    toggleBtn.style.boxShadow = `0 10px 25px -5px ${safeColor}66`;
                }

                // Apply theme color to user messages (optional enhancement)
                // We'll skip for now to maintain consistency with the CSS variables approach if possible
            }
            if (welcome_message) {
                const welcomeEl = document.getElementById('zirel-welcome-message');
                if (welcomeEl) welcomeEl.innerHTML = renderWelcomeMessage(tenantServiceDisabled ? tenantServicePublicMessage : welcome_message);
            }
            if (quick_replies) {
                renderQuickReplies(tenantServiceDisabled ? [] : quick_replies);
            }
            if (Array.isArray(teaser_messages) && teaser_messages.length) {
                window.zirelTooltipMessages = teaser_messages
                    .map((item) => String(item || '').trim())
                    .filter(Boolean)
                    .slice(0, 4);
            }
        } catch (err) {
            console.warn('[Zirèl] Error applying dynamic customization, using defaults:', err);
            tenantServiceDisabled = false;
            applyServiceVisibility(false);
            // Fallback to static window config if available
            const {
                widget_title,
                widget_subtitle,
                widget_color,
                widget_icon,
                welcome_message,
                quick_replies,
                teaser_messages,
            } = window.ZirelWidgetConfig || {};
            if (widget_title) {
                const titleEl = document.getElementById('zirel-widget-title');
                if (titleEl) titleEl.innerText = widget_title;
            }
            if (widget_subtitle) {
                const subtitleEl = document.getElementById('zirel-widget-subtitle');
                if (subtitleEl) subtitleEl.innerText = widget_subtitle;
            }
            if (widget_icon) {
                const iconEl = document.getElementById('zirel-widget-icon');
                if (iconEl) iconEl.innerText = sanitizeWidgetIcon(widget_icon);
            }
            if (widget_color) {
                const safeColor = sanitizeHexColor(widget_color);
                const header = document.querySelector('#n8n-widget-mock .brand-gradient') ||
                    document.querySelector('#n8n-widget-mock .demo-gradient');
                if (header) {
                    header.style.background = `linear-gradient(135deg, ${safeColor} 0%, ${safeColor}CC 100%)`;
                }
                const toggleBtn = document.getElementById('chat-toggle-btn');
                if (toggleBtn) {
                    toggleBtn.style.background = safeColor;
                    toggleBtn.style.boxShadow = `0 10px 25px -5px ${safeColor}66`;
                }
            }
            if (welcome_message) {
                const welcomeEl = document.getElementById('zirel-welcome-message');
                if (welcomeEl) welcomeEl.innerHTML = renderWelcomeMessage(welcome_message);
            }
            if (quick_replies) {
                renderQuickReplies(quick_replies);
            }
            if (Array.isArray(teaser_messages) && teaser_messages.length) {
                window.zirelTooltipMessages = teaser_messages
                    .map((item) => String(item || '').trim())
                    .filter(Boolean)
                    .slice(0, 4);
            }
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

    function renderRichBotText(text) {
        const safeText = escapeHTML(String(text == null ? '' : text));
        const withLinks = safeText.replace(/((https?:\/\/|www\.)[^\s<]+)/gi, (match) => {
            const href = match.startsWith('www.') ? `https://${match}` : match;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-brand-orange underline break-all">${match}</a>`;
        });

        return withLinks
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-brand-orange">$1</strong>')
            .replace(/\n/g, '<br>');
    }

    // ─── Tooltip ──────────────────────────────────────────────────────────────
    function hideTooltip() {
        const tooltip = document.getElementById('chat-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
        if (window.tooltipTimer) clearTimeout(window.tooltipTimer);
    }

    function applyServiceVisibility(disabled) {
        const widget = document.getElementById('n8n-widget-mock');
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const tooltip = document.getElementById('chat-tooltip');

        hideTooltip();

        if (disabled) {
            if (widget) {
                widget.classList.remove('scale-100');
                widget.classList.add('scale-0');
                widget.style.display = 'none';
            }
            if (toggleBtn) toggleBtn.style.display = 'none';
            if (tooltip) tooltip.style.display = 'none';
            return;
        }

        if (widget) widget.style.display = '';
        if (toggleBtn) toggleBtn.style.display = '';
        if (tooltip) tooltip.style.display = '';
    }

    function showAndCycleTooltip() {
        if (tenantServiceDisabled) return;
        const tooltip = document.getElementById('chat-tooltip');
        const widget = document.getElementById('n8n-widget-mock');
        const tooltipMessages = Array.isArray(window.zirelTooltipMessages) && window.zirelTooltipMessages.length
            ? window.zirelTooltipMessages
            : defaultTooltipMessages;
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
    let lockedScrollY = 0;
    function lockBodyScrollForMobile() {
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${lockedScrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    }

    function unlockBodyScrollForMobile() {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, lockedScrollY);
    }

    window.openDemoChat = function (event) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (tenantServiceDisabled) return false;

        const widget = document.getElementById('n8n-widget-mock');
        const icon = document.getElementById('toggle-icon-open');
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const isMobile = window.innerWidth < 640; // sm breakpoint in Tailwind
        if (!widget) return false;

        hideTooltip();

        elevateWidgetLayer(isMobile, true);
        widget.classList.remove('scale-0');
        widget.classList.add('scale-100');
        if (icon) icon.innerHTML = '<span class="text-2xl font-bold">✕</span>';

        if (isMobile) {
            if (toggleBtn) toggleBtn.style.display = 'none';
            lockBodyScrollForMobile();
        }

        return false;
    };

    window.toggleDemo = function () {
        if (tenantServiceDisabled) return false;
        const widget = document.getElementById('n8n-widget-mock');
        const icon = document.getElementById('toggle-icon-open');
        const toggleBtn = document.getElementById('chat-toggle-btn');
        const isMobile = window.innerWidth < 640; // sm breakpoint in Tailwind

        hideTooltip();

        if (widget.classList.contains('scale-0')) {
            window.openDemoChat();
        } else {
            widget.classList.remove('scale-100');
            widget.classList.add('scale-0');
            icon.innerHTML = '<span class="text-3xl">💬</span>';
            elevateWidgetLayer(isMobile, false);

            if (isMobile) {
                if (toggleBtn) toggleBtn.style.display = 'flex';
                unlockBodyScrollForMobile();
            }
        }
    };

    // ─── Invio messaggio ──────────────────────────────────────────────────────
    async function fetchWithTimeout(url, options, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }

    window.sendChatMessage = async function (text) {
        const container = document.getElementById('chat-messages');
        if (!container) {
            console.warn('[Zirèl] Chat container non trovato.');
            return;
        }
        if (tenantServiceDisabled) {
            const botMsg = document.createElement('div');
            botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-red-200 mt-4 text-red-500';
            botMsg.innerText = tenantServicePublicMessage;
            container.appendChild(botMsg);
            container.scrollTop = container.scrollHeight;
            return;
        }
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

        const slowResponseTimer = setTimeout(() => {
            loadingMsg.innerText = 'Sto ancora recuperando la risposta...';
        }, 8000);

        console.log(`[Zirèl Chat] Sending message for tenant: ${tenantId}`);

        try {
            const traceId = crypto.randomUUID();
            const response = await fetchWithTimeout(webhookUrl, {
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
            }, chatTimeoutMs);

            if (!response.ok) {
                throw new Error(`CHAT_HTTP_${response.status}`);
            }

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
            botMsg.innerHTML = renderRichBotText(botText);
            container.appendChild(botMsg);
            container.scrollTop = container.scrollHeight;

        } catch (e) {
            loadingMsg.remove();
            const botMsg = document.createElement('div');
            botMsg.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[90%] text-sm border border-red-200 mt-4 text-red-500';
            botMsg.innerText = e?.name === 'AbortError'
                ? 'La risposta sta impiegando troppo tempo. Riprova tra poco.'
                : 'Non sono riuscito a contattare il server. Riprova tra poco.';
            container.appendChild(botMsg);
            container.scrollTop = container.scrollHeight;
            console.error('Chat error:', e);
        } finally {
            clearTimeout(slowResponseTimer);
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
