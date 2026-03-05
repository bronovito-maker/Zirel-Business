/**
 * widget.js — Zirèl Embed Loader (single-script install)
 *
 * Usage:
 * <script src="https://www.zirel.org/widget.js" data-tenant-id="your_tenant" async></script>
 */
(function () {
    'use strict';

    function sanitizeTenantId(value) {
        const raw = String(value == null ? '' : value).trim();
        return /^[a-z0-9_:-]{3,80}$/i.test(raw) ? raw : 'zirel_official';
    }

    function getCurrentScript() {
        if (document.currentScript) return document.currentScript;
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const matches = scripts.filter((s) => /(^|\/)widget\.js(\?|$)/.test(s.getAttribute('src') || ''));
        return matches.length ? matches[matches.length - 1] : null;
    }

    const me = getCurrentScript();
    const tenantId = sanitizeTenantId(me?.getAttribute('data-tenant-id') || 'zirel_official');
    const webhookUrl = me?.getAttribute('data-webhook-url') ||
        'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';

    // Keep page-defined config, but enforce embed tenant and webhook from snippet.
    window.ZirelConfig = {
        ...(window.ZirelConfig || {}),
        tenantId,
        webhookUrl
    };

    if (!Array.isArray(window.zirelTooltipMessages)) {
        window.zirelTooltipMessages = [
            'Hai una domanda? Ti aiuto subito. 💬',
            'Risposte chiare in tempo reale.',
            'Parla con Zirèl in un tap.',
        ];
    }

    if (!document.getElementById('zirel-widget-style')) {
        const style = document.createElement('style');
        style.id = 'zirel-widget-style';
        style.textContent = `
            #chat-tooltip {
                position: fixed;
                right: 24px;
                bottom: 88px;
                max-width: 280px;
                padding: 10px 14px;
                border-radius: 14px;
                background: #003049;
                color: #fff;
                font: 600 14px/1.35 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
                opacity: 0;
                transform: translateY(8px);
                pointer-events: none;
                transition: opacity .25s ease, transform .25s ease;
                z-index: 2147483645;
            }
            #chat-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }
            #n8n-widget-mock {
                position: fixed;
                right: 24px;
                bottom: 96px;
                width: 350px;
                height: 500px;
                background: #fff;
                border: 1px solid #FDF0D5;
                border-radius: 24px;
                box-shadow: 0 24px 64px rgba(0, 0, 0, 0.22);
                transform-origin: bottom right;
                transition: transform .35s ease, opacity .35s ease;
                overflow: hidden;
                z-index: 2147483646;
            }
            #n8n-widget-mock.scale-0 {
                transform: scale(0);
                opacity: 0;
                pointer-events: none;
            }
            #n8n-widget-mock.scale-100 {
                transform: scale(1);
                opacity: 1;
            }
            #n8n-widget-mock .brand-gradient {
                background: linear-gradient(135deg, #FF8C42 0%, #F59D61 100%);
                color: #fff;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
            }
            #n8n-widget-mock .chat-icon {
                width: 44px;
                height: 44px;
                border-radius: 9999px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,.2);
                font-size: 24px;
            }
            #n8n-widget-mock .chat-header-main h6 {
                margin: 0;
                font: 700 16px/1.2 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            }
            #n8n-widget-mock .chat-header-main p {
                margin: 4px 0 0;
                font: 400 12px/1.2 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                opacity: .9;
            }
            #n8n-widget-mock .chat-close {
                margin-left: auto;
                border: 0;
                background: transparent;
                color: rgba(255,255,255,.92);
                font: italic 500 14px/1 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                cursor: pointer;
            }
            #chat-messages {
                height: calc(100% - 148px);
                overflow: auto;
                background: #FFFAF1;
                padding: 16px;
                font-family: Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            }
            #chat-messages > div {
                margin-bottom: 12px;
                background: #fff;
                border: 1px solid #F2E5C8;
                border-radius: 16px;
                padding: 12px;
                color: #003049;
                font-size: 14px;
                line-height: 1.4;
            }
            #chat-messages > div:last-child {
                margin-bottom: 0;
            }
            #quick-replies-container {
                display: grid;
                gap: 10px;
                margin-top: 4px;
            }
            .quick-reply-btn {
                width: 100%;
                min-height: 44px;
                border: 1px solid #BDE6FF;
                border-radius: 9999px;
                background: #fff;
                color: #003049;
                font: 600 14px/1.2 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                text-align: left;
                padding: 10px 14px;
                cursor: pointer;
            }
            .quick-reply-btn:hover { border-color: #8DD4FF; }
            #zirel-chat-input-wrap {
                height: 64px;
                border-top: 1px solid #F2E5C8;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: #fff;
            }
            #chat-input-field {
                flex: 1;
                height: 42px;
                border-radius: 9999px;
                border: 1px solid #d7dde7;
                background: #f5f7fb;
                color: #003049;
                font: 500 15px/1 Outfit, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
                padding: 0 14px;
                outline: none;
            }
            #zirel-send-btn {
                width: 42px;
                height: 42px;
                border: 0;
                border-radius: 9999px;
                background: #FF8C42;
                color: #fff;
                cursor: pointer;
                font-size: 18px;
            }
            #chat-toggle-btn {
                position: fixed;
                right: 24px;
                bottom: 24px;
                width: 56px;
                height: 56px;
                border-radius: 9999px;
                border: 2px solid #fff;
                background: #FF8C42;
                color: #fff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 14px 30px rgba(0,0,0,.22);
                z-index: 2147483647;
            }
            #toggle-icon-open { font-size: 26px; line-height: 1; }
            @media (max-width: 639px) {
                #chat-tooltip { right: 14px; bottom: 74px; max-width: 240px; font-size: 13px; }
                #chat-toggle-btn { right: 14px; bottom: 14px; }
                #n8n-widget-mock {
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100vw;
                    height: 100dvh;
                    border-radius: 0;
                    border: 0;
                }
                #chat-messages { height: calc(100dvh - 148px); }
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('n8n-widget-mock')) {
        const tooltip = document.createElement('div');
        tooltip.id = 'chat-tooltip';
        tooltip.className = 'chat-tooltip';
        tooltip.textContent = 'Hai una domanda? Ti aiuto subito. 💬';
        document.body.appendChild(tooltip);

        const widget = document.createElement('div');
        widget.id = 'n8n-widget-mock';
        widget.className = 'scale-0';
        widget.innerHTML = `
            <div class="brand-gradient">
                <div class="chat-icon flex-shrink-0 text-2xl bg-white/20 rounded-full">💬</div>
                <div class="chat-header-main">
                    <h6>Zirèl Assistant</h6>
                    <p>Concierge AI h24</p>
                </div>
                <button class="chat-close" onclick="toggleDemo()">Chiudi</button>
            </div>
            <div id="chat-messages">
                <div>
                    <p><strong style="color:#FF8C42">Ciao!</strong> Sono Zirèl.</p>
                    <p>Ti aiuto a rispondere subito ai tuoi clienti.</p>
                </div>
                <div id="quick-replies-container">
                    <button class="quick-reply-btn" onclick="sendChatMessage('📞 Vorrei un contatto rapido')">📞 Contatto rapido</button>
                    <button class="quick-reply-btn" onclick="sendChatMessage('💶 Ho un dubbio sui prezzi')">💶 Dubbi pricing</button>
                    <button class="quick-reply-btn" onclick="sendChatMessage('🚀 Voglio una demo guidata')">🚀 Prenota demo</button>
                </div>
            </div>
            <div id="zirel-chat-input-wrap">
                <input id="chat-input-field" type="text" placeholder="Scrivi un messaggio..." onkeypress="if(event.key === 'Enter') handleTextInput()">
                <button id="zirel-send-btn" onclick="handleTextInput()">➤</button>
            </div>
        `;
        document.body.appendChild(widget);

        const toggle = document.createElement('button');
        toggle.id = 'chat-toggle-btn';
        toggle.setAttribute('onclick', 'toggleDemo()');
        toggle.innerHTML = '<span id="toggle-icon-open">💬</span>';
        document.body.appendChild(toggle);
    }

    const scriptUrl = me?.src ? new URL(me.src, window.location.href) : new URL('/widget.js', window.location.origin);
    const chatSrc = new URL('/chat.js', scriptUrl.origin).toString();
    const chatScript = document.createElement('script');
    chatScript.type = 'module';
    chatScript.src = chatSrc;
    chatScript.setAttribute('data-tenant-id', tenantId);
    chatScript.setAttribute('data-webhook-url', webhookUrl);
    document.body.appendChild(chatScript);
}());
