// ==UserScript==
// @name         智能自动答题助手 Pro
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  全自动网课答题：支持多种AI模型、多题库融合、题目状态保护、图片题目识别，详情见 README.md
// @author       我
// @homepage     https://github.com/YOUR_USERNAME/auto-answer-helper
// @supportURL   https://github.com/YOUR_USERNAME/auto-answer-helper/issues
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.openai.com
// @connect      api.anthropic.com
// @connect      aip.baidubce.com
// @connect      dashscope.aliyuncs.com
// @connect      api.moonshot.cn
// @connect      open.bigmodel.cn
// @connect      api.deepseek.com
// @connect      api.minimaxi.com
// @connect      api.minimax.com
// @connect      token.sensenova.cn
// @connect      api.xiaomimimo.com
// @connect      www.google.com
// @connect      www.bing.com
// @connect      www.baidu.com
// @connect      cn.bing.com
// @connect      ark.cn-beijing.volces.com
// @connect      volcengine.com
// @license      MIT
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 防止iframe重复加载
    if (window.top !== window.self) return;

    // ==================== 最新 AI 模型配置 (2025-2026) ====================
    const AI_MODELS = {
        openai: {
            name: 'OpenAI GPT',
            baseURL: 'https://api.openai.com/v1/chat/completions',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.5-preview', 'o1-preview', 'o3-mini', 'o4-mini'],
            defaultModel: 'gpt-4o',
            apiKey: '',
            enabled: false
        },
        anthropic: {
            name: 'Anthropic Claude',
            baseURL: 'https://api.anthropic.com/v1/messages',
            models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514', 'claude-3-7-sonnet-20250219'],
            defaultModel: 'claude-sonnet-4-20250514',
            apiKey: '',
            enabled: false,
            isAnthropic: true
        },
        baidu: {
            name: '百度文心一言',
            baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
            models: ['ernie-4.0-turbo-8k', 'ernie-4.0-8k', 'ernie-4.0-vision', 'ernie-speed-128k', 'ernie-lite-8k', 'ernie-tiny-8k'],
            defaultModel: 'ernie-4.0-turbo-8k',
            apiKey: '',
            secretKey: '',
            enabled: false,
            needsToken: true
        },
        aliyun: {
            name: '阿里通义千问',
            baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen2.5-vl-72b-instruct', 'qwen2.5-coder-32b-instruct', 'qwen3-235b-a22b', 'qwen3-30b-a3b'],
            defaultModel: 'qwen-plus',
            apiKey: '',
            enabled: false
        },
        moonshot: {
            name: '月之暗面 Kimi',
            baseURL: 'https://api.moonshot.cn/v1/chat/completions',
            models: ['kimi-k2-0711-chat', 'kimi-k2-instruct', 'moonshot-v1-32k', 'moonshot-v1-128k'],
            defaultModel: 'kimi-k2-0711-chat',
            apiKey: '',
            enabled: false
        },
        zhipu: {
            name: '智谱 AI GLM',
            baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            models: ['glm-4.5', 'glm-4-plus', 'glm-4-flash', 'glm-4-long', 'glm-4-air', 'glm-4-flashx'],
            defaultModel: 'glm-4-plus',
            apiKey: '',
            enabled: false
        },
        deepseek: {
            name: '深度求索 DeepSeek',
            baseURL: 'https://api.deepseek.com/v1/chat/completions',
            models: ['deepseek-v4', 'deepseek-v4-flash', 'deepseek-v3', 'deepseek-chat', 'deepseek-reasoner'],
            defaultModel: 'deepseek-v4',
            apiKey: '',
            enabled: false
        },
        minimax: {
            name: 'MiniMax',
            baseURL: 'https://api.minimaxi.com/v1/chat/completions',
            models: ['minimax-m2', 'minimax-m1', 'minimax-v1-230k'],
            defaultModel: 'minimax-m2',
            apiKey: '',
            enabled: false
        },
        sensenova: {
            name: '商汤日日新',
            baseURL: 'https://token.sensenova.cn/v1/chat/completions',
            models: ['sensenova-6.7-flash-lite', 'sensenova-67b-instruct'],
            defaultModel: 'sensenova-6.7-flash-lite',
            apiKey: '',
            enabled: false
        },
        mimovoip: {
            name: '小蜜 AI (Mimo)',
            baseURL: 'https://api.xiaomimimo.com/v1/chat/completions',
            models: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2.5-tts', 'mimo-v2.5-tts-voicedesign', 'mimo-v2.5-tts-voiceclone', 'mimo-v2-pro', 'mimo-v2-omni', 'mimo-v2-tts', 'mimo-v2-flash'],
            defaultModel: 'mimo-v2-flash',
            apiKey: '',
            enabled: false,
            useApiKeyHeader: true  // 特殊标记：使用 api-key 请求头
        },
        doubao: {
            name: '字节豆包',
            baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            models: ['Doubao-pro-32k', 'Doubao-lite-32k', 'Doubao-pro-4k', 'Doubao-lite-4k', 'Doubao-pro-128k', 'Doubao-pro-256k'],
            defaultModel: 'Doubao-lite-32k',
            apiKey: '',
            enabled: false
        },
        custom: {
            name: '自定义 API',
            baseURL: '',
            models: [],
            defaultModel: '',
            apiKey: '',
            enabled: false,
            isCustom: true
        }
    };

    // ==================== 纯白UI样式 ====================
    GM_addStyle(`
        #answer-assistant-panel {
            position: fixed; top: 20px; right: 20px; width: 450px; max-height: 88vh;
            background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;
            box-shadow: 0 10px 35px rgba(0,0,0,0.08); z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Microsoft YaHei", sans-serif;
            overflow: hidden; color: #111827;
        }

        .panel-header {
            background: #ffffff; padding: 18px 22px; border-bottom: 1px solid #f3f4f6;
            display: flex; justify-content: space-between; align-items: center; cursor: move;
            user-select: none;
        }

        .panel-title {
            display: flex; align-items: center; gap: 10px;
            font-size: 17px; font-weight: 700; color: #111827; margin: 0;
        }

        .panel-icon {
            width: 32px; height: 32px; background: #2563eb; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 16px; font-weight: bold;
        }

        .panel-actions { display: flex; gap: 6px; }

        .icon-btn {
            width: 30px; height: 30px; border: none; border-radius: 7px;
            background: #f9fafb; cursor: pointer; display: flex; align-items: center;
            justify-content: center; color: #6b7280; font-size: 15px; transition: all 0.2s;
        }

        .icon-btn:hover { background: #f3f4f6; color: #111827; transform: scale(1.05); }

        /* 标签导航 */
        .tab-nav {
            display: flex; background: #fafafa; border-bottom: 1px solid #e5e7eb; gap: 4px;
            padding: 0 16px;
        }

        .tab-item {
            flex: 1; padding: 13px 8px; border: none; background: transparent;
            cursor: pointer; font-size: 13px; font-weight: 500; color: #9ca3af;
            border-bottom: 2.5px solid transparent; transition: all 0.25s ease;
        }

        .tab-item:hover { color: #374151; background: rgba(255,255,255,0.5); }

        .tab-item.active {
            color: #2563eb; border-bottom-color: #2563eb; background: white;
        }

        /* 内容区域 */
        .panel-body { padding: 20px 22px; overflow-y: auto; max-height: calc(88vh - 140px); }

        .tab-pane { display: none; animation: fadeIn 0.3s ease; }

        .tab-pane.active { display: block; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        /* 表单控件 */
        .form-field { margin-bottom: 18px; }

        .field-label {
            display: block; margin-bottom: 7px; font-size: 13px; font-weight: 600;
            color: #374151;
        }

        .field-input, .field-select {
            width: 100%; padding: 11px 14px; border: 1.5px solid #e5e7eb; border-radius: 9px;
            font-size: 14px; outline: none; transition: all 0.2s; background: #ffffff;
            color: #111827; box-sizing: border-box;
        }

        .field-input:focus, .field-select:focus {
            border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }

        .field-input::placeholder { color: #d1d5db; }

        /* 按钮 */
        .btn {
            padding: 11px 20px; border: none; border-radius: 9px; font-size: 14px;
            font-weight: 600; cursor: pointer; transition: all 0.25s ease;
            display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        }

        .btn-primary { background: #2563eb; color: white; }

        .btn-primary:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

        .btn-success { background: #059669; color: white; }

        .btn-success:hover:not(:disabled) { background: #047857; transform: translateY(-1px); }

        .btn-warning { background: #d97706; color: white; }

        .btn-warning:hover:not(:disabled) { background: #b45309; }

        .btn-danger { background: #dc2626; color: white; }

        .btn-danger:hover:not(:disabled) { background: #b91c1c; }

        .btn-outline {
            background: white; border: 1.5px solid #d1d5db; color: #374151;
        }

        .btn-outline:hover:not(:disabled) { background: #f9fafb; border-color: #9ca3af; }

        .btn-delete {
            background: #ef4444; color: white; border: none;
            width: 24px; height: 24px; border-radius: 50%;
            font-size: 16px; line-height: 20px;
            cursor: pointer; opacity: 0.7;
            transition: all 0.2s; margin-left: 8px;
        }

        .btn-delete:hover { opacity: 1; transform: scale(1.1); }

        .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none !important; }

        .btn-block { width: 100%; }

        .btn-row { display: flex; gap: 10px; margin-top: 16px; }

        .btn-row .btn { flex: 1; }

        /* API卡片 */
        .api-card {
            background: #fafafa; border: 1.5px solid #e5e7eb; border-radius: 10px;
            padding: 16px; margin-bottom: 14px; transition: all 0.25s ease;
        }

        .api-card:hover { border-color: #d1d5db; background: #ffffff; }

        .api-card.selected { border-color: #2563eb; background: #eff6ff; }

        .api-card-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 12px; cursor: pointer;
        }

        .api-name { font-weight: 700; font-size: 14px; color: #111827; }

        .api-badge {
            font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600;
        }

        .badge-ready { background: #d1fae5; color: #065f46; }

        .badge-empty { background: #fee2e2; color: #991b1b; }

        .badge-checking { background: #fef3c7; color: #92400e; animation: pulse 1.5s infinite; }

        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        .api-body { display: none; }

        .api-body.show { display: block; animation: slideDown 0.25s ease; }

        @keyframes slideDown { from{opacity:0;max-height:0} to{opacity:1;max-height:500px} }

        /* 状态栏 */
        .status-bar {
            padding: 14px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
            margin-bottom: 18px; display: flex; align-items: center; gap: 10px;
        }

        .status-idle { background: #f9fafb; border: 1px solid #e5e7eb; color: #6b7280; }

        .status-running { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

        .status-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

        .status-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

        .status-dot {
            width: 9px; height: 9px; border-radius: 50%; background: currentColor;
            flex-shrink: 0;
        }

        .status-running .status-dot { animation: blink 1s infinite; }

        @keyframes blink { 50% { opacity: 0.3; } }

        /* 进度条 */
        .progress-wrap { margin: 16px 0; }

        .progress-info {
            display: flex; justify-content: space-between; font-size: 12px;
            color: #6b7280; margin-bottom: 8px; font-weight: 500;
        }

        .progress-track {
            width: 100%; height: 10px; background: #f3f4f6; border-radius: 5px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%; background: linear-gradient(90deg, #2563eb, #3b82f6);
            border-radius: 5px; transition: width 0.4s ease;
        }

        /* 日志区 */
        .log-area {
            height: 220px; overflow-y: auto; background: #1f2937; border-radius: 10px;
            padding: 14px; font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
            font-size: 12px; line-height: 1.7; color: #e5e7eb;
        }

        .log-line { padding: 3px 0; border-bottom: 1px solid #374151; word-break: break-all; }

        .log-line:last-child { border-bottom: none; }

        .log-ts { color: #6b7280; margin-right: 10px; user-select: none; }

        .log-msg-ok { color: #34d399; }

        .log-msg-err { color: #f87171; }

        .log-msg-warn { color: #fbbf24; }

        .log-msg-info { color: #60a5fa; }

        /* 设置项 */
        .setting-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 0; border-bottom: 1px solid #f3f4f6;
        }

        .setting-item:last-child { border-bottom: none; }

        .setting-label { font-size: 14px; color: #374151; font-weight: 500; }

        .toggle-switch {
            position: relative; width: 46px; height: 26px;
        }

        .toggle-switch input { opacity: 0; width: 0; height: 0; }

        .toggle-slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background: #d1d5db; border-radius: 26px; transition: 0.3s;
        }

        .toggle-slider:before {
            content: ""; position: absolute; height: 20px; width: 20px;
            left: 3px; bottom: 3px; background: white; border-radius: 50%;
            transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        input:checked + .toggle-slider { background: #2563eb; }

        input:checked + .toggle-slider:before { transform: translateX(20px); }

        .radio-label {
            display: flex; align-items: center; gap: 8px;
            font-size: 13px; color: #4b5563; cursor: pointer;
        }

        .radio-label input[type="radio"] {
            width: 16px; height: 16px; accent-color: #2563eb;
        }

        /* 题目预览 */
        .question-preview {
            background: #fafafa; border: 1px solid #e5e7eb; border-radius: 10px;
            padding: 16px; margin-top: 16px;
        }

        .preview-q { font-size: 13px; line-height: 1.7; color: #4b5563; margin-bottom: 12px; }

        .preview-a {
            font-size: 14px; line-height: 1.7; color: #059669; font-weight: 700;
            padding-top: 12px; border-top: 2px dashed #e5e7eb;
        }

        /* 通知提示 */
        .toast {
            position: fixed; top: 80px; right: 480px; padding: 14px 22px;
            background: white; border: 1px solid #e5e7eb; border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.12); font-size: 13px; font-weight: 500;
            z-index: 1000000; animation: toastIn 0.35s ease; max-width: 320px;
        }

        .toast.success { border-left: 4px solid #10b981; }

        .toast.error { border-left: 4px solid #ef4444; }

        .toast.info { border-left: 4px solid #3b82f6; }

        @keyframes toastIn { from{transform:translateX(30px);opacity:0} to{transform:translateX(0);opacity:1} }
    `);

    // ==================== 内置学习网站白名单 ====================
    const DEFAULT_WHITELIST = [
        'chaoxing.com',      // 学习通
        'icourse163.org',    // 中国大学MOOC
        'u-campus.cn',       // U校园
        'mooc1.chaoxing.com',// 学习通MOOC
        'study.163.com',     // 网易云课堂
        'open.163.com',      // 网易公开课
        'xuetangx.com',      // 学堂在线
        'coursera.org',      // Coursera
        'edX.org',           // edX
        'zhihuishu.com',     // 智慧树
        'ke.qq.com',         // 腾讯课堂
        'classcentral.com',  // Class Central
        'hw.smartstudy.com', // 超星泛雅
        'www.icourse6.net',  // 爱课程
        'www.xuetangx.com',  // 学堂在线
        'www.zhihuishu.com', // 智慧树
        'www.coursera.org',  // Coursera
        'www.edx.org'        // edX
    ];

    // ==================== 全局状态 ====================
    const state = {
        isRunning: false,
        shouldStop: false,
        currentIndex: 0,
        totalQuestions: 0,
        answeredCount: 0,
        selectedAPIId: null,
        questionArea: null,
        questionCache: new Map(),
        logs: [],
        // 保存暂停时的进度
        lastProcessedIndex: 0,  // 上次处理到第几题
        questionsList: [],       // 题目列表缓存
        settings: {
            autoSearch: true,        // 自动搜题
            searchEngine: 'bing',   // 搜索引擎：bing/google/baidu
            autoFill: true,          // 自动填写
            autoNext: true,          // 自动下一题
            delayTime: 1500,         // 延迟时间(ms)
            useCache: true,          // 使用缓存
            enableDualAPI: false,    // 启用双API对比
            secondAPIId: null,       // 第二个API
            questionTypes: ['all'],  // 要做的题目类型
            startMode: 'beginning', // 答题起始模式: beginning(从头开始), unanswered(从没做的开始), continue(继续上次进度)
            enableWhitelist: true,   // 是否启用网站白名单
            customWhitelist: [],     // 用户自定义网站白名单
            // ==================== 题库相关（融合自README.md的tikuAdapter） ====================
            // 题库列表：[{id, name, url, enabled}]
            tikuList: [],            // 多个题库，用户可增删启用
            tikuEnabled: true,       // 总开关：是否启用题库
            tikuRevalidate: false    // 题库有答案时，AI是否再复查一次
        }
    };

    // ==================== 网站白名单检查 ====================
    function isWhitelisted() {
        // 如果未启用白名单，返回true
        if (!state.settings.enableWhitelist) {
            return true;
        }

        const currentHost = window.location.hostname;
        
        // 检查内置白名单
        for (const domain of DEFAULT_WHITELIST) {
            if (currentHost.includes(domain)) {
                return true;
            }
        }

        // 检查用户自定义白名单
        for (const domain of state.settings.customWhitelist) {
            if (currentHost.includes(domain.trim())) {
                return true;
            }
        }

        return false;
    }

    // ==================== 日志系统 ====================
    function addLog(msg, type = 'info') {
        const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        state.logs.push({ ts, msg, type });
        if (state.logs.length > 150) state.logs.shift();

        const el = document.getElementById('log-container');
        if (!el) return;

        const div = document.createElement('div');
        div.className = 'log-line';
        div.innerHTML = `<span class="log-ts">[${ts}]</span><span class="log-msg-${type}">${msg}</span>`;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function showStatus(text, type = 'idle') {
        const bar = document.getElementById('status-bar');
        if (!bar) return;
        bar.className = `status-bar status-${type}`;
        bar.innerHTML = `<div class="status-dot"></div>${text}`;
    }

    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
    }

    // ==================== 配置持久化 ====================
    function saveAllConfig() {
        // 收集设置
        state.settings.autoSearch = document.getElementById('set-search')?.checked ?? true;
        state.settings.searchEngine = document.getElementById('set-engine')?.value || 'bing';
        state.settings.autoFill = document.getElementById('set-fill')?.checked ?? true;
        state.settings.autoNext = document.getElementById('set-next')?.checked ?? true;
        state.settings.delayTime = parseInt(document.getElementById('set-delay')?.value || 1500);
        state.settings.useCache = document.getElementById('set-cache')?.checked ?? true;
        // 题库相关（融合自README.md的tikuAdapter）
        // 注：tikuList 通过独立的 addTiku/removeTiku/toggleTiku 工具函数维护
        state.settings.tikuEnabled = document.getElementById('set-tiku-enabled')?.checked ?? true;
        state.settings.tikuRevalidate = document.getElementById('set-tiku-revalidate')?.checked ?? false;
        state.settings.enableDualAPI = document.getElementById('set-dual-api')?.checked ?? false;
        state.settings.secondAPIId = document.getElementById('sel-second-api')?.value || null;
        // 获取答题起始模式
        const startMode = document.querySelector('input[name="start-mode"]:checked')?.value || 'beginning';
        state.settings.startMode = startMode;
        
        // 收集题目类型选择
        const typeCheckboxes = document.querySelectorAll('.type-checkbox');
        const selectedTypes = [];
        typeCheckboxes.forEach(cb => {
            if (cb.checked) selectedTypes.push(cb.value);
        });
        state.settings.questionTypes = selectedTypes.length > 0 ? selectedTypes : ['all'];
        
        // 收集网站白名单设置
        state.settings.enableWhitelist = document.getElementById('set-whitelist')?.checked ?? true;

        // 收集 API 配置
        const apis = {};
        for (const [id, cfg] of Object.entries(AI_MODELS)) {
            apis[id] = {
                apiKey: document.getElementById(`key-${id}`)?.value || '',
                secretKey: document.getElementById(`secret-${id}`)?.value || '',
                model: document.getElementById(`model-${id}`)?.value || cfg.defaultModel,
                enabled: cfg.enabled,
                baseURL: cfg.baseURL,
                name: cfg.name,
                models: cfg.models,
                isCustom: cfg.isCustom,
                useApiKeyHeader: cfg.useApiKeyHeader || false
            };
        }

        GM_setValue('aa_pro_v5', JSON.stringify({
            selectedAPI: state.selectedAPIId,
            apis,
            settings: state.settings,
            questionArea: state.questionArea,
            lastProcessedIndex: state.lastProcessedIndex,
            questionsList: state.questionsList.map(q => ({
                text: q.cleanText || q.rawText || '',
                options: q.options || []
            }))
        }));
    }

    function loadAllConfig() {
        const raw = GM_getValue('aa_pro_v5');
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (data.selectedAPI) state.selectedAPIId = data.selectedAPI;
            if (data.settings) Object.assign(state.settings, data.settings);
            if (data.questionArea) state.questionArea = data.questionArea;

            // 迁移：旧版 tikuUrl 字段 → 新版 tikuList 数组
            if (data.settings) {
                if (!Array.isArray(state.settings.tikuList)) {
                    state.settings.tikuList = [];
                }
                if (state.settings.tikuList.length === 0 && data.settings.tikuUrl && data.settings.tikuUrl.trim()) {
                    state.settings.tikuList.push({
                        id: 'tiku_' + Date.now(),
                        name: '默认题库',
                        url: data.settings.tikuUrl,
                        enabled: true
                    });
                    // 迁移后清除旧字段
                    delete data.settings.tikuUrl;
                }
            }

            if (data.apis) {
                for (const [id, saved] of Object.entries(data.apis)) {
                    // 如果是内置 API
                    if (AI_MODELS[id]) {
                        AI_MODELS[id].apiKey = saved.apiKey || '';
                        AI_MODELS[id].secretKey = saved.secretKey || '';
                        AI_MODELS[id].enabled = saved.enabled || false;
                        AI_MODELS[id].model = saved.model || AI_MODELS[id].defaultModel;
                        // 更新 baseURL（如果保存的与默认不同）
                        if (saved.baseURL && saved.baseURL !== AI_MODELS[id].baseURL) {
                            AI_MODELS[id].baseURL = saved.baseURL;
                        }
                        // 加载特殊标记
                        if (saved.useApiKeyHeader) {
                            AI_MODELS[id].useApiKeyHeader = saved.useApiKeyHeader;
                        }
                    }
                    // 如果是自定义 API
                    else if (saved.isCustom) {
                        AI_MODELS[id] = {
                            name: saved.name || '自定义 API',
                            baseURL: saved.baseURL || '',
                            models: saved.models || [],
                            defaultModel: saved.model || (saved.models && saved.models[0]) || '',
                            apiKey: saved.apiKey || '',
                            enabled: saved.enabled || false,
                            isCustom: true,
                            useApiKeyHeader: saved.useApiKeyHeader || false
                        };
                    }
                }
            }
            
            // 加载答题进度
            if (data.lastProcessedIndex !== undefined) {
                state.lastProcessedIndex = data.lastProcessedIndex;
            }
            
            // 加载题目列表缓存
            if (data.questionsList && Array.isArray(data.questionsList)) {
                state.questionsList = data.questionsList;
            }
        } catch(e) {
            addLog('配置加载失败，使用默认值', 'error');
        }
    }

    // ==================== 搜索引擎集成 ====================
    async function searchQuestion(questionText) {
        const engine = state.settings.searchEngine;
        let url = '';

        switch(engine) {
            case 'google':
                url = `https://www.google.com/search?q=${encodeURIComponent(questionText + ' 答案')}&num=5`;
                break;
            case 'baidu':
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(questionText + ' 答案')}&rn=5`;
                break;
            case 'bing':
            default:
                url = `https://cn.bing.com/search?q=${encodeURIComponent(questionText)}&count=5`;
                break;
        }

        addLog(`正在通过${engine === 'bing' ? 'Bing' : engine === 'google' ? 'Google' : '百度'}搜索题目...`, 'info');

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(res) {
                    if (res.status !== 200) {
                        reject(new Error(`搜索失败: HTTP ${res.status}`));
                        return;
                    }

                    const html = res.responseText;
                    // 提取搜索结果摘要文本
                    const results = extractSearchResults(html);

                    if (results && results.length > 0) {
                        addLog(`搜索到 ${results.length} 条相关结果`, 'success');
                        resolve(results.join('\n'));
                    } else {
                        resolve('');
                    }
                },
                onerror: function(err) {
                    reject(new Error('搜索请求失败'));
                }
            });
        });
    }

    function extractSearchResults(html) {
        const results = [];

        // Bing 结果提取
        const bingMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi) ||
                           html.match(/<li class="b_algo"[^>]*>.*?<\/li>/gi);

        if (bingMatches) {
            bingMatches.forEach(m => {
                const text = m.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                if (text.length > 20 && text.length < 500) results.push(text);
            });
        }

        // Google 结果提取
        if (results.length === 0) {
            const googleMatches = html.match(/<span[^>]*>(.*?)<\/span>/gi);
            if (googleMatches) {
                googleMatches.slice(0, 8).forEach(m => {
                    const text = m.replace(/<[^>]+>/g, '').trim();
                    if (text.length > 15) results.push(text);
                });
            }
        }

        // 百度结果提取
        if (results.length === 0) {
            const baiduMatches = html.match(/<div class="c-abstract"[^>]*>(.*?)<\/div>/gi);
            if (baiduMatches) {
                baiduMatches.forEach(m => {
                    const text = m.replace(/<[^>]+>/g, '').trim();
                    if (text.length > 15) results.push(text);
                });
            }
        }

        return results.slice(0, 5);
    }

    // ==================== AI 调用核心 ====================
    const SYSTEM_PROMPT = `你是一个专业的智能答题助手，擅长解答各类题目。

任务：根据提供的题目内容和参考信息，给出最准确的答案。

答题规则：
1. 选择题：只回答选项字母（如 A、B、C、D），不要任何其他文字
2. 判断题：只回答"正确"或"错误"
3. 填空题：直接给出要填写的答案内容
4. 简答题：给出简洁准确的答案，不超过50字
5. 如果题目包含选项，请分析选项并选择最正确的一个
6. 即使没有参考信息，也要根据你的知识给出最佳答案

注意：
- 不要给出任何解释或推理过程
- 不要添加额外说明文字
- 直接输出答案即可`;

    // ==================== 题目类型检测 ====================
    function detectQuestionType(question) {
        // 检查题目对象和text属性是否存在
        if (!question) {
            return '单选题'; // 默认视为单选题
        }
        
        // 优先使用cleanText，其次使用rawText
        const text = (question.cleanText || question.rawText || '').toLowerCase();
        
        if (!text) {
            return '单选题';
        }
        
        if (text.includes('判断') || text.includes('正确') && text.includes('错误')) {
            return '判断题';
        }
        if (text.includes('选择') || text.includes('下列') || text.includes('选项')) {
            const optionCount = question.options?.length || 0;
            if (optionCount >= 2) {
                if (text.includes('多选') || text.includes('哪些')) {
                    return '多选题';
                }
                return '单选题';
            }
        }
        if (text.includes('填空') || text.includes('填写')) {
            return '填空题';
        }
        if (text.includes('简答') || text.includes('简述') || text.includes('说明')) {
            return '简答题';
        }
        if (text.includes('计算') || text.includes('求值')) {
            return '计算题';
        }
        
        return '单选题'; // 默认视为单选题
    }

    // ==================== 题目类型检查 ====================
    function isQuestionTypeAllowed(qType) {
        const allowedTypes = state.settings.questionTypes;
        
        if (!allowedTypes || allowedTypes.length === 0 || allowedTypes.includes('all')) {
            return true;
        }
        
        return allowedTypes.includes(qType);
    }

    // 检查题目是否已作答
    // 严格判定：只信任浏览器原生的 input.checked + 文本框/可编辑区域有值
    // 不要用 .check_answer / .check_answer_dx 等class — 这些是UI标记，**未选时也可能存在**
    function isQuestionAnswered(question) {
        const el = question.element;
        if (!el) return false;

        // 1. 原生 input[type=radio/checkbox] checked（最可靠）
        const radioInputs = el.querySelectorAll('input[type="radio"]');
        for (const radio of radioInputs) {
            if (radio.checked) return true;
        }
        const checkboxInputs = el.querySelectorAll('input[type="checkbox"]');
        for (const checkbox of checkboxInputs) {
            if (checkbox.checked) return true;
        }

        // 2. 文本输入框有值（填空题）
        const textInputs = el.querySelectorAll('input[type="text"], textarea, input:not([type])');
        for (const input of textInputs) {
            if ((input.value || '').trim()) return true;
        }

        // 3. contenteditable 有内容
        const editables = el.querySelectorAll('[contenteditable="true"]');
        for (const ed of editables) {
            if ((ed.textContent || ed.innerText || '').trim()) return true;
        }

        // 4. ARIA 标准 aria-checked="true"
        const ariaChecked = el.querySelectorAll('[aria-checked="true"]');
        if (ariaChecked.length > 0) return true;

        return false;
    }

    // 获取已答信息（用于日志显示+答案对比）
    // 返回 { kind: 'choice'|'multi'|'text'|'none', letters: 'B'|'AC'|'', text: '填的内容'|'', display: '用于显示的字符串' }
    // 参考README.md的 ignore_click：学习通优先用 .check_answer_dx 等class
    function getAnsweredInfo(question) {
        const el = question.element;
        if (!el) return { kind: 'none', letters: '', text: '', display: '已答' };

        // 1. 单选按钮（input[type=radio]）
        const radioInputs = el.querySelectorAll('input[type="radio"]');
        for (let i = 0; i < radioInputs.length; i++) {
            if (radioInputs[i].checked) {
                const letter = String.fromCharCode(65 + i);
                return { kind: 'choice', letters: letter, text: '', display: '选项 ' + letter };
            }
        }

        // 2. 复选框（input[type=checkbox]）
        const checkboxInputs = el.querySelectorAll('input[type="checkbox"]');
        const checked = [];
        for (let i = 0; i < checkboxInputs.length; i++) {
            if (checkboxInputs[i].checked) {
                checked.push(String.fromCharCode(65 + i));
            }
        }
        if (checked.length > 0) {
            return { kind: 'multi', letters: checked.join(''), text: '', display: '选项 ' + checked.join(',') };
        }

        // 3. 学习通平台：用 .check_answer / .check_answer_dx 容器内查找 input
        // 学习通结构：.check_answer > input[type=radio]
        const checkAnswerEls = el.querySelectorAll('.check_answer, .check_answer_dx, .check_answer_dx_, .num_option_dx, .num_option');
        const allRadios = el.querySelectorAll('input[type="radio"]');
        const allCheckboxes = el.querySelectorAll('input[type="checkbox"]');
        const foundLetters = new Set();

        for (const ca of checkAnswerEls) {
            const innerRadios = ca.querySelectorAll('input[type="radio"]');
            for (const ir of innerRadios) {
                const idx = Array.from(allRadios).indexOf(ir);
                if (idx >= 0) foundLetters.add(String.fromCharCode(65 + idx));
            }
            const innerCheckboxes = ca.querySelectorAll('input[type="checkbox"]');
            for (const ic of innerCheckboxes) {
                const idx = Array.from(allCheckboxes).indexOf(ic);
                if (idx >= 0) foundLetters.add(String.fromCharCode(65 + idx));
            }
        }

        if (foundLetters.size > 0) {
            const letters = Array.from(foundLetters).sort().join('');
            if (letters.length > 1) {
                return { kind: 'multi', letters, text: '', display: '选项 ' + letters.split('').join(',') };
            } else {
                return { kind: 'choice', letters, text: '', display: '选项 ' + letters };
            }
        }

        // 4. 通用：其他自定义class选中状态
        const otherSelectedSelectors = '.selected, .checked, .on, .active, .is-checked, .is-selected, [class*="checked"]:not([class*="unchecked"]), [class*="selected"]';
        const otherSelectedEls = el.querySelectorAll(otherSelectedSelectors);
        for (const sel of otherSelectedEls) {
            const innerRadios = sel.querySelectorAll('input[type="radio"]');
            for (const ir of innerRadios) {
                const idx = Array.from(allRadios).indexOf(ir);
                if (idx >= 0) foundLetters.add(String.fromCharCode(65 + idx));
            }
            const innerCheckboxes = sel.querySelectorAll('input[type="checkbox"]');
            for (const ic of innerCheckboxes) {
                const idx = Array.from(allCheckboxes).indexOf(ic);
                if (idx >= 0) foundLetters.add(String.fromCharCode(65 + idx));
            }
            // 文本开头是 A-F
            if (foundLetters.size === 0) {
                const selText = (sel.textContent || '').trim();
                const m = selText.match(/^([A-Fa-f])/);
                if (m) foundLetters.add(m[1].toUpperCase());
            }
        }
        if (foundLetters.size > 0) {
            const letters = Array.from(foundLetters).sort().join('');
            if (letters.length > 1) {
                return { kind: 'multi', letters, text: '', display: '选项 ' + letters.split('').join(',') };
            } else {
                return { kind: 'choice', letters, text: '', display: '选项 ' + letters };
            }
        }

        // 5. 文本输入框
        const textInputs = el.querySelectorAll('input[type="text"], textarea');
        for (const input of textInputs) {
            const v = (input.value || '').trim();
            if (v) {
                return { kind: 'text', letters: '', text: v, display: '填空: ' + v.substring(0, 10) };
            }
        }

        // 6. contenteditable
        const editables = el.querySelectorAll('[contenteditable="true"]');
        for (const ed of editables) {
            const v = (ed.textContent || ed.innerText || '').trim();
            if (v) {
                return { kind: 'text', letters: '', text: v, display: '填空: ' + v.substring(0, 10) };
            }
        }

        return { kind: 'none', letters: '', text: '', display: '已答(未识别选项)' };
    }

    // 找到第一个未作答的题目索引
    function findFirstUnansweredIndex(questions) {
        for (let i = 0; i < questions.length; i++) {
            if (!isQuestionAnswered(questions[i])) {
                return i;
            }
        }
        return 0; // 如果所有题目都已作答，返回0
    }

    // ==================== 双API对比处理 ====================
    async function processWithDualAPI(question) {
        const firstAPIId = state.selectedAPIId;
        const secondAPIId = state.settings.secondAPIId;
        
        try {
            // 保存原始API设置
            const originalAPIId = state.selectedAPIId;
            
            // 使用第一个API获取答案
            state.selectedAPIId = firstAPIId;
            const answer1 = await getAnswer(question);
            
            // 使用第二个API获取答案
            state.selectedAPIId = secondAPIId;
            const answer2 = await getAnswer(question);
            
            // 恢复原始API设置
            state.selectedAPIId = originalAPIId;
            
            addLog(`双API对比: [${AI_MODELS[firstAPIId].name}]${answer1} vs [${AI_MODELS[secondAPIId].name}]${answer2}`, 'info');
            
            // 对比答案
            const normalizedAnswer1 = answer1.trim().toUpperCase();
            const normalizedAnswer2 = answer2.trim().toUpperCase();
            
            if (normalizedAnswer1 === normalizedAnswer2 && normalizedAnswer1 !== '不确定') {
                // 答案一致，填写答案
                addLog('答案一致，自动填写', 'success');
                fillAnswer(question.element, answer1);
                state.answeredCount++;
            } else {
                // 答案不一致或不确定，跳过
                addLog('答案不一致或不确定，跳过此题', 'warn');
            }
        } catch (err) {
            addLog(`双API对比失败: ${err.message}`, 'error');
        }
    }

    async function callAI(prompt, images = []) {
        const api = AI_MODELS[state.selectedAPIId];
        if (!api || !api.apiKey) throw new Error('未选择或未配置 API');

        addLog(`调用 ${api.name} [${api.model}]...`, 'info');

        if (api.isAnthropic) {
            return callAnthropic(api, prompt);
        } else if (api.needsToken) {
            return callBaidu(api, prompt);
        } else {
            // 所有其他 API（包括阿里通义千问、自定义 API）都使用 OpenAI 兼容格式
            return callOpenAICompat(api, prompt, images);
        }
    }

    function callOpenAICompat(api, prompt, images = []) {
        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // 根据 API 类型选择认证方式
            if (api.useApiKeyHeader) {
                // 小蜜 AI 等使用 api-key 请求头
                headers['api-key'] = api.apiKey;
            } else {
                // 默认使用 Authorization Bearer 方式
                headers['Authorization'] = `Bearer ${api.apiKey}`;
            }
            
            // 构建消息内容
            let content = prompt;
            if (images && images.length > 0) {
                // 多模态请求：混合文本和图片
                content = [
                    { type: 'text', text: prompt }
                ];
                images.forEach(imgBase64 => {
                    content.push({
                        type: 'image_url',
                        image_url: {
                            url: imgBase64
                        }
                    });
                });
            }
            
            GM_xmlhttpRequest({
                method: 'POST',
                url: api.baseURL,
                headers: headers,
                data: JSON.stringify({
                    model: api.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: content }
                    ],
                    temperature: 0.1,
                    max_tokens: 300
                }),
                onload(res) {
                    try {
                        const d = JSON.parse(res.responseText);
                        if (d.choices && d.choices[0]) {
                            resolve(d.choices[0].message.content.trim());
                        } else {
                            reject(new Error(d.error?.message || '返回格式异常'));
                        }
                    } catch(e) {
                        reject(new Error('响应解析失败'));
                    }
                },
                onerror() { reject(new Error('网络异常')); }
            });
        });
    }

    function callAnthropic(api, prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: api.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': api.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                data: JSON.stringify({
                    model: api.model,
                    max_tokens: 300,
                    system: SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: prompt }]
                }),
                onload(res) {
                    try {
                        const d = JSON.parse(res.responseText);
                        if (d.content && d.content[0]) {
                            resolve(d.content[0].text.trim());
                        } else {
                            reject(new Error(d.error?.message || '返回格式异常'));
                        }
                    } catch(e) {
                        reject(new Error('响应解析失败'));
                    }
                },
                onerror() { reject(new Error('网络异常')); }
            });
        });
    }

    function callBaidu(api, prompt) {
        return new Promise((resolve, reject) => {
            // 获取token
            GM_xmlhttpRequest({
                method: 'POST',
                url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${api.apiKey}&client_secret=${api.secretKey}`,
                onload(tokenRes) {
                    try {
                        const td = JSON.parse(tokenRes.responseText);
                        if (!td.access_token) return reject(new Error('百度Token获取失败'));

                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: `${api.baseURL}?access_token=${td.access_token}`,
                            headers: { 'Content-Type': 'application/json' },
                            data: JSON.stringify({
                                messages: [
                                    { role: 'user', content: SYSTEM_PROMPT + '\n\n' + prompt }
                                ],
                                temperature: 0.1
                            }),
                            onload(res) {
                                const d = JSON.parse(res.responseText);
                                d.result ? resolve(d.result.trim()) : reject(new Error(d.error_msg || 'API异常'));
                            },
                            onerror() { reject(new Error('请求异常')); }
                        });
                    } catch(e) {
                        reject(new Error('Token解析失败'));
                    }
                },
                onerror() { reject(new Error('网络异常')); }
            });
        });
    }

    function callAliyun(api, prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: api.baseURL,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.apiKey}`
                },
                data: JSON.stringify({
                    model: api.model,
                    input: {
                        messages: [
                            { role: 'system', content: SYSTEM_PROMPT },
                            { role: 'user', content: prompt }
                        ]
                    },
                    parameters: { result_format: 'message', temperature: 0.1 }
                }),
                onload(res) {
                    try {
                        const d = JSON.parse(res.responseText);
                        const txt = d.output?.choices?.[0]?.message?.content || d.output?.text;
                        txt ? resolve(txt.trim()) : reject(new Error(d.message || 'API异常'));
                    } catch(e) {
                        reject(new Error('解析失败'));
                    }
                },
                onerror() { reject(new Error('网络异常')); }
            });
        });
    }

    // ==================== 题目识别与提取 ====================
    // ==================== 图片处理工具函数 ====================

    // 将图片转换为base64
    function imageToBase64(imgElement) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置canvas大小
            canvas.width = imgElement.naturalWidth || imgElement.width || 800;
            canvas.height = imgElement.naturalHeight || imgElement.height || 600;
            
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            
            try {
                const base64 = canvas.toDataURL('image/png');
                resolve(base64);
            } catch (e) {
                reject(e);
            }
        });
    }

    // 获取题目区域内的所有图片
    async function extractImagesFromElement(element) {
        const images = element.querySelectorAll('img');
        const base64Images = [];
        
        for (const img of images) {
            // 跳过太小的图片（可能是图标）
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            if (width < 30 || height < 30) continue;
            
            // 跳过svg图标
            const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (src && src.includes('.svg')) continue;
            
            try {
                // 如果图片已经加载完成
                if (img.complete && img.naturalWidth > 0) {
                    const base64 = await imageToBase64(img);
                    base64Images.push(base64);
                } else if (src) {
                    // 图片还没加载，尝试创建新的img元素加载
                    const newImg = new Image();
                    newImg.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        newImg.onload = resolve;
                        newImg.onerror = reject;
                        newImg.src = src;
                    });
                    const base64 = await imageToBase64(newImg);
                    base64Images.push(base64);
                }
            } catch (e) {
                console.warn('[AnswerAssistant] 图片转换失败:', e);
            }
        }
        
        return base64Images;
    }

    // 检查元素是否主要包含图片（图片题目）
    function isImageQuestion(element) {
        const text = (element.innerText || element.textContent || '').trim();
        const images = element.querySelectorAll('img');
        
        // 如果文本很少但有图片，可能是图片题目
        if (text.length < 20 && images.length > 0) {
            // 检查是否有足够大的图片
            for (const img of images) {
                const width = img.naturalWidth || img.width || 0;
                const height = img.naturalHeight || img.height || 0;
                if (width > 100 && height > 50) {
                    return true;
                }
            }
        }
        return false;
    }

    // ==================== 章节判断（参考README.md的 ignore_click 思路） ====================
    // 关键原则：宁可漏判一些章节（让题目识别走URL精确root），也不要误判题目
    // 判断为章节的硬性条件（同时满足）：
    //   1. 元素在章节导航/目录/侧边栏容器内（class含chapter/catalog/tree等）
    //   2. 文本符合"数字.数字 xxx"或"第X章/节"等章节编号
    //   3. 没有答题控件
    // 注意：不要因为"短文本+没有A-F选项"就误判为章节！
    function isChapterElement(element) {
        if (!element) return false;

        // 1. 必须没有答题控件（章节没有单选/复选/输入框）
        const hasControls = element.querySelector('input[type="radio"], input[type="checkbox"], textarea, input[type="text"]');
        if (hasControls) return false;

        const text = (element.innerText || element.textContent || '').trim();
        if (!text) return false;

        // 2. 文本长度限制：章节标题通常较短
        if (text.length > 80) return false;

        // 3. 优先看父容器是否是章节容器（学习通侧边栏等）
        const chapterContainerSelectors = [
            '[class*="chapter"]',
            '[class*="catalog"]',
            '[class*="tree"]',
            '[class*="outline"]',
            '[class*="toc"]',
            '[class*="posCatalog"]',
            '[class*="anchor-bar"]',
            '[class*="sideBar"]',
            '[class*="menuList"]',
            '[class*="directory"]',
            '.chapter-content',
            '.chapter_list',
            '.timeline',
            '.anchor-list'
        ];
        let inChapterContainer = false;
        for (const sel of chapterContainerSelectors) {
            if (element.closest(sel)) {
                inChapterContainer = true;
                break;
            }
        }
        if (!inChapterContainer) return false;

        // 4. 在章节容器内才检查文本模式
        // 学习通章节："13.7 课程知识点"、"15.5 数据库CRUD操作（2）"
        // 章节："第三章"、"第一节"
        // 视频章节点："16.1 系统需求分析与设计"
        const chapterPatterns = [
            /^\d+\.\d+\s+\S+/,                              // 13.7 xxx
            /^第[一二三四五六七八九十百千万\d]+\s*[章节讲篇课]/,  // 第三章
        ];
        for (const p of chapterPatterns) {
            if (p.test(text)) {
                // 进一步确认不含问号（章节一般不是问句）
                if (!/[？?]/.test(text)) {
                    return true;
                }
            }
        }

        return false;
    }

    // ==================== 平台URL精确识别（仿照README.md） ====================
    // 根据URL路径返回该平台精确的题目容器选择器
    // 参考README.md中各平台的root配置
    // 返回 '__NO_QUESTION__' 表示该页面**没有题目**（如视频学习页、首页等）
    // 返回 null 表示未匹配平台，需要走通用fallback（**但仍可能误识别**）
    function getPlatformQuestionRoot() {
        const path = location.pathname;
        const href = location.href;

        // ==================== 已知"无题目"页面（直接排除） ====================
        // 学习通视频学习页：/mycourse/studentstudy
        // 这种页面有章节导航、任务点、视频播放器，**没有题目**
        if (path.includes('/mycourse/studentstudy') ||
            path.includes('/mycourse/teacherstudy') ||
            path.includes('/mycourse/college') ||
            path.includes('/mooc2/course') ||
            path.includes('/work/list') ||
            path.includes('/exam/list') ||
            path.includes('/work/doHomeWorkList') ||
            path.includes('/exam/testList') ||
            path.includes('/mooc2/index') ||
            path === '/ananas/modules/video/index.html' ||
            href.includes('mycourse/studentstudy')) {
            return '__NO_QUESTION__';
        }

        // ==================== 有题目的页面 ====================
        // 学习通作业
        if (path === "/mooc2/work/dowork" || path === "/mooc-ans/mooc2/work/dowork") {
            return ".questionLi";
        }
        // 学习通新版考试/章节测验
        if (path === "/exam/test/reVersionTestStartNew" || path === "/exam-ans/exam/test/reVersionTestStartNew" || path === "/mooc-ans/exam/test/reVersionTestStartNew") {
            // 新版考试
            if (href.includes("newMooc=true")) {
                return ".questionLi";
            }
            // 旧版考试
            return ".TiMu";
        }
        // 学习通考试中心（所有题目）
        if (path === "/mooc2/exam/preview" || path === "/exam-ans/mooc2/exam/preview" || path === "/mooc-ans/mooc2/exam/preview") {
            return ".questionLi";
        }
        // 超星章节测验
        if (path === "/work/doHomeWorkNew" || path === "/mooc-ans/work/doHomeWorkNew") {
            return ".clearfix .TiMu";
        }
        // 超星随堂测验
        if (path.includes("/page/quiz/stu/answerQuestion")) {
            return ".question-item";
        }
        return null;
    }

    function detectQuestions(container) {
        const questions = [];

        // ==================== 策略0：URL精确识别"无题目"页面（直接返回空） ====================
        const platformRoot = getPlatformQuestionRoot();
        if (platformRoot === '__NO_QUESTION__') {
            // 这是视频学习页、首页等，根本没有题目
            return questions;
        }

        // ==================== 策略1：URL精确匹配（完全仿照README.md） ====================
        // 章节导航栏在不同的DOM容器中，使用平台的精确root选择器根本不会匹配到章节
        // 这是避免章节误识别的根本方法
        if (platformRoot) {
            const found = container.querySelectorAll(platformRoot);
            if (found.length > 0) {
                for (const el of found) {
                    const text = (el.innerText || el.textContent || '').trim();
                    if (text.length > 3) {
                        const isImgQ = isImageQuestion(el);
                        questions.push({
                            index: questions.length + 1,
                            rawText: text,
                            cleanText: cleanQuestionText(text) || text,
                            element: el,
                            options: extractOptions(el),
                            isImageQuestion: isImgQ
                        });
                    }
                }
                // URL精确匹配成功，直接返回，不再走通用选择器（避免章节干扰）
                if (questions.length > 0) {
                    return questions;
                }
            }
        }

        // ==================== 策略2：fallback到通用选择器（仅在URL匹配不到时使用） ====================
        // 此时才使用宽泛选择器，但必须经过严格的章节排除

        // 排除侧边栏/导航栏/目录区域的选择器
        const excludeSelectors = [
            '[class*="sidebar"]',
            '[class*="nav"]',
            '[class*="menu"]',
            '[class*="catalog"]',
            '[class*="chapter"]',
            '[class*="directory"]',
            '[class*="toc"]',
            '[class*="outline"]',
            '[class*="tree"]',
            '[class*="list"]',
            '[id*="sidebar"]',
            '[id*="nav"]',
            '[id*="menu"]',
            '[id*="catalog"]',
            '[id*="chapter"]',
            'aside',
            'nav'
        ];

        // 精确的题目容器选择器（优先使用）
        const preciseSelectors = [
            '.questionLi',           // 学习通
            '.TiMu',                 // 超星
            '.question-item',        // 超星随堂测验
            '.exam-question',
            '.test-question',
            '.quiz-question',
            '[class*="question-item"]',
            '[class*="question-content"]',
            '[class*="question-body"]',
            '[class*="exam-item"]',
            '[class*="test-item"]'
        ];

        // 通用题目选择器（备用）
        const generalSelectors = [
            '[class*="question"]',
            '[class*="exam"]',
            'div[class*="question"]'
        ];

        // 辅助函数：检查元素是否在排除区域内
        function isInExcludedArea(el) {
            for (const sel of excludeSelectors) {
                if (el.closest(sel)) return true;
            }
            return false;
        }

        // 辅助函数：检查元素是否包含答题控件（单选框/复选框/输入框）
        function hasAnswerControls(el) {
            return el.querySelector('input[type="radio"], input[type="checkbox"], input[type="text"], textarea, .option, .answer') !== null;
        }

        // 综合判断元素是否应该被排除（章节/导航/无答题控件）
        function shouldExcludeElement(el) {
            if (isInExcludedArea(el)) return true;
            if (isChapterElement(el)) return true;
            return false;
        }

        let qElements = [];

        // 优先使用精确选择器
        if (qElements.length === 0) {
            for (const sel of preciseSelectors) {
                const found = container.querySelectorAll(sel);
                if (found.length > 0) {
                    qElements = Array.from(found).filter(el => {
                        if (shouldExcludeElement(el)) return false;
                        const text = (el.innerText || el.textContent || '').trim();
                        return text.length > 5; // 降低长度要求
                    });
                    if (qElements.length > 0) break;
                }
            }
        }

        // 如果精确选择器没找到，尝试通用选择器
        if (qElements.length === 0) {
            for (const sel of generalSelectors) {
                const found = container.querySelectorAll(sel);
                if (found.length > 0) {
                    qElements = Array.from(found).filter(el => {
                        if (shouldExcludeElement(el)) return false;
                        const text = (el.innerText || el.textContent || '').trim();
                        return text.length > 5;
                    });
                    if (qElements.length > 0) break;
                }
            }
        }

        // 如果还没找到，尝试更宽泛的选择器但排除导航区域和章节
        if (qElements.length === 0) {
            const wideFound = container.querySelectorAll('[class*="item"], [class*="topic"], li');
            qElements = Array.from(wideFound).filter(el => {
                if (shouldExcludeElement(el)) return false;
                // 必须包含答题控件或选项标记
                if (!hasAnswerControls(el) && !/[A-Fa-f][\.、\)\s]/.test(el.textContent)) return false;
                const text = (el.innerText || el.textContent || '').trim();
                return text.length > 5;
            });
        }

        // 关键：不再 fallback 到 [container]，避免把整个body误识别为单个"题目"
        // 如果宽泛选择器也没找到，说明当前页面没有题目，直接返回空数组

        // 去重 - 避免重复识别
        const processedElements = new Set();
        
        qElements.forEach(el => {
            // 跳过已处理的父元素的子元素
            let parent = el.parentElement;
            let isChild = false;
            while (parent) {
                if (processedElements.has(parent)) {
                    isChild = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (isChild) return;
            
            // 再次检查排除区域和章节
            if (shouldExcludeElement(el)) return;

            const text = (el.innerText || el.textContent || '').trim();
            
            // 检查是否是图片题目
            const isImgQ = isImageQuestion(el);
            
            // 匹配题目模式（放宽匹配条件）
            const patterns = [
                /^(\d+)[\.、\)\s]+(.+)/,           // 1. xxx 或 1）xxx
                /^[一二三四五六七八九十百千万][\.、\s]+(.+)/, // 一、xxx
                /^第\s*(\d+)\s*[题道小题]/,          // 第1题 / 第1道 / 第1小题
                /^Question\s*\d+/i,                  // Question 1
                /^Q[\.\s]\d+/i,                      // Q.1
                /^\d+\s*[-:]\s*/,                    // 1 - xxx 或 1: xxx
                /^[（(]\d+[）)]\s*/                   // (1) xxx
            ];

            // 对于图片题目，直接添加
            if (isImgQ) {
                processedElements.add(el);
                questions.push({
                    index: questions.length + 1,
                    rawText: text,
                    cleanText: text || '[图片题目]',
                    element: el,
                    options: extractOptions(el),
                    isImageQuestion: true
                });
            } else {
                // 检查是否匹配题目模式，或包含答题控件
                let isQuestion = false;
                for (const p of patterns) {
                    if (p.test(text)) {
                        isQuestion = true;
                        break;
                    }
                }
                
                // 如果没有匹配题目模式，但包含答题控件（单选/复选框/选项），也认为是题目
                if (!isQuestion && hasAnswerControls(el)) {
                    isQuestion = true;
                }
                
                if (isQuestion) {
                    const cleanText = cleanQuestionText(text);
                    if (cleanText.trim().length > 3 || isImgQ) { // 大幅降低长度要求
                        processedElements.add(el);
                        questions.push({
                            index: questions.length + 1,
                            rawText: text,
                            cleanText: cleanText,
                            element: el,
                            options: extractOptions(el),
                            isImageQuestion: isImgQ
                        });
                    }
                }
            }
        });

        // 如果上面没识别到，尝试更宽松的识别（扫描整个容器）
        if (questions.length === 0) {
            const allElements = container.querySelectorAll('div, section, article');
            allElements.forEach(el => {
                if (isInExcludedArea(el)) return;
                const text = (el.innerText || el.textContent || '').trim();
                if (text.length > 10 && text.length < 1000) {
                    // 检查是否包含选项标记或答题控件
                    if (/[A-Fa-f][\.、\)\s]/.test(text) || hasAnswerControls(el)) {
                        const cleanText = cleanQuestionText(text);
                        if (cleanText.trim().length > 5) {
                            processedElements.add(el);
                            questions.push({
                                index: questions.length + 1,
                                rawText: text,
                                cleanText: cleanText,
                                element: el,
                                options: extractOptions(el)
                            });
                        }
                    }
                }
            });
        }

        return questions;
    }

    function cleanQuestionText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/^\d+[\.、\)\s]*/, '')
            .replace(/^[一二三四五六七八九十][\.、\s]*/, '')
            .replace(/^第\d+\s*题[\s：:]*/, '')
            .trim();
    }

    function extractOptions(element) {
        const options = [];
        
        // 方法1: 查找包含选项文本的元素
        const optPattern = /^[A-Fa-f][\.、\)\s]/;
        const children = element.querySelectorAll('*');
        
        children.forEach(child => {
            const text = child.textContent.trim();
            if (optPattern.test(text) && text.length < 200) {
                options.push({ letter: text.charAt(0).toUpperCase(), text, element: child });
            }
        });
        
        // 方法2: 如果上面没找到，查找单选/复选框
        if (options.length === 0) {
            const inputs = element.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            inputs.forEach(input => {
                // 查找附近的标签文本
                let label = input.closest('label');
                if (!label) {
                    const id = input.getAttribute('id');
                    if (id) label = element.querySelector(`label[for="${id}"]`);
                }
                
                let letter = null;
                let text = '';
                
                if (label) {
                    text = label.textContent.trim();
                    const match = text.match(/^([A-Fa-f])/);
                    if (match) letter = match[1].toUpperCase();
                } else {
                    // 检查value或附近文本
                    const parent = input.parentElement;
                    if (parent) {
                        text = parent.textContent.trim();
                        const match = text.match(/^([A-Fa-f])/);
                        if (match) letter = match[1].toUpperCase();
                    }
                }
                
                if (!letter) {
                    // 如果找不到字母，尝试按顺序分配
                    letter = String.fromCharCode(65 + options.length);
                }
                
                options.push({ 
                    letter: letter, 
                    text: text, 
                    element: input,
                    isInput: true
                });
            });
        }
        
        return options;
    }

    // ==================== 智能填写答案 ====================
    function fillAnswer(questionEl, answer) {
        // 尝试找到输入框
        const selectors = [
            'input[type="text"]',
            'input[type="input"]',
            'input:not([type])',
            'textarea',
            '[contenteditable="true"]',
            '[role="textbox"]',
            '.answer-input',
            '#answer',
            'input[type="number"]'
        ];

        let input = null;

        // 先在题目区域内找
        for (const s of selectors) {
            input = questionEl.querySelector(s);
            if (input) break;
        }

        // 如果区域内没有，在附近找
        if (!input) {
            const parent = questionEl.closest('[class*="question"], [class*="item"], li') || questionEl.parentElement;
            if (parent) {
                for (const s of selectors) {
                    input = parent.querySelector(s);
                    if (input) break;
                }
            }
        }

        if (input) {
            // 使用原生方式设值（兼容Vue/React）
            setNativeInputValue(input, answer);
            addLog('已填写答案到输入框', 'success');
            return true;
        }

        // 如果是选择题，点击选项
        // 支持多种格式：单个字母(A)、多个字母(AD、A D、A,B,C、A B C)
        const cleanAnswer = answer.trim().toUpperCase();
        
        // 检测是否为多选题答案（包含多个字母）
        const multiMatch = cleanAnswer.match(/[A-F](?:[,\s][A-F])*/g);
        if (multiMatch && multiMatch.length > 0) {
            // 提取所有字母
            const letters = cleanAnswer.replace(/[^A-F]/g, '');
            if (letters.length > 0) {
                let success = false;
                for (const letter of letters) {
                    if (clickOption(questionEl, letter)) {
                        success = true;
                    }
                }
                if (success) return true;
            }
        }
        
        // 检测判断题答案（正确/错误、对/错）
        if (cleanAnswer.includes('正确') || cleanAnswer.includes('对') || cleanAnswer === 'TRUE') {
            return clickOption(questionEl, 'A'); // 判断题A通常是"对"
        }
        if (cleanAnswer.includes('错误') || cleanAnswer.includes('错') || cleanAnswer === 'FALSE') {
            return clickOption(questionEl, 'B'); // 判断题B通常是"错"
        }
        
        // 单个字母选项
        if (/^[A-F]$/.test(cleanAnswer)) {
            return clickOption(questionEl, cleanAnswer);
        }

        return false;
    }

    function setNativeInputValue(el, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, value);

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
        el.blur();

        // 兼容React Fiber
        const reactKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (reactKey) {
            const fiber = el[reactKey];
            if (fiber && fiber.memoizedProps && fiber.memoizedProps.onChange) {
                fiber.memoizedProps.onChange({ target: el });
            }
        }
    }

    function clickOption(questionEl, letter) {
        letter = letter.toUpperCase();
        
        // 方法1: 使用extractOptions找到的选项
        const qData = state.questionsList?.find(q => q.element === questionEl);
        if (qData && qData.options) {
            const opt = qData.options.find(o => o.letter === letter);
            if (opt) {
                if (opt.isInput && opt.element) {
                    // 是input元素，直接勾选
                    if (!opt.element.checked) {
                        opt.element.checked = true;
                        opt.element.dispatchEvent(new Event('change', { bubbles: true }));
                        opt.element.dispatchEvent(new Event('input', { bubbles: true }));
                        addLog(`已选择选项 ${letter}`, 'success');
                        return true;
                    }
                } else if (opt.element) {
                    // 点击元素
                    opt.element.click();
                    addLog(`已选择选项 ${letter}`, 'success');
                    return true;
                }
            }
        }
        
        // 方法2: 在题目区域内直接搜索
        const textPatterns = [
            new RegExp(`^${letter}[\\.、\\)\\s]`, 'i'),
            new RegExp(`^${letter}$`, 'i')
        ];
        
        const allChildren = questionEl.querySelectorAll('*');
        for (const child of allChildren) {
            const text = child.textContent.trim();
            for (const pattern of textPatterns) {
                if (pattern.test(text)) {
                    child.click();
                    addLog(`已选择选项 ${letter}`, 'success');
                    return true;
                }
            }
        }
        
        // 方法3: 查找单选/复选框，按顺序点击
        const inputs = questionEl.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        const index = letter.charCodeAt(0) - 65; // A=0, B=1, etc.
        if (inputs[index]) {
            if (!inputs[index].checked) {
                inputs[index].checked = true;
                inputs[index].dispatchEvent(new Event('change', { bubbles: true }));
                inputs[index].dispatchEvent(new Event('input', { bubbles: true }));
                addLog(`已选择选项 ${letter}`, 'success');
                return true;
            }
            return true;
        }
        
        // 方法4: 查找label元素，按文本匹配
        const labels = questionEl.querySelectorAll('label');
        for (const label of labels) {
            const text = label.textContent.trim();
            if (new RegExp(`^${letter}[\\.、\\)\\s]`, 'i').test(text)) {
                label.click();
                addLog(`已选择选项 ${letter}`, 'success');
                return true;
            }
        }
        
        addLog(`未找到选项 ${letter}`, 'warn');
        return false;
    }

    // ==================== 智能下一题切换 ====================
    function clickNextButton() {
        const nextPatterns = [
            // 文本匹配 - 优先找明确的下一题按钮
            { selector: 'button, a, input[type="button"]', texts: ['下一题', '下一页', 'Next', '下一道', '继续'] },
            // 类名匹配
            { selector: '[class*="next"]:not([class*="submit"]):not([class*="finish"])', texts: [] },
            // ID匹配
            { selector: '[id*="next"]:not([id*="submit"]):not([id*="finish"])', texts: [] }
            // 移除提交按钮作为备选，避免误触提交
        ];

        for (const pattern of nextPatterns) {
            const btns = document.querySelectorAll(pattern.selector);
            for (const btn of btns) {
                const text = btn.textContent.trim() || btn.value || '';
                const isVisible = btn.offsetParent !== null &&
                                  getComputedStyle(btn).display !== 'none' &&
                                  getComputedStyle(btn).visibility !== 'hidden';

                if (!isVisible) continue;

                // 检查是否是禁用状态
                if (btn.disabled || btn.hasAttribute('disabled')) continue;

                // 检查文本是否匹配
                if (pattern.texts.length > 0) {
                    const matched = pattern.texts.some(t => text.includes(t));
                    if (matched) {
                        btn.click();
                        addLog(`已点击"${text}"按钮`, 'success');
                        return true;
                    }
                } else {
                    // 无文本要求时，点击第一个可见元素
                    btn.click();
                    addLog('已点击下一题按钮', 'success');
                    return true;
                }
            }
        }

        // 尝试键盘操作
        simulateKeyPress('ArrowRight');
        addLog('尝试使用方向键切换', 'warn');
        return false;
    }

    function simulateKeyPress(key) {
        const event = new KeyboardEvent('keydown', {
            key: key,
            code: key === 'Enter' ? 'Enter' : (key === 'ArrowRight' ? 'ArrowRight' : ''),
            keyCode: key === 'Enter' ? 13 : (key === 'ArrowRight' ? 39 : 0),
            bubbles: true
        });
        document.activeElement.dispatchEvent(event);
    }

    // ==================== 主控制流程 ====================
async function startAutoAnswer() {
        if (!state.selectedAPIId) {
            showToast('请先选择并启用API', 'error');
            return;
        }

        const api = AI_MODELS[state.selectedAPIId];
        if (!api.enabled || !api.apiKey) {
            showToast('当前API未配置或未启用', 'error');
            return;
        }

        // 双API模式检查
        if (state.settings.enableDualAPI) {
            const secondApi = AI_MODELS[state.settings.secondAPIId];
            if (!secondApi || !secondApi.enabled || !secondApi.apiKey) {
                showToast('双API模式需要配置第二个可用的API', 'error');
                return;
            }
            if (state.selectedAPIId === state.settings.secondAPIId) {
                showToast('两个API不能相同', 'error');
                return;
            }
        }

        // 确定题目区域 - 直接使用整个页面
        const area = document.body;

        state.isRunning = true;
        state.shouldStop = false;

        // 根据答题起始模式初始化
        const startMode = state.settings.startMode;
        if (startMode === 'beginning') {
            state.answeredCount = 0;
            state.lastProcessedIndex = 0;
            addLog('从头开始答题...', 'info');
        } else if (startMode === 'continue') {
            addLog(`从第 ${state.lastProcessedIndex + 1} 题继续...`, 'info');
        }
        // unanswered 模式不需要特殊初始化，会在遍历中处理

        showStatus('正在识别题目...', 'running');

        try {
            // 识别所有题目（刷新页面后需要重新检测）
            const questions = detectQuestions(area);
            state.questionsList = questions; // 缓存题目列表
            state.totalQuestions = questions.length;

            if (state.totalQuestions === 0) {
                throw new Error('未能识别到任何题目，请手动选择题目区域');
            }

            updateProgress(state.lastProcessedIndex, state.totalQuestions);
            addLog(`共识别到 ${state.totalQuestions} 道题目`, 'info');
            
            if (startMode === 'beginning') {
                showToast(`识别到 ${state.totalQuestions} 道题目`, 'success');
            }

            // 确定起始索引
            let startIndex = 0;
            if (startMode === 'beginning') {
                startIndex = 0;
            } else if (startMode === 'continue') {
                startIndex = state.lastProcessedIndex;
            } else if (startMode === 'unanswered') {
                // 从没做的开始，找到第一个未作答的题目
                startIndex = findFirstUnansweredIndex(questions);
                addLog(`从没做的开始，从第 ${startIndex + 1} 题开始...`, 'info');
            }

            // 逐题处理
            for (let i = startIndex; i < questions.length; i++) {
                if (state.shouldStop) {
                    addLog('用户停止了自动答题', 'warn');
                    state.lastProcessedIndex = i; // 保存当前进度
                    break;
                }

                const q = questions[i];
                
                // 题目类型筛选
                const qType = detectQuestionType(q);
                if (!isQuestionTypeAllowed(qType)) {
                    addLog(`第 ${i + 1} 题: 类型 "${qType}" 不在筛选列表中，跳过`, 'info');
                    continue;
                }

                // unanswered 模式：跳过已作答的题目
                if (startMode === 'unanswered' && isQuestionAnswered(q)) {
                    addLog(`第 ${i + 1} 题: 已作答，跳过`, 'info');
                    continue;
                }

                state.currentIndex = i + 1;
                updateProgress(i + 1, questions.length);
                showStatus(`正在处理第 ${i + 1}/${questions.length} 题...`, 'running');

                // 滚动到当前题目位置
                q.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await sleep(500); // 等待滚动完成

                // 处理已作答的题目
                // 参考README.md的 ignore_click 逻辑：已答的题目直接跳过，不点击
                if (isQuestionAnswered(q)) {
                    const answeredInfo = getAnsweredInfo(q);
                    // 关键：不要清空用户已选，不要重选！
                    // 已答的题目直接跳过，避免覆盖用户已选答案
                    addLog(`第 ${i + 1} 题: 已作答（${answeredInfo.display}），跳过避免覆盖`, 'info');
                    state.lastProcessedIndex = i + 1;
                    continue;
                }

                // 根据模式处理题目
                if (state.settings.enableDualAPI) {
                    await processWithDualAPI(q);
                } else {
                    await processSingleQuestion(q);
                }

                // 更新进度
                state.lastProcessedIndex = i + 1;

                // 延迟后进入下一题
                if (state.settings.autoNext && i < questions.length - 1) {
                    await sleep(state.settings.delayTime);
                    clickNextButton();
                    await sleep(800); // 等待页面更新
                }
            }

            // 检查是否是正常完成还是中途停止
            if (!state.shouldStop) {
                showStatus(`完成！共处理 ${state.answeredCount} 题`, 'success');
                showToast(`答题完成！已保存 ${state.answeredCount} 道答案`, 'success');
                state.lastProcessedIndex = 0; // 重置进度
            } else {
                showStatus(`已暂停，已处理 ${state.answeredCount} 题`, 'idle');
                showToast(`已暂停，当前进度: 第 ${state.lastProcessedIndex}/${state.totalQuestions} 题`, 'info');
            }
            addLog(`全部完成，成功 ${state.answeredCount}/${questions.length}`, 'success');

        } catch (err) {
            console.error('[AnswerAssistant]', err);
            showStatus(`出错: ${err.message}`, 'error');
            showToast(err.message, 'error');
            addLog(`错误: ${err.message}`, 'error');
        } finally {
            state.isRunning = false;
        }
    }

    // ==================== 辅助函数：清空已选答案 ====================
    function clearQuestionAnswer(q) {
        const el = q.element;
        if (!el) return;

        // 取消选中单选按钮
        const radioInputs = el.querySelectorAll('input[type="radio"]');
        radioInputs.forEach(input => {
            if (input.checked) {
                input.checked = false;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // 取消选中复选框
        const checkboxInputs = el.querySelectorAll('input[type="checkbox"]');
        checkboxInputs.forEach(input => {
            if (input.checked) {
                input.checked = false;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // 清除文本输入框
        const textInputs = el.querySelectorAll('input[type="text"], textarea');
        textInputs.forEach(input => {
            setNativeInputValue(input, '');
        });

        // 清除带.selected/.checked类的元素
        const selected = el.querySelectorAll('.selected, .checked, .active');
        selected.forEach(s => s.classList.remove('selected', 'checked', 'active'));
    }

    // ==================== 辅助函数：规范化答案 ====================
    function normalizeAnswer(answer) {
        if (!answer) return '';
        return String(answer)
            .toUpperCase()
            .replace(/[^A-F]/g, '')
            .split('')
            .sort()
            .join('');
    }

    // ==================== 辅助函数：获取AI对题目的答案（不写入） ====================
    async function getAnswerForQuestion(q) {
        // 生成更可靠的缓存键：使用题目索引 + 文本哈希
        const cacheKey = `q${q.index}_${hashString(q.cleanText)}`;

        // 检查缓存 - 对于图片题目，不使用缓存
        if (!q.isImageQuestion && state.settings.useCache && q.cleanText.trim().length > 10 && state.questionCache.has(cacheKey)) {
            return state.questionCache.get(cacheKey);
        }

        let finalPrompt = q.cleanText;
        let images = [];

        // 如果是图片题目，提取图片
        if (q.isImageQuestion) {
            try {
                images = await extractImagesFromElement(q.element);
                if (images.length === 0) return null;
                finalPrompt = '[图片题目] 请识别图片中的题目和选项，给出正确答案（只需输出选项字母，如A、B、C、D）';
            } catch (e) {
                return null;
            }
        }

        // 自动搜题
        if (!q.isImageQuestion && state.settings.autoSearch && q.cleanText.trim().length > 10) {
            try {
                const searchResult = await searchQuestion(q.cleanText);
                if (searchResult) {
                    finalPrompt += `\n\n【搜索到的参考信息】：\n${searchResult}`;
                }
            } catch(searchErr) {}
        }

        // 对于文本题目，检查文本长度
        if (!q.isImageQuestion && q.cleanText.trim().length < 10) {
            return null;
        }

        // 调用AI（与processSingleQuestion保持一致）
        try {
            const answer = await callAI(finalPrompt, images);
            if (!answer) return null;

            // 缓存答案（图片题目不缓存）
            if (!q.isImageQuestion && state.settings.useCache) {
                state.questionCache.set(cacheKey, answer);
            }

            return answer;
        } catch (err) {
            console.error('[AnswerAssistant] AI调用失败:', err);
            return null;
        }
    }

    // ==================== 题库查询（融合自README.md的tikuAdapter） ====================
    // 多题库并行查询：按tikuList顺序依次请求，**任意一个**返回有效答案就停
    // 返回 { source: '题库名', allAnswer: [...] } 或 null
    // 日志：通过 addLog 体现每个题库的查询结果
    async function queryTiku(questionText, optionsArr, qType) {
        const list = Array.isArray(state.settings.tikuList) ? state.settings.tikuList : [];
        // 过滤出启用的题库
        const enabled = list.filter(t => t && t.enabled && t.url && t.url.trim() && !t.url.includes('undefined'));
        if (enabled.length === 0) {
            return null;  // 未配置任何可用题库
        }

        const tasks = enabled.map(t => querySingleTiku(t, questionText, optionsArr, qType));
        // 并行跑所有题库（5s超时由querySingleTiku内部处理）
        const results = await Promise.all(tasks);

        // 找到第一个有有效答案的
        for (let i = 0; i < results.length; i++) {
            const r = results[i];
            if (r && r.allAnswer && Array.isArray(r.allAnswer) && r.allAnswer.length > 0) {
                return r;
            }
        }
        return null;
    }

    // 单个题库请求（带超时、错误处理、5秒兜底）
    function querySingleTiku(tiku, questionText, optionsArr, qType) {
        const fullUrl = tiku.url + (tiku.url.includes('?') ? '&' : '?') + 'wannengDisable=1';
        return new Promise(resolve => {
            let resolved = false;
            const finish = (val) => {
                if (!resolved) { resolved = true; resolve(val); }
            };
            const timer = setTimeout(() => finish(null), 5000);
            try {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: fullUrl,
                    headers: { 'Content-Type': 'application/json;charset=utf-8' },
                    data: JSON.stringify({
                        question: questionText,
                        options: optionsArr || [],
                        type: qType || ''
                    }),
                    onload: function(r) {
                        clearTimeout(timer);
                        try {
                            const res = JSON.parse(r.responseText);
                            if (res && res.answer && Array.isArray(res.answer.allAnswer) && res.answer.allAnswer.length > 0) {
                                finish({ source: tiku.name || '题库', allAnswer: res.answer.allAnswer });
                            } else {
                                finish(null);
                            }
                        } catch (e) {
                            finish(null);
                        }
                    },
                    onerror: function() {
                        clearTimeout(timer);
                        finish(null);
                    }
                });
            } catch (e) {
                clearTimeout(timer);
                finish(null);
            }
        });
    }

    // 从题库返回的 allAnswer 中提取标准化答案字符串
    // allAnswer 可能是 ['A'] 或 [['A','B']] 或 ['答案文字']
    function extractAnswerFromTiku(allAnswer) {
        if (!Array.isArray(allAnswer) || allAnswer.length === 0) return '';

        const first = allAnswer[0];
        if (Array.isArray(first)) {
            // 复合格式：[['A','B']] -> 'AB'
            return first.map(x => String(x || '').trim()).filter(Boolean).join('');
        }
        return String(first || '').trim();
    }

    async function processSingleQuestion(q) {
        // 生成更可靠的缓存键：使用题目索引 + 文本哈希
        const cacheKey = `q${q.index}_${hashString(q.cleanText)}`;

        // 检查缓存 - 对于图片题目，不使用缓存（因为图片可能不同）
        if (!q.isImageQuestion && state.settings.useCache && q.cleanText.trim().length > 10 && state.questionCache.has(cacheKey)) {
            const cached = state.questionCache.get(cacheKey);
            addLog(`第 ${q.index} 题: 使用缓存答案`, 'info');
            fillAnswer(q.element, cached);
            state.answeredCount++;
            showPreview(q.cleanText, cached);
            return;
        }

        let finalPrompt = q.cleanText;
        let images = [];

        // 如果是图片题目，提取图片
        if (q.isImageQuestion) {
            addLog(`第 ${q.index} 题: 检测到图片题目，正在提取图片...`, 'info');
            try {
                images = await extractImagesFromElement(q.element);
                if (images.length === 0) {
                    addLog(`第 ${q.index} 题: 未能提取到图片`, 'warn');
                    return;
                }
                finalPrompt = '[图片题目] 请识别图片中的题目和选项，给出正确答案（只需输出选项字母，如A、B、C、D）';
            } catch (e) {
                addLog(`第 ${q.index} 题: 图片提取失败: ${e.message}`, 'error');
                return;
            }
        }

        // 自动搜题 - 只有文本不为空时才搜索（图片题目不搜索）
        if (!q.isImageQuestion && state.settings.autoSearch && q.cleanText.trim().length > 10) {
            try {
                const searchResult = await searchQuestion(q.cleanText);
                if (searchResult) {
                    finalPrompt += `\n\n【搜索到的参考信息】：\n${searchResult}`;
                }
            } catch(searchErr) {
                addLog(`搜索失败: ${searchErr.message}`, 'warn');
            }
        }

        // 对于文本题目，检查文本长度
        if (!q.isImageQuestion && q.cleanText.trim().length < 10) {
            addLog(`第 ${q.index} 题: 题目文本过短，跳过`, 'warn');
            return;
        }

        // ==================== 题库优先（融合自README.md的tikuAdapter） ====================
        // 流程：题库查 -> 有答案 -> 是否复查（开关）-> 写答案
        //              -> 无答案 -> 走AI
        let tikuAnswer = '';
        let tikuSource = '';
        const enabledTikus = Array.isArray(state.settings.tikuList) ? state.settings.tikuList.filter(t => t.enabled) : [];
        if (!q.isImageQuestion && state.settings.tikuEnabled && enabledTikus.length > 0) {
            // 打印查询开始日志：列出启用的题库
            const tikuNames = enabledTikus.map(t => t.name || '题库').join(' / ');
            addLog(`第 ${q.index} 题: 查询题库（${tikuNames}）...`, 'info');
            try {
                const tikuResult = await queryTiku(q.cleanText, q.options || [], q.type || '');
                if (tikuResult && tikuResult.allAnswer) {
                    tikuAnswer = extractAnswerFromTiku(tikuResult.allAnswer);
                    tikuSource = tikuResult.source || '题库';
                    if (tikuAnswer) {
                        addLog(`第 ${q.index} 题: 题库【${tikuSource}】命中 → ${tikuAnswer}`, 'success');
                    } else {
                        addLog(`第 ${q.index} 题: 题库【${tikuSource}】返回了空答案`, 'warn');
                    }
                } else {
                    addLog(`第 ${q.index} 题: 所有题库均未命中答案（已查询 ${enabledTikus.length} 个）`, 'warn');
                }
            } catch (tikuErr) {
                addLog(`第 ${q.index} 题: 题库查询异常: ${tikuErr.message || tikuErr}`, 'warn');
                tikuAnswer = '';
            }
        } else if (state.settings.tikuEnabled) {
            // 题库总开关开了但没有启用的题库
            addLog(`第 ${q.index} 题: 未配置题库（请在设置中添加）`, 'info');
        }

        // 情况A：题库有答案 & 用户未开启"AI复查" -> 直接用题库答案，不调用AI（**节省API**）
        if (tikuAnswer && !state.settings.tikuRevalidate) {
            if (state.settings.useCache) {
                state.questionCache.set(cacheKey, tikuAnswer);
            }
            addLog(`第 ${q.index} 题: [题库] ${tikuAnswer}（来源：${tikuSource}）`, 'success');
            fillAnswer(q.element, tikuAnswer);
            state.answeredCount++;
            showPreview(q.cleanText || '[图片题目]', tikuAnswer);
            return;
        }

        // 情况B：题库有答案 & 用户开启"AI复查" -> AI再确认一次
        // 把题库答案作为参考，让AI决定是否覆盖
        let tikuprompt = finalPrompt;
        if (tikuAnswer) {
            addLog(`第 ${q.index} 题: [题库${tikuAnswer}→AI复查] 开始调用API核对...`, 'info');
            tikuprompt += `\n\n【题库参考答案】：${tikuAnswer}（来源：${tikuSource}。如果确认正确则沿用，否则给出新答案）`;
        } else {
            addLog(`第 ${q.index} 题: 调用 AI...`, 'info');
        }

        try {
            // 调用AI - 支持图片参数
            const answer = await callAI(tikuprompt, images);

            // 缓存答案（图片题目不缓存）
            if (!q.isImageQuestion && state.settings.useCache) {
                state.questionCache.set(cacheKey, answer);
            }

            // 情况B时，把"题库+AI"都展示出来
            const logPrefix = tikuAnswer ? `[题库${tikuAnswer}→AI${answer === tikuAnswer ? '一致' : '纠正'}] ` : '[AI] ';
            addLog(`第 ${q.index} 题: ${logPrefix}${answer}`, 'success');
            fillAnswer(q.element, answer);
            state.answeredCount++;

            showPreview(q.cleanText || '[图片题目]', answer);

        } catch(aiErr) {
            addLog(`第 ${q.index} 题 AI调用失败: ${aiErr.message}`, 'error');
            // AI失败但题库有答案：兜底用题库答案
            if (tikuAnswer) {
                addLog(`第 ${q.index} 题: 兜底使用题库答案 ${tikuAnswer}`, 'info');
                if (state.settings.useCache) {
                    state.questionCache.set(cacheKey, tikuAnswer);
                }
                fillAnswer(q.element, tikuAnswer);
                state.answeredCount++;
                showPreview(q.cleanText || '[图片题目]', tikuAnswer);
            }
        }
    }

    // 简单的字符串哈希函数
    function hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    function stopAutoAnswer() {
        state.shouldStop = true;
        showStatus('正在停止...', 'running');
    }

    function updateProgress(current, total) {
        const pct = Math.round((current / total) * 100);
        const fill = document.getElementById('progress-fill');
        const info = document.getElementById('progress-info');
        if (fill) fill.style.width = `${pct}%`;
        if (info) info.textContent = `${current} / ${total} (${pct}%)`;
    }

    function showPreview(question, answer) {
        const preview = document.getElementById('question-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="preview-q"><strong>题目：</strong>${question}</div>
                <div class="preview-a"><strong>答案：</strong>${answer}</div>
            `;
            preview.style.display = 'block';
        }
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ==================== API 校验 ====================
async function validateAPI(apiId) {
    const api = AI_MODELS[apiId];
    if (!api.apiKey) return { ok: false, msg: '请先输入API Key' };

    const badge = document.getElementById(`badge-${apiId}`);
    if (badge) {
        badge.className = 'api-badge badge-checking';
        badge.textContent = '检测中...';
    }

    try {
        // 使用临时状态进行验证，不影响全局状态
        const originalAPIId = state.selectedAPIId;
        state.selectedAPIId = apiId;
        
        // 发送简单测试请求
        const testPrompt = '回复OK';
        await callAI(testPrompt);

        // 恢复原状态
        state.selectedAPIId = originalAPIId;

        if (badge) {
            badge.className = 'api-badge badge-ready';
            badge.textContent = '可用';
        }
        addLog(`${api.name} 连接验证成功`, 'success');
        return { ok: true, msg: '连接正常' };
    } catch(err) {
        if (badge) {
            badge.className = 'api-badge badge-empty';
            badge.textContent = '无效';
        }
        addLog(`${api.name} 验证失败: ${err.message}`, 'error');
        return { ok: false, msg: err.message };
    }
}

    // ==================== UI 渲染与交互 ====================
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'answer-assistant-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">
                    <div class="panel-icon">AI</div>
                    智能答题助手 Pro
                </h3>
                <div class="panel-actions">
                    <button class="icon-btn" id="btn-min" title="最小化">−</button>
                    <button class="icon-btn" id="btn-close" title="关闭">×</button>
                </div>
            </div>

            <div class="tab-nav">
                <button class="tab-item active" data-tab="main">控制台</button>
                <button class="tab-item" data-tab="apis">API 配置</button>
                <button class="tab-item" data-tab="settings">设置</button>
                <button class="tab-item" data-tab="logs">日志</button>
            </div>

            <div class="panel-body">

                <!-- 控制台 -->
                <div class="tab-pane active" id="pane-main">
                    <div class="status-bar status-idle" id="status-bar">
                        <div class="status-dot"></div>就绪 - 请配置API后开始
                    </div>

                    <div class="form-field">
                        <label class="field-label">当前使用的 API</label>
                        <select class="field-select" id="sel-api">
                            <option value="">-- 请选择 --</option>
                        </select>
                    </div>

                    <div class="progress-wrap">
                        <div class="progress-info" id="progress-info">0 / 0 (0%)</div>
                        <div class="progress-track">
                            <div class="progress-fill" id="progress-fill" style="width:0%"></div>
                        </div>
                    </div>

                    <div class="btn-row">
                        <button class="btn btn-primary btn-block" id="btn-start">开始自动答题</button>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-success" id="btn-single" style="flex:1">答当前题</button>
                        <button class="btn btn-danger" id="btn-stop" style="flex:1;display:none">停止</button>
                    </div>
                    <div class="btn-row">
                        <button class="btn btn-warning btn-block" id="btn-save">保存答案</button>
                    </div>

                    <div class="question-preview" id="question-preview" style="display:none"></div>
                </div>

                <!-- API配置 -->
                <div class="tab-pane" id="pane-apis">
                    <div id="api-list-container"></div>
                </div>

                <!-- 设置 -->
                <div class="tab-pane" id="pane-settings">
                    <div style="margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">答题选项</div>

                    <div class="setting-item">
                        <span class="setting-label">启用自动搜题</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-search" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">搜索引擎</span>
                        <select class="field-select" id="set-engine" style="width:140px;padding:7px 10px;">
                            <option value="bing">Bing (推荐)</option>
                            <option value="google">Google</option>
                            <option value="baidu">百度</option>
                        </select>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">自动填写答案</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-fill" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">自动进入下一题</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-next" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">题目间延迟 (毫秒)</span>
                        <input type="number" class="field-input" id="set-delay"
                               value="1500" min="500" max="8000" step="100" style="width:100px;text-align:right;">
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">启用答案缓存</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-cache" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div style="margin-top:25px;margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">免费题库（参考README.md的tikuAdapter）</div>

                    <div class="setting-item">
                        <span class="setting-label">题库优先（节省API）</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-tiku-enabled" checked>
                            <span class="toggle-slider"></span>
                        </label>
                        <span style="font-size:12px;color:#666">题库有答案时直接使用，<b style="color:#16a34a">不调用AI</b></span>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">题库有答案时AI再查一遍</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-tiku-revalidate">
                            <span class="toggle-slider"></span>
                        </label>
                        <span style="font-size:12px;color:#666">开启后题库有答案也会调AI复查（更准但更费API）</span>
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">题库列表（可启用多个、互不冲突）</span>
                        <div id="tiku-list" style="width:100%;display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;"></div>
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">添加新题库</span>
                        <div style="display:flex;gap:6px;width:100%;">
                            <input type="text" class="field-input" id="input-tiku-name"
                                   placeholder="题库名称（选填）" style="flex:1;">
                            <input type="text" class="field-input" id="input-tiku-url"
                                   placeholder="接口URL（必填）" style="flex:2;">
                            <button class="btn btn-outline" id="btn-add-tiku" style="padding:6px 12px;font-size:13px;">添加</button>
                        </div>
                        <span style="font-size:12px;color:#666;margin-top:6px;">
                            协议：POST {question, options, type} → {answer:{allAnswer:[]}}；
                            兼容README.md中的tikuAdapter格式（自动附加wannengDisable=1参数）
                        </span>
                    </div>

                    <div style="margin-top:25px;margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">高级选项</div>

                    <div class="setting-item">
                        <span class="setting-label">答题起始位置</span>
                        <div style="display:flex;flex-direction:column;gap:5px;margin-left:20px;">
                            <label class="radio-label">
                                <input type="radio" name="start-mode" value="beginning" checked>
                                <span>从头开始</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="start-mode" value="unanswered">
                                <span>从没做的开始</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="start-mode" value="continue">
                                <span>继续上次进度</span>
                            </label>
                        </div>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">启用双API对比</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-dual-api">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" id="dual-api-settings" style="display:none;padding-left:20px;">
                        <span class="setting-label">第二个API</span>
                        <select class="field-select" id="sel-second-api" style="width:140px;padding:7px 10px;">
                            <option value="">-- 请选择 --</option>
                        </select>
                    </div>

                    <div style="margin-top:25px;margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">题目类型筛选</div>
                    <div class="setting-item">
                        <div style="display:flex;flex-wrap:wrap;gap:10px;">
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="all" checked>
                                <span>全部</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="单选题">
                                <span>单选题</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="多选题">
                                <span>多选题</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="判断题">
                                <span>判断题</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="填空题">
                                <span>填空题</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="简答题">
                                <span>简答题</span>
                            </label>
                            <label class="type-label">
                                <input type="checkbox" class="type-checkbox" value="计算题">
                                <span>计算题</span>
                            </label>
                        </div>
                    </div>

                    <div style="margin-top:25px;margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">网站白名单</div>

                    <div class="setting-item">
                        <span class="setting-label">启用网站白名单</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="set-whitelist" checked>
                            <span class="toggle-slider"></span>
                        </label>
                        <span style="font-size:12px;color:#666">仅在学习网站显示</span>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label">当前网站</span>
                        <span style="font-size:13px;color:#333;background:#f3f4f6;padding:4px 8px;border-radius:4px;">
                            <span id="current-host">--</span>
                        </span>
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">自定义网站列表</span>
                        <div style="display:flex;gap:8px;width:100%;">
                            <input type="text" class="field-input" id="input-add-domain" 
                                   placeholder="输入域名，如 example.com" style="flex:1;">
                            <button class="btn btn-outline" id="btn-add-domain" style="padding:6px 12px;font-size:13px;">添加</button>
                        </div>
                        <div id="custom-domains-list" style="margin-top:10px;max-height:150px;overflow-y:auto;"></div>
                    </div>

                    <div style="margin-top:25px;margin-bottom:20px;font-size:15px;font-weight:700;color:#111827">自定义 API 配置</div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">API 名称</span>
                        <input type="text" class="field-input" id="custom-api-name" 
                               placeholder="如：我的自定义 API" style="width:100%;">
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">Base URL</span>
                        <input type="text" class="field-input" id="custom-api-baseurl" 
                               placeholder="https://api.example.com/v1/chat/completions" style="width:100%;">
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">API Key</span>
                        <input type="password" class="field-input" id="custom-api-key" 
                               placeholder="sk-..." style="width:100%;">
                    </div>

                    <div class="setting-item" style="flex-direction:column;align-items:flex-start;">
                        <span class="setting-label" style="margin-bottom:8px;">模型列表</span>
                        <textarea class="field-input" id="custom-api-models" rows="3"
                                  placeholder="每行一个模型，如：&#10;model-name-1&#10;model-name-2" style="width:100%;font-family:monospace;white-space:pre;overflow-x:auto;"></textarea>
                    </div>

                    <div class="btn-row" style="margin-top:10px;">
                        <button class="btn btn-outline" id="btn-add-custom-api" style="flex:1">添加/更新自定义 API</button>
                        <button class="btn btn-outline" id="btn-edit-custom-api" style="flex:1;margin-left:8px;">编辑自定义 API</button>
                    </div>

                    <div class="btn-row" style="margin-top:25px;">
                        <button class="btn btn-primary btn-block" id="btn-save-settings">保存设置</button>
                    </div>
                </div>

                <!-- 日志 -->
                <div class="tab-pane" id="pane-logs">
                    <div class="log-area" id="log-container">
                        <div class="log-line"><span class="log-ts">[--:--:--]</span><span class="log-msg-info">系统初始化完成 v5.0.0</span></div>
                    </div>
                    <div class="btn-row" style="margin-top:14px">
                        <button class="btn btn-outline btn-block" id="btn-clear-log">清空日志</button>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(panel);

        // 使面板可拖拽
        makeDraggable(panel.querySelector('.panel-header'), panel);

        renderAPIList();
        bindEvents();
        loadSettingsToUI();
    }

    function renderAPIList() {
        const container = document.getElementById('api-list-container');
        const select = document.getElementById('sel-api');
        
        if (!container || !select) {
            console.error('API列表容器未找到');
            return;
        }
        
        container.innerHTML = '';
        select.innerHTML = '<option value="">-- 请选择 --</option>';

        for (const [id, api] of Object.entries(AI_MODELS)) {
            const hasKey = !!api.apiKey;
            const isSelected = state.selectedAPIId === id;

            const card = document.createElement('div');
            card.className = `api-card ${isSelected ? 'selected' : ''}`;
            card.id = `card-${id}`;
            
            // 创建头部
            const header = document.createElement('div');
            header.className = 'api-card-header';
            
            // 构建头部内容，包含删除按钮（仅自定义 API 显示）
            let headerContent = `
                <span class="api-name">${api.name}</span>
                <span class="api-badge ${hasKey ? 'badge-ready' : 'badge-empty'}" id="badge-${id}">
                    ${hasKey ? '已配置' : '未配置'}
                </span>
            `;
            
            // 仅自定义 API 显示删除按钮
            if (api.isCustom) {
                headerContent += `
                    <button class="btn btn-delete" id="btn-delete-${id}" title="删除此 API">
                        ×
                    </button>
                `;
            }
            
            header.innerHTML = headerContent;
            
            // 使用 addEventListener 绑定点击事件
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                const body = document.getElementById(`body-${id}`);
                if (body) {
                    body.classList.toggle('show');
                    card.classList.toggle('selected');
                }
            });
            
            // 创建内容体
            const body = document.createElement('div');
            body.className = `api-body ${isSelected ? 'show' : ''}`;
            body.id = `body-${id}`;
            
            // 创建表单元素
            const formContent = document.createElement('div');
            formContent.innerHTML = `
                <div class="form-field">
                    <label class="field-label">API Key</label>
                    <input class="field-input" type="password" id="key-${id}"
                           placeholder="${getPlaceholder(id)}" value="${api.apiKey}">
                </div>
                ${api.needsToken ? `
                <div class="form-field">
                    <label class="field-label">Secret Key</label>
                    <input class="field-input" type="password" id="secret-${id}"
                           placeholder="百度 Secret Key" value="${api.secretKey || ''}">
                </div>` : ''}
                <div class="form-field">
                    <label class="field-label">模型</label>
                    <select class="field-select" id="model-${id}">
                        ${api.models.map(m =>
                            `<option value="${m}" ${(api.model||api.defaultModel)===m?'selected':''}>${m}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="btn-row">
                    <button class="btn btn-outline" id="btn-validate-${id}" style="flex:1">校验并启用</button>
                </div>
            `;
            
            body.appendChild(formContent);
            
            card.appendChild(header);
            card.appendChild(body);
            container.appendChild(card);

            // 绑定校验按钮事件
            const validateBtn = document.getElementById(`btn-validate-${id}`);
            if (validateBtn) {
                validateBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    validateAndSave(id);
                });
            }

            // 绑定删除按钮事件（仅自定义 API）
            if (api.isCustom) {
                const deleteBtn = document.getElementById(`btn-delete-${id}`);
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (confirm(`确定要删除 "${api.name}" 吗？此操作无法撤销。`)) {
                            delete AI_MODELS[id];
                            saveAllConfig();
                            renderAPIList();
                            showToast(`已删除 "${api.name}"`, 'success');
                            addLog(`删除自定义 API: ${api.name}`, 'info');
                        }
                    });
                }
            }

            if (hasKey || api.enabled) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.text = api.name;
                if (isSelected) opt.selected = true;
                select.appendChild(opt);
            }
        }
    }

    function getPlaceholder(apiId) {
        const ph = {
            openai: 'sk-...',
            anthropic: 'sk-ant-...',
            baidu: '百度 API Key',
            aliyun: 'sk-...',
            moonshot: 'sk-...',
            zhipu: '...',
            deepseek: 'sk-...',
            minimax: '...'
        };
        if (apiId.startsWith('custom_')) {
            return '自定义 API Key';
        }
        return ph[apiId] || '输入密钥...';
    }

    function bindEvents() {
        // 标签切换
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`pane-${tab.dataset.tab}`).classList.add('active');
                
                // 如果切换到设置页面，刷新第二个API下拉列表
                if (tab.dataset.tab === 'settings') {
                    populateSecondAPIDropdown();
                }
            });
        });

        // 最小化/关闭
        document.getElementById('btn-min').addEventListener('click', () => {
            const body = document.querySelector('.panel-body');
            const nav = document.querySelector('.tab-nav');
            body.style.display = body.style.display === 'none' ? '' : 'none';
            nav.style.display = nav.style.display === 'none' ? '' : 'none';
        });

        document.getElementById('btn-close').addEventListener('click', () => {
            document.getElementById('answer-assistant-panel').style.display = 'none';
        });

        // 主控按钮
        document.getElementById('btn-start').addEventListener('click', () => {
            saveAllConfig();
            startAutoAnswer();
        });

        document.getElementById('btn-stop').addEventListener('click', stopAutoAnswer);

        document.getElementById('btn-single').addEventListener('click', async () => {
            saveAllConfig();
            // 单题答题逻辑 - 直接识别整个页面
            const questions = detectQuestions(document.body);
            if (questions.length > 0) {
                await processSingleQuestion(questions[0]);
            } else {
                showToast('未检测到题目', 'error');
            }
        });

        document.getElementById('btn-save').addEventListener('click', () => {
            saveAllConfig();
            showToast('答案已保存（本地存储）', 'success');
            addLog('用户手动触发保存', 'info');
        });

        document.getElementById('btn-save-settings').addEventListener('click', () => {
            saveAllConfig();
            showToast('设置已保存', 'success');
            addLog('设置已保存', 'info');
        });

        // 添加题库
        document.getElementById('btn-add-tiku')?.addEventListener('click', () => {
            addTiku();
        });

        // 添加自定义域名
        document.getElementById('btn-add-domain')?.addEventListener('click', () => {
            const input = document.getElementById('input-add-domain');
            const domain = input.value?.trim();
            if (!domain) {
                showToast('请输入域名', 'error');
                return;
            }
            if (state.settings.customWhitelist.includes(domain)) {
                showToast('域名已存在', 'error');
                return;
            }
            state.settings.customWhitelist.push(domain);
            input.value = '';
            renderCustomDomainsList();
            saveAllConfig();
            showToast('已添加域名', 'success');
        });
        
        // 回车键添加域名
        document.getElementById('input-add-domain')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-add-domain')?.click();
            }
        });

        // 添加自定义 API
        document.getElementById('btn-add-custom-api')?.addEventListener('click', () => {
            const name = document.getElementById('custom-api-name')?.value?.trim();
            const baseURL = document.getElementById('custom-api-baseurl')?.value?.trim();
            const apiKey = document.getElementById('custom-api-key')?.value?.trim();
            const modelsText = document.getElementById('custom-api-models')?.value?.trim();

            if (!name || !baseURL || !apiKey || !modelsText) {
                showToast('请填写完整的自定义 API 信息', 'error');
                return;
            }

            const models = modelsText.split('\n').map(m => m.trim()).filter(m => m);
            if (models.length === 0) {
                showToast('请至少添加一个模型', 'error');
                return;
            }

            // 生成唯一 ID
            const customId = 'custom_' + Date.now();

            // 添加到 AI_MODELS
            AI_MODELS[customId] = {
                name: name,
                baseURL: baseURL,
                models: models,
                defaultModel: models[0],
                apiKey: apiKey,
                enabled: true,
                isCustom: true
            };

            // 清空输入框
            document.getElementById('custom-api-name').value = '';
            document.getElementById('custom-api-baseurl').value = '';
            document.getElementById('custom-api-key').value = '';
            document.getElementById('custom-api-models').value = '';

            // 重新渲染 API 列表
            renderAPIList();
            saveAllConfig();

            showToast(`自定义 API "${name}" 已添加`, 'success');
            addLog(`添加自定义 API: ${name}`, 'info');
        });

        // 编辑自定义 API
        document.getElementById('btn-edit-custom-api')?.addEventListener('click', () => {
            // 获取所有自定义 API
            const customAPIs = Object.entries(AI_MODELS)
                .filter(([id, api]) => api.isCustom)
                .map(([id, api]) => ({ id, ...api }));

            if (customAPIs.length === 0) {
                showToast('暂无自定义 API，请先添加', 'info');
                return;
            }

            // 显示选择列表
            const options = customAPIs.map(api => 
                `<option value="${api.id}">${api.name} (${api.baseURL})</option>`
            ).join('');

            const html = `
                <div style="padding:15px;">
                    <div class="form-field">
                        <label class="field-label">选择要编辑的自定义 API</label>
                        <select class="field-select" id="edit-custom-select">
                            ${options}
                        </select>
                    </div>
                </div>
            `;

            if (confirm('选择要编辑的自定义 API，点击确定后填充信息到输入框。')) {
                const select = document.createElement('select');
                select.innerHTML = options;
                const selectedId = select.options[0]?.value;
                
                if (selectedId && AI_MODELS[selectedId]) {
                    const api = AI_MODELS[selectedId];
                    document.getElementById('custom-api-name').value = api.name;
                    document.getElementById('custom-api-baseurl').value = api.baseURL;
                    document.getElementById('custom-api-key').value = api.apiKey;
                    document.getElementById('custom-api-models').value = api.models.join('\n');
                    
                    // 删除旧的，让用户重新添加
                    delete AI_MODELS[selectedId];
                    renderAPIList();
                    saveAllConfig();
                    
                    showToast('已填充信息，请修改后点击"添加/更新"', 'info');
                }
            }
        });

        document.getElementById('btn-clear-log').addEventListener('click', () => {
            const lc = document.getElementById('log-container');
            if (lc) lc.innerHTML = '';
            state.logs = [];
        });

        // API选择变更
        document.getElementById('sel-api').addEventListener('change', (e) => {
            state.selectedAPIId = e.target.value || null;
            saveAllConfig();
            // 更新第二个API下拉列表（排除当前选中的API）
            populateSecondAPIDropdown();
        });

        // 双API开关
        document.getElementById('set-dual-api')?.addEventListener('change', () => {
            updateDualAPISettings();
            // 刷新第二个API下拉列表
            populateSecondAPIDropdown();
        });

        // 题目类型全选逻辑
        document.querySelector('.type-checkbox[value="all"]')?.addEventListener('change', (e) => {
            const allChecked = e.target.checked;
            document.querySelectorAll('.type-checkbox').forEach(cb => {
                cb.checked = allChecked;
            });
        });

        // 单个题目类型选择（取消全选）
        document.querySelectorAll('.type-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.value !== 'all' && !e.target.checked) {
                    const allCheckbox = document.querySelector('.type-checkbox[value="all"]');
                    if (allCheckbox) allCheckbox.checked = false;
                }
            });
        });

        // 运行状态时显示停止按钮
        const observer = new MutationObserver(() => {
            const running = state.isRunning;
            document.getElementById('btn-start').style.display = running ? 'none' : '';
            document.getElementById('btn-stop').style.display = running ? '' : 'none';
        });
        observer.observe(document.getElementById('status-bar'), { attributes: true, attributeFilter: ['class'] });

        // 注册菜单
        GM_registerMenuCommand('显示/隐藏面板', () => {
            const p = document.getElementById('answer-assistant-panel');
            if (p) p.style.display = p.style.display === 'none' ? '' : 'none';
        });
    }

    function loadSettingsToUI() {
        if (document.getElementById('set-search'))
            document.getElementById('set-search').checked = state.settings.autoSearch;
        if (document.getElementById('set-engine'))
            document.getElementById('set-engine').value = state.settings.searchEngine;
        if (document.getElementById('set-fill'))
            document.getElementById('set-fill').checked = state.settings.autoFill;
        if (document.getElementById('set-next'))
            document.getElementById('set-next').checked = state.settings.autoNext;
        if (document.getElementById('set-delay'))
            document.getElementById('set-delay').value = state.settings.delayTime;
        if (document.getElementById('set-cache'))
            document.getElementById('set-cache').checked = state.settings.useCache;
        // 题库相关（融合自README.md的tikuAdapter）
        if (document.getElementById('set-tiku-enabled'))
            document.getElementById('set-tiku-enabled').checked = state.settings.tikuEnabled !== false;
        if (document.getElementById('set-tiku-revalidate'))
            document.getElementById('set-tiku-revalidate').checked = !!state.settings.tikuRevalidate;
        // 渲染题库列表
        renderTikuList();
        
        // 加载答题起始模式设置
        const startMode = state.settings.startMode || 'beginning';
        const startModeRadio = document.querySelector(`input[name="start-mode"][value="${startMode}"]`);
        if (startModeRadio) {
            startModeRadio.checked = true;
        }
        
        if (document.getElementById('set-dual-api'))
            document.getElementById('set-dual-api').checked = state.settings.enableDualAPI;
        if (document.getElementById('sel-second-api'))
            document.getElementById('sel-second-api').value = state.settings.secondAPIId || '';
        
        // 加载题目类型选择
        const typeCheckboxes = document.querySelectorAll('.type-checkbox');
        typeCheckboxes.forEach(cb => {
            cb.checked = state.settings.questionTypes.includes(cb.value);
        });
        
        // 加载网站白名单设置
        if (document.getElementById('set-whitelist'))
            document.getElementById('set-whitelist').checked = state.settings.enableWhitelist;
        
        // 显示当前网站域名
        if (document.getElementById('current-host'))
            document.getElementById('current-host').textContent = window.location.hostname;
        
        // 更新自定义域名列表
        renderCustomDomainsList();
        
        // 更新双API设置的显示状态
        updateDualAPISettings();
        
        // 更新第二个API下拉列表
        populateSecondAPIDropdown();
    }

    function renderCustomDomainsList() {
        const container = document.getElementById('custom-domains-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (state.settings.customWhitelist.length === 0) {
            container.innerHTML = '<div style="color:#999;font-size:12px;">暂无自定义域名</div>';
            return;
        }
        
        state.settings.customWhitelist.forEach((domain, index) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'space-between';
            item.style.padding = '4px 8px';
            item.style.background = '#f3f4f6';
            item.style.borderRadius = '4px';
            item.style.marginBottom = '4px';
            item.innerHTML = `
                <span style="font-size:13px;color:#333;">${domain}</span>
                <button class="btn btn-outline" style="padding:2px 8px;font-size:12px;" 
                        onclick="removeCustomDomain(${index})">删除</button>
            `;
            container.appendChild(item);
        });
    }

    function removeCustomDomain(index) {
        state.settings.customWhitelist.splice(index, 1);
        renderCustomDomainsList();
        saveAllConfig();
        showToast('已删除域名', 'info');
    }

    // ==================== 题库列表管理（融合自README.md的tikuAdapter） ====================
    // tikuList 结构：[{id, name, url, enabled}]
    // 多个题库可同时启用：依次查询，**任意一个**查到答案就停止（按列表顺序）
    function renderTikuList() {
        const container = document.getElementById('tiku-list');
        if (!container) return;
        container.innerHTML = '';

        if (!Array.isArray(state.settings.tikuList) || state.settings.tikuList.length === 0) {
            container.innerHTML = '<div style="color:#999;font-size:12px;padding:8px;">暂无题库，请添加</div>';
            return;
        }

        state.settings.tikuList.forEach((tiku, index) => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f9fafb;border-radius:6px;gap:8px;';
            const safeName = (tiku.name || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
            const safeUrl = (tiku.url || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
            item.innerHTML = `
                <label class="toggle-switch" style="flex-shrink:0;">
                    <input type="checkbox" ${tiku.enabled ? 'checked' : ''} onchange="toggleTiku(${index}, this.checked)">
                    <span class="toggle-slider"></span>
                </label>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:13px;font-weight:600;color:#111827;">${safeName || '(未命名题库)'}</span>
                    <span style="font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${safeUrl}">${safeUrl}</span>
                </div>
                <button class="btn btn-outline" style="padding:2px 10px;font-size:12px;flex-shrink:0;" onclick="removeTiku(${index})">删除</button>
            `;
            container.appendChild(item);
        });
    }

    function addTiku() {
        const nameInput = document.getElementById('input-tiku-name');
        const urlInput = document.getElementById('input-tiku-url');
        if (!urlInput) return;
        const url = (urlInput.value || '').trim();
        const name = (nameInput?.value || '').trim() || ('题库' + (state.settings.tikuList.length + 1));
        if (!url) {
            showToast('请填写题库URL', 'error');
            return;
        }
        if (url.includes('undefined')) {
            showToast('URL包含"undefined"，请检查', 'error');
            return;
        }
        if (!Array.isArray(state.settings.tikuList)) state.settings.tikuList = [];
        // 简单去重
        if (state.settings.tikuList.some(t => t.url === url)) {
            showToast('该题库已存在', 'warn');
            return;
        }
        state.settings.tikuList.push({
            id: 'tiku_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: name,
            url: url,
            enabled: true
        });
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        renderTikuList();
        saveAllConfig();
        showToast('已添加题库：' + name, 'success');
    }

    function removeTiku(index) {
        if (!Array.isArray(state.settings.tikuList)) return;
        const tiku = state.settings.tikuList[index];
        if (!tiku) return;
        const name = tiku.name || '题库';
        state.settings.tikuList.splice(index, 1);
        renderTikuList();
        saveAllConfig();
        showToast('已删除题库：' + name, 'info');
    }

    function toggleTiku(index, enabled) {
        if (!Array.isArray(state.settings.tikuList)) return;
        const tiku = state.settings.tikuList[index];
        if (!tiku) return;
        tiku.enabled = !!enabled;
        saveAllConfig();
    }

    function populateSecondAPIDropdown() {
        const select = document.getElementById('sel-second-api');
        if (!select) return;
        
        // 清空现有选项
        select.innerHTML = '<option value="">-- 请选择 --</option>';
        
        // 添加已启用的API（排除当前选中的API）
        for (const [id, api] of Object.entries(AI_MODELS)) {
            if (api.enabled && api.apiKey && id !== state.selectedAPIId) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.text = api.name;
                select.appendChild(opt);
            }
        }
    }

    function updateDualAPISettings() {
        const dualApiEnabled = document.getElementById('set-dual-api')?.checked;
        const dualApiSettings = document.getElementById('dual-api-settings');
        
        if (dualApiSettings) {
            dualApiSettings.style.display = dualApiEnabled ? '' : 'none';
        }
    }

    function makeDraggable(header, panel) {
        let isDrag = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            isDrag = true;
            
            // 记录初始位置
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDrag) return;
            
            // 计算新位置
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = startLeft + dx;
            const newTop = startTop + dy;
            
            // 限制在可视区域内
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            const boundedLeft = Math.max(0, Math.min(newLeft, maxLeft));
            const boundedTop = Math.max(0, Math.min(newTop, maxTop));
            
            panel.style.left = `${boundedLeft}px`;
            panel.style.top = `${boundedTop}px`;
            panel.style.transform = 'none';
        });

        document.addEventListener('mouseup', () => isDrag = false);
    }

    // 全局函数供onclick调用
window.toggleApiBody = function(id) {
    const body = document.getElementById(`body-${id}`);
    if (!body) return;
    body.classList.toggle('show');
    
    // 更新卡片选中状态
    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.toggle('selected');
    }
};

    window.validateAndSave = async function(id) {
        // 获取输入元素
        const keyInput = document.getElementById(`key-${id}`);
        const secretInput = document.getElementById(`secret-${id}`);
        const modelSelect = document.getElementById(`model-${id}`);
        
        if (!keyInput) {
            showToast('配置元素未找到', 'error');
            return;
        }

        // 保存配置
        const api = AI_MODELS[id];
        api.apiKey = keyInput.value.trim();
        
        if (api.needsToken && secretInput) {
            api.secretKey = secretInput.value.trim();
        }
        
        if (modelSelect) {
            api.model = modelSelect.value;
        }
        
        api.enabled = true;
        state.selectedAPIId = id;

        // 校验
        const result = await validateAPI(id);
        if (result.ok) {
            showToast(`${api.name} 已启用`, 'success');
            renderAPIList(); // 刷新UI
        } else {
            showToast(`校验失败: ${result.msg}`, 'error');
            api.enabled = false;
        }

        saveAllConfig();
    };

    // ==================== 使用提示弹窗 ====================
    function showUsageNotice() {
        // 检查是否已设置为不再显示
        const hideNotice = GM_getValue('aa_hide_notice');
        if (hideNotice) return;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'aa-notice-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 9999999;
            display: flex; align-items: center; justify-content: center;
        `;

        // 创建弹窗内容
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; border-radius: 16px; width: 480px; max-width: 90vw;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden;
            animation: aaNoticeFadeIn 0.3s ease-out;
        `;

        // 头部
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            padding: 24px; text-align: center; color: white;
        `;
        header.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">使用须知</h2>
        `;

        // 内容
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 24px; color: #374151; line-height: 1.8; font-size: 14px;
        `;
        content.innerHTML = `
            <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 12px;">
                    <strong>完全免费公益</strong>：本脚本完全免费开源，若您是付费购买，请立即举报售卖者。
                </li>
                <li style="margin-bottom: 12px;">
                    <strong>正确率说明</strong>：截至2026年6月8日，大模型答题正确率约为80%左右，具体取决于题目类型和难度。
                </li>
                <li style="margin-bottom: 12px;">
                    <strong>API获取</strong>：请自行搜索各大AI平台的API获取方法，如OpenAI、智谱、阿里通义千问等。
                </li>
                <li>
                    <strong>使用声明</strong>：本脚本仅供学习参考使用，禁止用于商业盈利或恶意用途。
                </li>
            </ul>
        `;

        // 按钮区域
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            padding: 16px 24px 24px; display: flex; gap: 12px; justify-content: flex-end;
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '我已知悉';
        confirmBtn.style.cssText = `
            padding: 10px 24px; background: #2563eb; color: white; border: none;
            border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
            transition: background 0.2s;
        `;
        confirmBtn.onmouseover = () => confirmBtn.style.background = '#1d4ed8';
        confirmBtn.onmouseout = () => confirmBtn.style.background = '#2563eb';
        confirmBtn.onclick = () => {
            document.body.removeChild(overlay);
        };

        const hideBtn = document.createElement('button');
        hideBtn.textContent = '不再显示';
        hideBtn.style.cssText = `
            padding: 10px 24px; background: #f3f4f6; color: #4b5563; border: none;
            border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
            transition: background 0.2s;
        `;
        hideBtn.onmouseover = () => hideBtn.style.background = '#e5e7eb';
        hideBtn.onmouseout = () => hideBtn.style.background = '#f3f4f6';
        hideBtn.onclick = () => {
            GM_setValue('aa_hide_notice', true);
            document.body.removeChild(overlay);
        };

        buttons.appendChild(confirmBtn);
        buttons.appendChild(hideBtn);

        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(buttons);
        overlay.appendChild(dialog);

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes aaNoticeFadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);

        // 防止通过删除元素绕过
        const observer = new MutationObserver(() => {
            if (!document.getElementById('aa-notice-overlay')) {
                showUsageNotice();
            }
        });
        observer.observe(document.body, { childList: true, subtree: false });

        // 绑定按钮事件时保存引用，防止被移除
        confirmBtn._aa_notice_btn = true;
        hideBtn._aa_notice_btn = true;
    }

    // ==================== 初始化入口 ====================
    function init() {
        loadAllConfig();

        // 显示使用提示弹窗
        showUsageNotice();

        // 检查网站白名单
        if (!isWhitelisted()) {
            console.log('%c[智能答题助手Pro]%c 当前网站不在白名单中，已自动隐藏', 'color:#2563eb;font-weight:bold', 'color:#999');
            // 通过菜单命令允许用户临时显示
            GM_registerMenuCommand('显示答题助手（当前网站不在白名单）', () => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', createPanel);
                } else {
                    createPanel();
                }
                showToast('已临时显示（当前网站不在白名单）', 'info');
            });
            return;
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createPanel);
        } else {
            createPanel();
        }

        addLog('智能答题助手 Pro v5.0 启动完成', 'success');
        console.log('%c[智能答题助手Pro]%c v5.0.0 已加载 | 支持自动搜题+最新AI模型', 'color:#2563eb;font-weight:bold', 'color:#666');
    }

    init();

})();
