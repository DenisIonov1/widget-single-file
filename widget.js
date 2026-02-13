(function () {
    if (window.N7_WIDGET_LOADED) return;
    window.N7_WIDGET_LOADED = true;

    if (!window.N7_WIDGET_CONFIG) {
        console.error("N7 Widget: Конфигурация не добавлена");
        return;
    }
    const CONFIG = window.N7_WIDGET_CONFIG;

    const PROJECTS = CONFIG.project;
    const LOGO_URL = CONFIG.logoUrl;
    const API_URL = 'https://sr.neuro7.pro:5009/webhook/widget';

    if (!PROJECTS || !LOGO_URL) {
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
    let isChatMounted = false;
    let isChatOpen = false;
    let userHasInteracted = false;

    const style = document.createElement("style");
    style.textContent = `
        .n7-widget-btn {
            border: none;
            border-radius: 50%;
            box-shadow: 3px 0 3px rgba(0, 0, 0, 0.25);
            padding: 0;
            background-color: transparent;
            width: 55px;
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 222229999;
            display: flex;
            align-items: center;
            cursor: pointer;
            box-sizing: border-box;
            overflow: hidden;
            transition: all 0.5s ease;
        }

        .n7-widget-btn::after {
            content: "";
            position: absolute;
            top: 0;
            left: -120%;
            width: 10%;
            height: 100%;
            background: linear-gradient(120deg,
                    transparent,
                    rgba(255, 255, 255, 0.6),
                    transparent);
            filter: blur(4px);
            animation: none;
            pointer-events: none;
            z-index: 3;
            transform: skew(-25deg);
        }

        .n7-widget-toggle-icon {
            width: 55px;
            height: 55px;
            border: none;
            border-radius: 50%;
            background-color: #418787;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: none;
            transition: all 0.4s ease;
            z-index: 2;
            flex-shrink: 0;
        }

        .n7-widget-hint {
            font-family: Arial, sans-serif;
            width: 0;
            height: 55px;
            background-color: #418787;
            color: white;
            border-radius: 0 28px 28px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            font-size: 0;
            text-align: center;
            line-height: 1.2;
            background: linear-gradient(269.94deg, #418787 35.47%, #1F4037 53.35%, #418787 82.24%);
            opacity: 0;
            transition: all 0.4s ease;
            width: 227px;
            padding: 0;
            margin-left: -27.5px;
            text-wrap: nowrap;
            padding: 10px 20px 10px 48px;
            font-size: 15px;
            opacity: 0;
        }

        .n7-widget-btn.open {
            width: 255px;
            box-shadow: none;
            border-radius: 0;
        }

        .n7-widget-btn.animation-complete {
            border-radius: 27.5px;
        }

        .n7-widget-btn.open::after {
            animation: shine 5s 4s infinite;
        }

        .n7-widget-btn.open .n7-widget-hint {
            opacity: 1;
        }

        .n7-widget-btn.open .n7-widget-toggle-icon {
            box-shadow: 3px 0 3px rgba(0, 0, 0, 0.25);
        }

        .n7-widget-social-menu {
            position: fixed;
            background-color: #fff;
            bottom: 90px;
            right: 20px;
            width: 255px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            border-radius: 11px;
            z-index: 222292222;
            opacity: 0;
            visibility: hidden;
            transform: translateY(10px);
            transition: all 0.2s ease;
        }

        .n7-widget-social-menu.open {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .n7-social-item {
            display: block;
            min-height: 56px;
            text-decoration: none;
            display: flex;
            align-items: center;
            border: none;
            border-bottom: 1px solid rgba(0, 0, 0, .12);
            padding: 4px 14px;
            box-sizing: border-box;
            cursor: pointer;
        }

        .n7-widget-social-menu .n7-social-item:first-child {
            border-radius: 11px 11px 0 0;
        }

        .n7-widget-social-menu .n7-social-item:last-child {
            border: none;
            border-radius: 0 0 11px 11px;
            
        }

        .n7-social-item:hover {
            background-color: #ededed;
        }

        button.n7-social-item {
           width: 100%;
           background-color: transparent; 
        }

        .n7-social-icon {
            margin-right: 24px;
        }

        .n7-widget-social-menu .n7-social-name {
            font-family: Arial, sans-serif;
            font-size: 16px;
            color: #000;
        }
        .n7-widget {
            font-family: "Arial", sans-serif;
            position: fixed;
            bottom: 90px;
            right: 20px;
            max-width: 420px;
            width: min(100vw, 420px);
            height: min(85dvh, 450px);
            display: flex;
            flex-direction: column;
            background-color: #cccccc7a;
            border-radius: 16px;
            z-index: 2147483000;
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

    function createLauncher() {
        const container = document.createElement("div");

        container.innerHTML = `
            <button type="button" class="n7-widget-btn" aria-label="Открыть меню чата">
                <div class="n7-widget-toggle-icon">
                    <svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true">
                        <path
                            d="M6.5 19.5C6.5 16.0522 7.86964 12.7456 10.3076 10.3076C12.7456 7.86964 16.0522 6.5 19.5 6.5C22.9478 6.5 26.2544 7.86964 28.6924 10.3076C31.1304 12.7456 32.5 16.0522 32.5 19.5V27.7713C32.5 29.1493 32.5 29.835 32.2953 30.3859C32.1324 30.8224 31.8777 31.2188 31.5483 31.5483C31.2188 31.8777 30.8224 32.1324 30.3859 32.2953C29.835 32.5 29.1476 32.5 27.7713 32.5H19.5C16.0522 32.5 12.7456 31.1304 10.3076 28.6924C7.86964 26.2544 6.5 22.9478 6.5 19.5Z"
                            stroke="white" stroke-width="2" />
                        <path d="M14.625 17.875H24.375M19.5 24.375H24.375" stroke="white" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>
                <div class="n7-widget-hint">Не готовы к звонку? <br> Напишите вопрос в чате</div>
            </button>

            <div class="n7-widget-social-menu">
                <a href="#" class="n7-social-item">
                    <span class="n7-social-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M0.512151 11.8563C0.511588 13.8728 1.04259 15.8417 2.05228 17.5771L0.415588 23.5066L6.53109 21.9155C8.22256 22.8292 10.1177 23.308 12.0436 23.3081H12.0487C18.4063 23.3081 23.5816 18.1748 23.5843 11.8653C23.5855 8.80792 22.3867 5.93295 20.2085 3.76997C18.0307 1.60718 15.1342 0.415458 12.0482 0.414062C5.68978 0.414062 0.51487 5.54709 0.512245 11.8563"
                                fill="url(#paint0_linear_163_20)" />
                            <path
                                d="M9.06358 6.89746C8.8399 6.40416 8.60449 6.39421 8.39177 6.38556C8.21758 6.37811 8.01846 6.37867 7.81952 6.37867C7.6204 6.37867 7.29687 6.453 7.0234 6.74928C6.74965 7.04583 5.97827 7.76249 5.97827 9.22007C5.97827 10.6776 7.04824 12.0864 7.1974 12.2843C7.34674 12.4817 9.26299 15.5686 12.2979 16.7562C14.8201 17.743 15.3334 17.5468 15.8808 17.4973C16.4283 17.448 17.6474 16.7808 17.8961 16.089C18.1451 15.3973 18.1451 14.8043 18.0704 14.6804C17.9958 14.557 17.7967 14.4829 17.4981 14.3348C17.1995 14.1867 15.7315 13.4698 15.4578 13.371C15.1841 13.2722 14.985 13.2229 14.7859 13.5195C14.5868 13.8157 14.015 14.4829 13.8407 14.6804C13.6666 14.8785 13.4923 14.9031 13.1938 14.755C12.8951 14.6063 11.9335 14.2938 10.7926 13.2846C9.90499 12.4993 9.30574 11.5296 9.13155 11.2329C8.95737 10.9367 9.1129 10.7762 9.26262 10.6285C9.39677 10.4958 9.5613 10.2826 9.71074 10.1096C9.85962 9.93663 9.9093 9.81318 10.0089 9.6156C10.1085 9.41783 10.0586 9.24481 9.98412 9.09663C9.9093 8.94844 9.32908 7.48323 9.06358 6.89746Z"
                                fill="white" />
                            <defs>
                                <linearGradient id="paint0_linear_163_20" x1="1158.85" y1="2309.67" x2="1158.85" y2="0.414062"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#1FAF38" />
                                    <stop offset="1" stop-color="#60D669" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </span>
                    <span class="n7-social-name">WhatsApp</span>
                </a>

                <a href="#" class="n7-social-item">
                    <span class="n7-social-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M12 0C8.81813 0 5.76375 1.26506 3.51562 3.51469C1.2652 5.76522 0.000643966 8.81734 0 12C0 15.1813 1.26562 18.2357 3.51562 20.4853C5.76375 22.7349 8.81813 24 12 24C15.1819 24 18.2363 22.7349 20.4844 20.4853C22.7344 18.2357 24 15.1813 24 12C24 8.81869 22.7344 5.76431 20.4844 3.51469C18.2363 1.26506 15.1819 0 12 0Z"
                                fill="url(#paint0_linear_162_14)" />
                            <path
                                d="M5.4319 11.8733C8.93065 10.3493 11.2632 9.34454 12.4294 8.85904C15.7632 7.47285 16.455 7.2321 16.9069 7.22395C17.0063 7.22235 17.2275 7.24692 17.3719 7.36364C17.4919 7.46207 17.5257 7.5952 17.5425 7.68867C17.5575 7.78204 17.5782 7.99485 17.5613 8.16098C17.3813 10.0585 16.5994 14.6631 16.2019 16.7884C16.035 17.6877 15.7032 17.9892 15.3825 18.0186C14.685 18.0827 14.1563 17.5581 13.4813 17.1158C12.4257 16.4234 11.8294 15.9925 10.8038 15.3169C9.61878 14.5362 10.3875 14.107 11.0625 13.4057C11.2388 13.2222 14.31 10.4294 14.3682 10.176C14.3757 10.1444 14.3832 10.0262 14.3119 9.96398C14.2425 9.90154 14.1394 9.92292 14.0644 9.93979C13.9575 9.96379 12.2719 11.079 9.0019 13.2854C8.52378 13.6142 8.09065 13.7745 7.70065 13.7661C7.27315 13.7569 6.44815 13.5239 5.83503 13.3247C5.08503 13.0804 4.4869 12.9512 4.5394 12.5363C4.56565 12.3203 4.86378 12.0992 5.4319 11.8733Z"
                                fill="white" />
                            <defs>
                                <linearGradient id="paint0_linear_162_14" x1="1200" y1="0" x2="1200" y2="2400"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#2AABEE" />
                                    <stop offset="1" stop-color="#229ED9" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </span>
                    <span class="n7-social-name">Telegram</span>
                </a>

                <a href="#" class="n7-social-item">
                    <span class="n7-social-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_169_35)">
                                <path
                                    d="M23.736 12.2239C23.736 5.73169 18.473 0.46875 11.9809 0.46875C5.48871 0.46875 0.225769 5.73169 0.225769 12.2239C0.225769 18.716 5.48871 23.979 11.9809 23.979C18.473 23.979 23.736 18.716 23.736 12.2239Z"
                                    fill="url(#paint0_linear_169_35)" />
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M12.1295 19.0284C10.7804 19.0284 10.1535 18.8315 9.0637 18.0437C8.37441 18.9299 6.19158 19.6225 6.09642 18.4376C6.09642 17.548 5.89947 16.7964 5.67627 15.9758C5.41036 14.9648 5.1084 13.8389 5.1084 12.2075C5.1084 8.31131 8.30549 5.38013 12.0934 5.38013C15.8846 5.38013 18.8552 8.45575 18.8552 12.2436C18.8613 14.0347 18.1565 15.7551 16.8956 17.0271C15.6347 18.2991 13.9206 19.0188 12.1295 19.0284ZM12.1853 8.74787C10.3405 8.6527 8.90285 9.92955 8.58448 11.9318C8.3219 13.5894 8.78799 15.6081 9.18517 15.7132C9.37555 15.7591 9.85477 15.3718 10.1535 15.0731C10.6474 15.4143 11.2226 15.6192 11.821 15.6672C12.7398 15.7114 13.6393 15.3934 14.3261 14.7814C15.013 14.1695 15.4323 13.3125 15.494 12.3946C15.5299 11.4749 15.2033 10.5778 14.5845 9.89644C13.9658 9.21503 13.1042 8.8038 12.1853 8.75115V8.74787Z"
                                    fill="white" />
                            </g>
                            <defs>
                                <linearGradient id="paint0_linear_169_35" x1="6.62616" y1="30.8695" x2="26.4471" y2="22.4177"
                                    gradientUnits="userSpaceOnUse">
                                    <stop stop-color="#43D6FF" />
                                    <stop offset="0.5" stop-color="#3838FF" />
                                    <stop offset="0.98659" stop-color="#8F3FFF" />
                                </linearGradient>
                                <clipPath id="clip0_169_35">
                                    <rect width="24" height="24" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                    </span>
                    <span class="n7-social-name">Max</span>
                </a>

                <button type="button" class="n7-social-item" id="n7-open-chat">
                    <span class="n7-social-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="12" fill="#418787" />
                            <path
                                d="M6 12.0834C6 10.47 6.64093 8.92265 7.78179 7.78179C8.92265 6.64093 10.47 6 12.0834 6C13.6968 6 15.2442 6.64093 16.385 7.78179C17.5259 8.92265 18.1668 10.47 18.1668 12.0834V15.954C18.1668 16.5988 18.1668 16.9197 18.071 17.1775C17.9948 17.3818 17.8756 17.5673 17.7215 17.7215C17.5673 17.8756 17.3818 17.9948 17.1775 18.071C16.9197 18.1668 16.5981 18.1668 15.954 18.1668H12.0834C10.47 18.1668 8.92265 17.5259 7.78179 16.385C6.64093 15.2442 6 13.6968 6 12.0834Z"
                                stroke="white" stroke-width="1.9" />
                            <path d="M9.80206 11.323H14.3646M12.0833 14.3647H14.3646" stroke="white" stroke-width="1.8"
                                stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </span>
                    <span class="n7-social-name">Онлайн чат</span>
                </button>

                <button type="button" class="n7-social-item" aria-label="Закрыть" id="n7-close-menu">
                    <span class="n7-social-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M12 13.4L7.09999 18.3C6.91665 18.4834 6.68332 18.575 6.39999 18.575C6.11665 18.575 5.88332 18.4834 5.69999 18.3C5.51665 18.1167 5.42499 17.8834 5.42499 17.6C5.42499 17.3167 5.51665 17.0834 5.69999 16.9L10.6 12L5.69999 7.10005C5.51665 6.91672 5.42499 6.68338 5.42499 6.40005C5.42499 6.11672 5.51665 5.88338 5.69999 5.70005C5.88332 5.51672 6.11665 5.42505 6.39999 5.42505C6.68332 5.42505 6.91665 5.51672 7.09999 5.70005L12 10.6L16.9 5.70005C17.0833 5.51672 17.3167 5.42505 17.6 5.42505C17.8833 5.42505 18.1167 5.51672 18.3 5.70005C18.4833 5.88338 18.575 6.11672 18.575 6.40005C18.575 6.68338 18.4833 6.91672 18.3 7.10005L13.4 12L18.3 16.9C18.4833 17.0834 18.575 17.3167 18.575 17.6C18.575 17.8834 18.4833 18.1167 18.3 18.3C18.1167 18.4834 17.8833 18.575 17.6 18.575C17.3167 18.575 17.0833 18.4834 16.9 18.3L12 13.4Z"
                                fill="#418787" />
                        </svg>
                    </span>
                    <span class="n7-social-name">Закрыть</span>
                </button>
            </div>
        `;

        document.body.appendChild(container);
        return {
            toggleBtn: container.querySelector(".n7-widget-btn"),
            menu: container.querySelector(".n7-widget-social-menu"),
            openChatBtn: container.querySelector("#n7-open-chat"),
            closeMenuBtn: container.querySelector("#n7-close-menu")
        };
    }

    const wrapper = document.createElement("div");
    wrapper.style.display = "none";
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

    function openChat() {
        if (!isChatMounted) {
            mountWidget();
            initWidget();
            isChatMounted = true;
        }
        wrapper.style.display = "flex";
        isChatOpen = true;
    }

    function closeChat() {
        wrapper.style.display = "none";
        isChatOpen = false;
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
        return Math.floor(Math.random() * 3001) + 12000;
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
                    sender: getWidgetLocation()
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
                        if (remaining <= 3) {
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
    const launcher = createLauncher();

    launcher.toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userHasInteracted = true;

        if (isChatOpen) {
            closeChat();
        }

        launcher.menu.classList.add("open");
    });

    launcher.closeMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            launcher.toggleBtn.classList.remove("animation-complete");
            launcher.menu.classList.remove("open");
            launcher.toggleBtn.classList.remove("open");
    });

    launcher.openChatBtn.addEventListener("click", () => {
        launcher.menu.classList.remove("open");
        openChat();
    });
    
    launcher.menu.addEventListener('click', function(e) {
        const item = e.target.closest('.n7-social-item');
        if (!item) return;
        
        launcher.toggleBtn.classList.remove("animation-complete");
        launcher.toggleBtn.classList.remove("open");
    });

    setTimeout(() => {
        if (!userHasInteracted) {
            launcher.toggleBtn.classList.add("open");
            setTimeout(() => {
                launcher.toggleBtn.classList.add("animation-complete");
            }, 500)
        }
    }, 6000);
})();
