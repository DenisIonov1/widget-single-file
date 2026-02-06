(function () {
    if (window.N7_WIDGET_LOADED) return;
    window.N7_WIDGET_LOADED = true;

    if (!window.N7_WIDGET_CONFIG) {
        console.error("N7 Widget: Конфигурация не добавлена");
        return;
    }
    const CONFIG = window.N7_WIDGET_CONFIG;

    const BACKEND_PORT = CONFIG.backendPort;
    const PROJECTS = CONFIG.project;
    const LOGO_URL = CONFIG.logoUrl;
    const API_URL = 'https://sr.neuro7.pro:5009/webhook/widget';

    if (BACKEND_PORT == null || !PROJECTS || !LOGO_URL) {
        console.error("N7 Widget: в конфигурации есть незаполненные поля");
        return;
    }

    const LOGO_ALT = 'Ассистент';
    const CHAT_ID_KEY = 'chat_user_id';
    const CHAT_HISTORY_KEY = 'chat_history_v1';
    const MAX_MESSAGES = 30;

    let activeRequestId = 0;
    let safetyTimeout = null;
    let thinkingTimer = null;
    let typingStartedAt = null;
    let isBotThinking = false;
    let isFirstUserMessage = true;

    const style = document.createElement("style");
    style.textContent = `
        .n7-widget {
            font-family: "Arial", sans-serif;
            position: fixed;
            bottom: 0px;
            left: 50%;
            transform: translate(-50%);
            max-width: 420px;
            width: min(100vw, 420px);
            height: min(85dvh, 450px);
            display: flex;
            flex-direction: column;
            background-color: transparent;
            border-radius: 16px;
            z-index: 222229998;
        }

        .n7-widget__body {
            flex: 1;
            min-height: 200px;
            overflow-y: auto;
            font-size: 15px;
            display: flex;
            flex-direction: column;
            row-gap: 10px;
            padding: 15px;
            justify-content: flex-start;
            scrollbar-width: none;
        }

        .n7-message {
            display: flex;
        }

        .n7-message__logo {
            width: 37px;
            height: 37px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .n7-message__text {
            white-space: pre-wrap;
            padding: 6px 10px;
            width: fit-content;
            max-width: min(80%, 600px);
            background-color: #F2F2F2;
            border-radius: 11px 11px 11px 3px;
            overflow-wrap: break-word;
            word-break: break-word;
            line-height: 1.3;
        }

        .n7-message__text--first {
            white-space: normal;

        }

        .n7-message--bot {
            gap: 10px;
            justify-content: flex-start;
            align-items: end;
            animation: typingFadeIn 0.3s ease-out;
        }

        .n7-message--user {
            justify-content: flex-end;
            animation: typingFadeIn 0.2s ease-out;
        }

        .n7-message--bot .n7-message__text {
            border-radius: 11px 11px 11px 3px;
            color: #222d38;
            word-wrap: break-word;
        }

        .n7-message--user .n7-message__text {
            border-radius: 11px 11px 3px 11px;
            background-color: #3A3A3A;
            color: #fff;
            word-wrap: break-word;
        }

        .n7-message__text--system {
            border-radius: 11px;
            margin-left: 47px;
        }

        .n7-suggestions-list {
            display: flex;
            gap: 10px;
            flex-direction: column;
            align-items: flex-end;
        }

        .n7-suggestions-list__item {
            position: relative;
            overflow: hidden;
            font-size: 15px;
            font-family: "Arial", sans-serif;
            color: #222d38;
            background-color: #ffffff;
            padding: 6px 10px;
            border-radius: 11px;
            border: 1px solid #222d38;
            transition: all 0.2s;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
            box-shadow: 1px 1px 5px 1px rgba(173, 170, 170, 0.619)
        }

        .n7-suggestions-list__item::after {
            content: "";
            position: absolute;
            top: 0;
            left: -120%;
            width: 40%;
            height: 100%;
            background: linear-gradient(120deg,
                    transparent,
                    rgba(223, 214, 214, 0.878),
                    transparent);
            animation: shine 3.5s infinite;
        }

        .n7-suggestions-list__item:hover {
            background-color: #e7e6e6;
        }

        .n7-suggestions-list__item:active {
            background-color: #ffffff;
            transform: scale(1.02);
        }

        .n7-widget__description {
            font-size: 12px;
            text-decoration: underline;
            margin: 0;
            padding: 4px;
            background-color: #F2F2F2;
            border-radius: 11px;
            text-align: center;
        }

        .n7-bot-thinking {
            display: flex;
            gap: 10px;
            align-items: end;
            color: #666;
            animation: typingFadeIn 0.5s ease-out;
        }

        .n7-message-loading {
            display: flex;
            gap: 4px;
            padding: 6px 10px;
            max-width: 320px;
            background-color: #F2F2F2;
            border-radius: 11px 11px 11px 11px;
            align-items: center;
        }

        .n7-message-loading__dot {
            height: 6px;
            width: 6px;
            border-radius: 50%;
            opacity: 0.7;
            background: #a9a9aa;
            animation: dotPulse 1.8s ease-in-out infinite;
        }

        .n7-message-loading__dot:nth-child(1) {
            animation-delay: 0.2s;
        }

        .n7-message-loading__dot:nth-child(2) {
            animation-delay: 0.3s;
        }

        .n7-message-loading__dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        .n7-form {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
        }

        .n7-footer {
            flex-shrink: 0;
            padding: 10px 15px;
        }

        .n7-input {
            font-family: "Arial", sans-serif;
            font-size: 15px;
            flex: 1;
            min-width: 0;
            height: 38px;
            border-radius: 18px;
            border: 1px solid #ddd;
            background-color: #fff;
            padding: 10px;
            resize: none;
            outline: none;
            box-sizing: border-box;
            scrollbar-width: none;
        }

        .n7-input:focus {
            border-color: #3A3A3A;
        }

        .n7-submit {
            width: 38px;
            height: 38px;
            background-color: transparent;
            border: none;
            padding: 0;
            cursor: pointer;
            border-radius: 50%;
            transform: 0.1s;
            flex-shrink: 0;
        }

        .n7-submit__bg {
            fill: #3A3A3A;
            transition: fill 0.2s;
        }

        .n7-submit__icon {
            fill: white;
            transition: fill 0.2s;
        }

        .n7-submit:hover .n7-submit__bg {
            fill: #555;
        }

        .n7-submit:hover {
            transform: scale(1.05);
        }

        .n7-submit:active {
            transform: scale(0.95);
        }

        .n7-submit:active .n7-submit__bg {
            fill: #222;
        }

        @media (max-width: 780px) {
            .n7-input {
                font-size: 16px;
            }

            .n7-widget {
                margin: 0;
            }

            .n7-widget__body {
                flex: 1;
                min-height: 0;
                padding: 15px;
            }

            .n7-footer {
                padding: 10px 15px;
            }

            .n7-input {
                line-height: 1;
            }
        }

        .n7-typing {
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .n7-pencil {
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            animation: write 1.5s infinite ease-in-out;
            transform-origin: bottom left;
        }

        @keyframes shine {
            0% {
                left: -120%;
            }

            60% {
                left: 120%;
            }

            100% {
                left: 120%;
            }
        }

        @keyframes write {
            0% {
                transform: translateX(0) rotate(0deg);
            }

            25% {
                transform: translateX(4px) rotate(-10deg);
            }

            50% {
                transform: translateX(8px) rotate(5deg);
            }

            75% {
                transform: translateX(4px) rotate(-10deg);
            }

            100% {
                transform: translateX(0) rotate(0deg);
            }
        }

        @keyframes typingFadeIn {
            from {
                opacity: 0;
                transform: translateY(6px) scale(0.98);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes dotPulse {

            0%,
            44% {
                transform: translateY(0);
            }

            28% {
                opacity: 0.4;
                transform: translateY(-4px);
            }

            44% {
                opacity: 0.2;
            }
        }

        @media (max-width: 480px) {
            .n7-widget {
                height: 70dvh;
                border-radius: 0;
            }

            .n7-widget__body {
                padding: 12px 15px 20px;
            }
        }

        @media (max-width: 415px) {
            .n7-widget__description {
                width: fit-content;
                max-width: 290px;
                align-self: center;
            }
        }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.className = "n7-widget";

    wrapper.innerHTML = `
        <div class="n7-widget__body" role="log" aria-live="polite">
            <div class="n7-message n7-message--bot">

                <img class="n7-message__logo" data-logo>
                <div class="n7-message__text n7-message__text--first">Здравствуйте! Помогу Вам с выбором квартиры в нашем
                    жилом комплексе. Скажите пожалуйста, что Вас интересует?</div>
            </div>

            <div class="n7-suggestions-list">
                <button type="button" class="n7-suggestions-list__item"  data-message="Узнать больше о ЖК" aria-label="Узнать больше о ЖК">Узнать
                    больше о ЖК</button>
                <button type="button" class="n7-suggestions-list__item"
                    data-message="Узнать больше о квартирах в ЖК" aria-label="Узнать больше о квартирах в ЖК">Узнать
                    больше о квартирах в ЖК</button>
            </div>
            <div class="n7-widget__description">Менеджер подключится в течение 12 секунд после вашего&nbsp;вопроса</div>
    </div>

    <div class="n7-footer">
        <form class="n7-form">
            <textarea placeholder="Сообщение" class="n7-input" maxlength="600" aria-label="Введите сообщение" autocomplete="off"></textarea>
            <button type="submit" class="n7-submit" aria-label="Отправить сообщение">
                <svg aria-hidden="true" width="38" height="38" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14.5" cy="14.5" r="14.5" class="n7-submit__bg" />
                    <path class="n7-submit__icon" fill-rule="evenodd" clip-rule="evenodd"
                        d="M15 22C14.8011 22 14.6103 21.921 14.4697 21.7803C14.329 21.6397 14.25 21.4489 14.25 21.25V10.612L10.29 14.77C10.1506 14.9064 9.96351 14.9831 9.76847 14.9839C9.57343 14.9847 9.38576 14.9094 9.24527 14.7741C9.10478 14.6389 9.02252 14.4542 9.01593 14.2592C9.00934 14.0643 9.07895 13.8745 9.20999 13.73L14.46 8.23C14.53 8.15742 14.6138 8.09968 14.7066 8.06025C14.7994 8.02081 14.8992 8.00049 15 8.00049C15.1008 8.00049 15.2006 8.02081 15.2934 8.06025C15.3862 8.09968 15.47 8.15742 15.54 8.23L20.79 13.73C20.8617 13.8002 20.9187 13.8841 20.9574 13.9767C20.9961 14.0693 21.0159 14.1687 21.0155 14.2691C21.0151 14.3695 20.9946 14.4687 20.9551 14.561C20.9156 14.6533 20.858 14.7367 20.7857 14.8064C20.7134 14.876 20.6279 14.9304 20.5342 14.9663C20.4405 15.0023 20.3405 15.0191 20.2402 15.0157C20.1399 15.0123 20.0412 14.9888 19.9502 14.9466C19.8591 14.9044 19.7774 14.8444 19.71 14.77L15.75 10.612V21.25C15.75 21.4489 15.671 21.6397 15.5303 21.7803C15.3897 21.921 15.1989 22 15 22Z"
                        fill="white" />
                </svg>
            </button>
        </form>
    </div>
    `;

    function mountWidget() {
        document.body.appendChild(wrapper);
    }

    function escapeHtml(str) {
        const el = document.createElement('div');
        el.textContent = str;
        return el.innerHTML;
    }

    function applyLogo() {
        document.querySelectorAll('[data-logo]').forEach(img => {
            img.src = LOGO_URL;
            img.alt = LOGO_ALT;
        });
    }

    function getRandomDelay() {
        return Math.floor(Math.random() * 2001) + 5000;
    }

    function generateMessageId() {
        return crypto.randomUUID();
    }

    function getWidgetLocation() {
        return window.location.href;
    }

    function getChatId() {
        let chatId = localStorage.getItem(CHAT_ID_KEY);
        if (!chatId) {
            chatId = crypto.randomUUID();
            localStorage.setItem(CHAT_ID_KEY, chatId);
        }
        return chatId;
    }

    function getStoredMessages() {
        return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY)) || [];
    }

    function saveMessages(messages) {
        localStorage.setItem(
            CHAT_HISTORY_KEY,
            JSON.stringify(messages.slice(-MAX_MESSAGES))
        )
    }

    function saveUserMessage(text) {
        const messages = getStoredMessages();
        const msg = {
            id: crypto.randomUUID(),
            chatId: getChatId(),
            type: 'user',
            text,
            status: 'pending',
            timestamp: Date.now()
        };

        messages.push(msg);
        saveMessages(messages);

        return msg;
    }

    function saveBotMessage(text) {
        const messages = getStoredMessages();
        messages.push({
            id: crypto.randomUUID(),
            chatId: getChatId(),
            type: 'bot',
            text,
            status: 'answered',
            timestamp: Date.now()
        });

        saveMessages(messages);
    }

    function markMessageAnswered(messageId) {
        const messages = getStoredMessages();
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            msg.status = 'answered';
            saveMessages(messages);
        }
    }

    function addMessage(text, type) {
        if (!text?.trim()) return null;

        const widgetBody = document.querySelector('.n7-widget__body');
        if (!widgetBody) return null;

        const safeText = escapeHtml(text.trim());
        const messageEl = document.createElement('div');
        messageEl.className = `n7-message n7-message--${type}`;

        if (type === 'bot') {
            messageEl.innerHTML = `
                <img class="n7-message__logo" src="${LOGO_URL}" alt="${LOGO_ALT}">
                <div class="n7-message__text">${safeText}</div>
            `;
        } else if (type === 'system') {
            messageEl.innerHTML = `
                <div class="n7-message__text n7-message__text--system">${safeText}</div>
            `;
            messageEl.dataset.system = true;
        } else {
            messageEl.innerHTML = `
                <div class="n7-message__text">${safeText}</div>
            `;
        }

        widgetBody.appendChild(messageEl);
        scrollToBottom();

        return messageEl;
    }

    function scrollToBottom() {
        const body = document.querySelector('.n7-widget__body');
        if (!body) return;

        const doScroll = () => {
            body.scrollTop = body.scrollHeight;
        };

        requestAnimationFrame(doScroll);
        setTimeout(doScroll, 60);
    }

    function removeSystemMessages() {
        document.querySelectorAll('[data-system="true"]').forEach(el => el.remove());
    }

    function disableInput() {
        const textarea = document.querySelector('.n7-input');
        const submitBtn = document.querySelector('.n7-submit');
        const buttons = document.querySelectorAll('.n7-suggestions-list__item');

        if (textarea) textarea.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        buttons.forEach(btn => btn.disabled = true);
    }

    function enableInput() {
        const textarea = document.querySelector('.n7-input');
        const submitBtn = document.querySelector('.n7-submit');
        const buttons = document.querySelectorAll('.n7-suggestions-list__item');

        if (textarea) textarea.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        buttons.forEach(btn => btn.disabled = false);

        if (textarea) setTimeout(() => textarea.focus(), 50);
    }

    function showBotThinking(duration = 12) {
        const widgetBody = document.querySelector('.n7-widget__body');
        if (!widgetBody) return;

        isBotThinking = true;

        if (thinkingTimer) {
            thinkingTimer.element?.remove();
        }

        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'n7-bot-thinking';
        thinkingEl.innerHTML = `
            <img class="n7-message__logo" src="${LOGO_URL}" alt="${LOGO_ALT}">
            <div class="n7-message-loading">
                <div class="n7-message-loading__dot"></div>
                <div class="n7-message-loading__dot"></div>
                <div class="n7-message-loading__dot"></div>
                <span class="message-loading__text">Менеджер ответит вам через <span class="message-loading__counter">${duration}</span> сек</span>
            </div>
        `;
        widgetBody.appendChild(thinkingEl);
        scrollToBottom();

        thinkingTimer = {
            element: thinkingEl,
            counterEl: thinkingEl.querySelector('.message-loading__counter'),
            duration
        };
    }

    function showTypingIndicator() {
        const widgetBody = document.querySelector('.n7-widget__body');
        if (!widgetBody) return;

        isBotThinking = true;
        typingStartedAt = Date.now();
        const typing = document.createElement('div');
        typing.className = 'n7-bot-thinking';
        typing.innerHTML = `
            <img class="n7-message__logo" src="${LOGO_URL}" alt="${LOGO_ALT}">
            <div class="n7-message-loading">
                <div class="n7-message-loading__dot"></div>
                <div class="n7-message-loading__dot"></div>
                <div class="n7-message-loading__dot"></div>

                <div class="n7-typing">
                    <span class="n7-pencil">
                        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                        d="M17.71 4.0425C18.1 3.6525 18.1 3.0025 17.71 2.6325L15.37 0.2925C15 -0.0975 14.35 -0.0975 13.96 0.2925L12.12 2.1225L15.87 5.8725M0 14.2525V18.0025H3.75L14.81 6.9325L11.06 3.1825L0 14.2525Z"
                        fill="#a9a9aa" />
                        </svg>
                    </span>
                </div>
            </div>
        `;

        widgetBody.appendChild(typing);
        scrollToBottom();

        thinkingTimer = { element: typing };
    }

    function hideTypingWithMinDelay(callback) {
        if (!typingStartedAt) {
            hideAnyThinking();
            callback?.();
            return;
        }

        const elapsed = Date.now() - typingStartedAt;
        const minTime = getRandomDelay();
        const remaining = Math.max(minTime - elapsed, 0);

        setTimeout(() => {
            hideAnyThinking();
            typingStartedAt = null;
            callback?.();
        }, remaining);
    }

    function hideAnyThinking() {
        if (thinkingTimer) {
            thinkingTimer.element?.remove();
            if (thinkingTimer.intervalId) {
                clearInterval(thinkingTimer.intervalId);
            }
            thinkingTimer = null;
        }

        isBotThinking = false;
        typingStartedAt = null;
        enableInput();
        scrollToBottom();
    }

    function hideSuggestions() {
        document.querySelector('.n7-suggestions-list')?.remove();
        document.querySelector('.n7-widget__description')?.remove();
    }

    function buildMessagePayload(text) {
        return {
            messages: [
                {
                    messageId: generateMessageId(),
                    chatType: 'neuro_widget',
                    chatId: getChatId(),
                    projects: PROJECTS,
                    type: 'text',
                    status: 'inbound',
                    text,
                    timestamp: Math.floor(Date.now() / 1000),
                    sender: getWidgetLocation(),
                    port: `https://sr.neuro7.pro:${BACKEND_PORT}/webhook/widget`
                }
            ]
        }
    }

    async function sendMessageToBackend(text) {
        const payload = buildMessagePayload(text);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Ошибка отправки сообщения');
            }

            return await response.json();
        } catch (err) {
            console.error('Ошибка API:', err);
            throw err;
        }
    }

    async function handleUserMessage(text) {
        if (isBotThinking) return;

        isBotThinking = true;
        const requestId = ++activeRequestId;
        const pendingMsg = saveUserMessage(text);
        addMessage(text, 'user');
        disableInput();
        hideSuggestions();

        try {
            const apiPromise = sendMessageToBackend(text);

            if (safetyTimeout) {
                clearTimeout(safetyTimeout);
                safetyTimeout = null;
            }
            safetyTimeout = setTimeout(() => {
                if (!navigator.onLine && isBotThinking) {
                    hideAnyThinking();
                    removeSystemMessages();
                    addMessage('Проверьте подключение к сети.', 'system');
                }
            }, 30000);

            if (isFirstUserMessage) {
                isFirstUserMessage = false;

                showBotThinking(12);

                await new Promise(resolve => {
                    let remaining = 12;
                    const interval = setInterval(() => {
                        remaining--;
                        if (thinkingTimer?.counterEl) {
                            thinkingTimer.counterEl.textContent = remaining;
                        }
                        if (remaining <= 4) {
                            clearInterval(interval);
                            thinkingTimer?.element?.remove();
                            resolve();
                        }
                    }, 1000);
                });

                showTypingIndicator();

                const result = await apiPromise;
                if (requestId !== activeRequestId) {
                    return;
                }

                clearTimeout(safetyTimeout);
                safetyTimeout = null;

                hideTypingWithMinDelay(() => {
                    if (result?.response) {
                        markMessageAnswered(pendingMsg.id);
                        saveBotMessage(result.response);
                        addMessage(result.response, 'bot');
                    }
                });

                return;
            }

            await new Promise(r => setTimeout(r, 3000));
            showTypingIndicator();
            
            const result = await apiPromise;
            if (requestId !== activeRequestId) {
                return;
            }

            clearTimeout(safetyTimeout);
            safetyTimeout = null;

            hideTypingWithMinDelay(() => {
                if (result?.response) {
                    markMessageAnswered(pendingMsg.id);
                    saveBotMessage(result.response);
                    addMessage(result.response, 'bot');
                }
            });
        } catch (err) {
            if (requestId !== activeRequestId) {
                return;
            }

            clearTimeout(safetyTimeout);
            safetyTimeout = null;

            if (!navigator.onLine || err instanceof TypeError) {
                hideAnyThinking();
                removeSystemMessages();
                addMessage('Проверьте соединение с интернетом', 'system');
                return;
            }

            hideAnyThinking();
            markMessageAnswered(pendingMsg.id);
            removeSystemMessages();
            addMessage('Произошла ошибка. Попробуйте позже.', 'system');
        }
    }

    async function retryPendingMessages(message) {
        disableInput();
        isBotThinking = true;
        showTypingIndicator();
        const requestId = ++activeRequestId;

        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }

        safetyTimeout = setTimeout(() => {
            if (!navigator.onLine && isBotThinking) {
                hideAnyThinking();
                removeSystemMessages();
                addMessage('Проверьте подключение к сети.', 'system');
            }
        }, 30000);

        try {
            const result = await sendMessageToBackend(message.text);
            if (requestId !== activeRequestId) {
                return;
            }

            clearTimeout(safetyTimeout);
            safetyTimeout = null;

            hideTypingWithMinDelay(() => {
                if (result?.response) {
                    markMessageAnswered(message.id);
                    saveBotMessage(result.response);
                    addMessage(result.response, 'bot');
                }
            })

        } catch (err) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;

            hideAnyThinking();
            removeSystemMessages();
            addMessage('Проверьте подключение к сети', 'system')
        }
    }

    function restoreChatAndRetry() {
        const messages = getStoredMessages();
        if (!messages.length) return;

        const hasUserMessage = messages.some(m => m.type === 'user');

        if (hasUserMessage) {
            hideSuggestions();
            isFirstUserMessage = false;
        }

        messages.forEach(msg => {
            addMessage(msg.text, msg.type, { skipSave: true });
        });

        const pending = [...messages].reverse().find(m => m.type === 'user' && m.status == 'pending');

        if (!pending) return;
        if (!navigator.onLine) {
            hideAnyThinking();
            disableInput();
            removeSystemMessages();
            addMessage('Проверьте подключение к сети', 'system');
            return
        }

        retryPendingMessages(pending);
    }

    function initWidget() {
        applyLogo();

        const form = document.querySelector('.n7-form');
        const messageInput = document.querySelector('.n7-input');

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                form.requestSubmit();
            }
        });

        window.addEventListener('online', () => {
            if (safetyTimeout) {
                clearTimeout(safetyTimeout);
                safetyTimeout = null;
            }
            removeSystemMessages();

            const messages = getStoredMessages();
            const pending = [...messages].reverse().find(m => m.type === 'user' && m.status === 'pending');

            if (pending && !isBotThinking) {
                retryPendingMessages(pending);
            } else {
                enableInput();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (!text) return;

            messageInput.value = '';
            messageInput.focus();

            handleUserMessage(text)
        });

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.n7-suggestions-list__item');
            if (!btn) return;

            const text = btn.dataset.message || btn.textContent;
            if (!text.trim()) return;

            handleUserMessage(text);
        });

        restoreChatAndRetry();
    }

    function mountAndInit() {
        mountWidget();
        initWidget();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountAndInit);
    } else {
        mountAndInit();
    }
})();