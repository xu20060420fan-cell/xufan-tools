// ==UserScript==
// @name         智能自动答题助手 Pro
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  全自动网课答题：支持多种AI模型、多题库融合、题目状态保护、图片题目识别
// @author       我
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

    // ==================== AI 模型配置（已剔除未发布的虚构模型） ====================
    const AI_MODELS = {
        openai: {
            name: 'OpenAI GPT',
            baseURL: 'https://api.openai.com/v1/chat/completions',
            models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'],
            defaultModel: 'gpt-4.1-mini',
            apiKey: '',
            enabled: false
        },
        anthropic: {
            name: 'Anthropic Claude',
            baseURL: 'https://api.anthropic.com/v1/messages',
            models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-haiku-20241022'],
            defaultModel: 'claude-sonnet-4-20250514',
            apiKey: '',
            enabled: false,
            isAnthropic: true
        },
        google: {
            name: 'Google Gemini',
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
            models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
            defaultModel: 'gemini-2.5-flash',
            apiKey: '',
            enabled: false,
            useApiKeyHeader: true
        },
        baidu: {
            name: '百度文心一言',
            baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
            models: ['ernie-4.5-turbo-128k', 'ernie-4.5-8k', 'ernie-4.0-turbo-8k', 'ernie-4.0-8k', 'ernie-speed-128k', 'ernie-lite-8k'],
            defaultModel: 'ernie-4.5-turbo-128k',
            apiKey: '',
            secretKey: '',
            enabled: false,
            needsToken: true
        },
        aliyun: {
            name: '阿里通义千问',
            baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            models: ['qwen3-max', 'qwen3-plus', 'qwen3-turbo', 'qwen3-235b-a22b', 'qwen3-30b-a3b', 'qwen-max', 'qwen-plus', 'qwen-turbo'],
            defaultModel: 'qwen-plus',
            apiKey: '',
            enabled: false
        },
        moonshot: {
            name: '月之暗面 Kimi',
            baseURL: 'https://api.moonshot.cn/v1/chat/completions',
            models: ['kimi-k2-0711-chat', 'moonshot-v1-32k', 'moonshot-v1-128k', 'moonshot-v1-8k'],
            defaultModel: 'moonshot-v1-32k',
            apiKey: '',
            enabled: false
        },
        zhipu: {
            name: '智谱 AI GLM',
            baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            models: ['glm-4.5', 'glm-4-plus', 'glm-4-flash', 'glm-4-long', 'glm-4-air', 'glm-4-flashx'],
            defaultModel: 'glm-4-flash',
            apiKey: '',
            enabled: false
        },
        deepseek: {
            name: '深度求索 DeepSeek',
            baseURL: 'https://api.deepseek.com/v1/chat/completions',
            models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3'],
            defaultModel: 'deepseek-chat',
            apiKey: '',
            enabled: false
        },
        minimax: {
            name: 'MiniMax',
            baseURL: 'https://api.minimaxi.com/v1/chat/completions',
            models: ['MiniMax-M3', 'MiniMax-M2', 'MiniMax-M1'],
            defaultModel: 'MiniMax-M3',
            apiKey: '',
            enabled: false
        },
        sensenova: {
            name: '商汤日日新',
            baseURL: 'https://token.sensenova.cn/v1/chat/completions',
            models: ['SenseChat-67B', 'SenseChat-Vision'],
            defaultModel: 'SenseChat-67B',
            apiKey: '',
            enabled: false
        },
        xiaomi: {
            name: '小米 MiMo',
            baseURL: 'https://api.xiaomimimo.com/v1/chat/completions',
            models: ['mimo-v1-chat'],
            defaultModel: 'mimo-v1-chat',
            apiKey: '',
            enabled: false,
            useApiKeyHeader: true
        },
        doubao: {
            name: '字节豆包',
            baseURL: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            models: ['Doubao-pro-128k', 'Doubao-pro-32k', 'Doubao-lite-32k', 'Doubao-pro-4k'],
            defaultModel: 'Doubao-pro-128k',
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

    // ==================== 内置学习网站白名单（参考 OCS 4.13.19 平台分类） ====================
    // 平台注册：name + 域名列表 + 该平台专用刷课选区器
    const PLATFORMS = [
        {
            id: 'chaoxing',
            name: '超星学习通',
            domains: [
                'chaoxing.com', 'edu.cn', 'org.cn', 'xueyinonline.com',
                'hnsyu.net', 'qutjxjy.cn', 'ynny.cn', 'hnvist.cn',
                'fjlecb.cn', 'gdhkmooc.com', 'cugbonline.cn', 'zjelib.cn',
                'cqrspx.cn', 'neauce.com', 'zhihui-yun.com', 'cqie.cn',
                'ccqmxx.com', 'jxgmxy.com', 'jnzyjsxy.cn', 'sslibrary.com',
                'mooc1.chaoxing.com', 'hw.smartstudy.com', 'passport2.chaoxing.com'
            ],
            // 任务点跳转/下一个：超星专用
            selectors: {
                nextBtn: '#rightNextBtn, .next, .nextChapter, .jb_btn[jb-type="right"], .ncells .currents ~ a',
                taskPoint: '.posCatalog_active, .tabtags, .clearfix.tabs .currents',
                videoContainer: '#iframe, .video, .ans-job-icon',
                quizContainer: '.xuexi .TiMu, .topic, .questionLi, .TiMu',
                // 超星内嵌视频题目
                videoQuizPanel: '.x-tiku_show, .x-fur-window, .popup',
                videoQuizOption: '.x-tiku_show .x-tiku-options input, .x-fur-window .fur-answer input',
                videoQuizSubmit: '.x-tiku_show .x-tiku-submit, .x-fur-window .fur-submit',
                // 超星人脸识别（老 + 新）
                faceOld: '#fcqrimg',
                faceNew: '.chapterVideoFaceMaskDiv',
                // 超星视频错误弹窗
                errorDialog: '.vjs-modal-dialog-content',
                // 任务点完成icon（绿色对勾）
                taskDoneIcon: '.ans-job-icon, .icon_Completed, .done',
                // 视频学习引导提示
                guideText: '请手动进入视频、作业、考试页面'
            }
        },
        {
            id: 'zhihuishu',
            name: '知到智慧树',
            domains: [
                'zhihuishu.com', 'hike-teaching-center.polymas.com',
                'onlineweb.zhihuishu.com', 'studyvideoh5.zhihuishu.com',
                'studyplush5.zhihuishu.com', 'fusioncourseh5.zhihuishu.com',
                'studywisdomh5.zhihuishu.com'
            ],
            selectors: {
                nextBtn: '.next_button, .topic-switch, .next-section, .right-btn',
                taskPoint: '.clearfix.task-list, .chapter-content .item',
                videoContainer: 'video, .video-box, #video-box',
                quizContainer: '.subject_describe, .questionContent, .topic-item',
                videoQuizPanel: '.topic-item, .dialog-topic',
                videoQuizOption: '.topic-item .option input, .topic-item .topic-option',
                videoQuizSubmit: '.topic-item .btn-submit, .dialog-topic .btn-submit',
                faceOld: '',
                faceNew: '',
                errorDialog: '.vjs-modal-dialog-content, .el-message-box',
                taskDoneIcon: '.icon-finish, .finish',
                guideText: '⚠️ 智慧树倍速最高1.5x，1-2倍才安全'
            }
        },
        {
            id: 'icve',
            name: '智慧职教',
            domains: [
                'icve.com.cn', 'ai.icve.com.cn', 'course.icve.com.cn',
                'courshare.cn', 'webtrn.cn', 'user.icve.com.cn', 'mooc.icve.com.cn'
            ],
            selectors: {
                nextBtn: '.next, .next-chapter, .btn-next',
                taskPoint: '.tabsel.seled, .h_cells a',
                videoContainer: 'video, .docBox',
                quizContainer: '.exam-question, .TiMu',
                videoQuizPanel: '',
                videoQuizOption: '',
                videoQuizSubmit: '',
                faceOld: '',
                faceNew: '',
                errorDialog: '.vjs-modal-dialog-content',
                taskDoneIcon: '.icon-finish',
                guideText: '智慧职教：点击课程目录里任意章节进入'
            }
        },
        {
            id: 'zjy',
            name: '职教云',
            domains: ['icve.com.cn', 'zjy2.icve.com.cn', 'zyk.icve.com.cn'],
            selectors: {
                nextBtn: '.next, .courseware-next, .btn-next',
                taskPoint: '.classroom_activities .active_list, .catalog_list li',
                videoContainer: 'video, .docBox',
                quizContainer: '.test-question, .TiMu',
                videoQuizPanel: '',
                videoQuizOption: '',
                videoQuizSubmit: '',
                faceOld: '',
                faceNew: '',
                errorDialog: '.vjs-modal-dialog-content',
                taskDoneIcon: '.finish, .icon-ok',
                guideText: '职教云：进入课程后点任意章节，脚本自动跑'
            }
        },
        {
            id: 'mooc163',
            name: '中国大学MOOC',
            domains: ['icourse163.org'],
            selectors: {
                nextBtn: '.next, .j-next, .nextUnit, .j-up',
                taskPoint: '.chapter-item, .j-listItem, .u-line-1',
                videoContainer: 'video, .j-media',
                quizContainer: '.u-questionItem, .j-problemContent',
                videoQuizPanel: '.u-questionItem',
                videoQuizOption: '.u-questionItem input[type=radio], .u-questionItem input[type=checkbox]',
                videoQuizSubmit: '.u-questionItem .j-submit, .u-questionItem .submitBtn',
                faceOld: '',
                faceNew: '',
                errorDialog: '.vjs-modal-dialog-content, .m-popup',
                taskDoneIcon: '.j-finishIcon, .icon-finish',
                guideText: 'MOOC：进入课程任意章节即可'
            }
        },
        {
            id: 'yuketang',
            name: '雨课堂',
            domains: ['yuketang.cn'],
            selectors: {
                nextBtn: '.next-section, .right-btn, .leaf-list .leaf-detail',
                taskPoint: '.leaf-detail, .chapter-list .leaf',
                videoContainer: '#video-box, video',
                quizContainer: '.problem-content, .question',
                videoQuizPanel: '.digital-human-video-element-selector, video',
                videoQuizOption: '',
                videoQuizSubmit: '',
                faceOld: '',
                faceNew: '',
                errorDialog: '.el-message-box, .vjs-modal-dialog-content',
                taskDoneIcon: '.finish-icon, .j-finishIcon',
                guideText: '雨课堂：进入课程点任意小节'
            }
        },
        {
            id: 'ucampus',
            name: 'U校园',
            domains: ['u-campus.cn', 'www.ucampus.unipus.cn', 'ucampus.unipus.cn'],
            selectors: {
                nextBtn: '.next, .next-unit, .arrow-right',
                taskPoint: '.unit-list, .task-list',
                videoContainer: 'video, .video-content',
                quizContainer: '.question, .test-item',
                videoQuizPanel: '',
                videoQuizOption: '',
                videoQuizSubmit: '',
                faceOld: '',
                faceNew: '',
                errorDialog: '',
                taskDoneIcon: '.icon-finish',
                guideText: 'U校园：进入课程目录点击单元'
            }
        },
        {
            id: 'xuetangx',
            name: '学堂在线',
            domains: ['xuetangx.com', 'www.xuetangx.com'],
            selectors: {
                nextBtn: '.xt_video_player_next, .next',
                taskPoint: '.seq_nav .seq_contents li',
                videoContainer: 'video, #xt_video_player',
                quizContainer: '.problem, .problem_content',
                videoQuizPanel: '',
                videoQuizOption: '',
                videoQuizSubmit: '',
                faceOld: '',
                faceNew: '',
                errorDialog: '.vjs-modal-dialog-content',
                taskDoneIcon: '.finished, .xt_finished',
                guideText: '学堂在线：进入课程点任意小节'
            }
        }
    ];

    // 扁平化白名单 = 所有平台的 domain 并集 + 一些其他通用域
    const DEFAULT_WHITELIST = [
        ...new Set(PLATFORMS.flatMap(p => p.domains)),
        // 通用站点
        'study.163.com',     // 网易云课堂
        'open.163.com',      // 网易公开课
        'coursera.org', 'www.coursera.org',  // Coursera
        'edx.org', 'www.edx.org',            // edX
        'www.icourse6.net',  // 爱课程
        'ke.qq.com',         // 腾讯课堂
        'classcentral.com'   // Class Central
    ];

    /**
     * 检测当前网站属于哪个平台
     * @returns {object|null} 平台对象 或 null（不在白名单）
     */
    function detectPlatform() {
        const host = (location.hostname || '').toLowerCase();
        for (const p of PLATFORMS) {
            for (const d of p.domains) {
                if (host === d || host.endsWith('.' + d)) {
                    return p;
                }
            }
        }
        // 不在任何已知平台
        return null;
    }

    // isWhitelisted() 的完整版本在下方（包含 state.settings 检查 + 自定义白名单）
    // 此处只保留 detectPlatform() 即可

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
            tikuRevalidate: false,   // 题库有答案时，AI是否再复查一次
            // ==================== 刷课相关（融合自OCS网课助手） ====================
            // 参考OCS功能独立实现，不依赖OCS脚本本身
            studyEnabled: false,     // 总开关：是否启用刷课
            studyRate: 1.5,          // 视频倍速（1.0~16.0）
            studyVolume: 0,          // 视频音量（0~1）
            studyAntiPause: true,    // 反鼠标检测：鼠标离开视频不暂停
            studyAutoUnpause: true,  // 自动解除暂停：检测到暂停就播放
            studyAutoNext: true,     // 自动跳转：当前任务点完成后跳到下一个
            studyLoop: true,         // 自动连播：视频结束后自动连播下一个
            studyAutoCloseDialog: true, // 自动关弹窗：检测到弹窗（习惯分/确认）自动关闭
            studyHandleVideoQuiz: true, // 自动做视频内嵌题目（学习通视频里弹出的选择题）
            studyAutoStartOnLoad: false, // 进入学习页面时自动启动刷课
            // ==================== 新增：读章节 + 讨论（参考 OCS 4.13.19） ====================
            studyReadTask: true,         // 自动读章节（PPT/书籍/长时阅读）
            readSpeed: 1,                // 翻页速度（秒/页）1~10
            studyAutoDiscuss: true,      // 讨论自动回复
            studyDiscussMode: 'random'   // 讨论模式: random/first/lastest/max-show-up/max-fav
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
        // 刷课相关（融合自OCS网课助手）
        state.settings.studyEnabled = document.getElementById('set-study-enabled')?.checked ?? false;
        const rateEl = document.getElementById('set-study-rate');
        const volEl = document.getElementById('set-study-volume');
        if (rateEl) state.settings.studyRate = Math.max(0.25, Math.min(16, parseFloat(rateEl.value) || 1.5));
        if (volEl) state.settings.studyVolume = Math.max(0, Math.min(1, parseFloat(volEl.value) || 0));
        state.settings.studyAntiPause = document.getElementById('set-study-anti-pause')?.checked ?? true;
        state.settings.studyAutoUnpause = document.getElementById('set-study-auto-unpause')?.checked ?? true;
        state.settings.studyAutoNext = document.getElementById('set-study-auto-next')?.checked ?? true;
        state.settings.studyLoop = document.getElementById('set-study-loop')?.checked ?? true;
        state.settings.studyAutoCloseDialog = document.getElementById('set-study-close-dialog')?.checked ?? true;
        state.settings.studyHandleVideoQuiz = document.getElementById('set-study-handle-quiz')?.checked ?? true;
        state.settings.studyAutoStartOnLoad = document.getElementById('set-study-autostart')?.checked ?? false;
        state.settings.studyReadTask = document.getElementById('set-study-read')?.checked ?? true;
        state.settings.studyAutoDiscuss = document.getElementById('set-study-discuss')?.checked ?? true;
        state.settings.studyDiscussMode = document.getElementById('set-study-discuss-mode')?.value || 'random';
        state.settings.readSpeed = parseFloat(document.getElementById('set-read-speed')?.value) || 1;
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
            'input[type="number"]',
            '.edui-body',           // 超星 UEditor 富文本（新版可能用 .edui-body）
            '.edui-body iframe'     // 超星 UEditor 用 iframe 嵌入
        ];

        // === 填空题/简答题处理（参考 OCS completion + 万能脚本 fillBlank）===
        // 1) UEditor 富文本（超星作业/考试常见）
        //    找 ueditor 实例 → getEditor(name).setContent(answer) → 触发 save
        // 2) 普通 textarea
        //    setNativeInputValue
        // 3) contenteditable 富文本
        //    设 innerText + dispatch input 事件
        // 4) 多个空（填空题有 N 个空）
        //    用 #分隔符拆分，分别填到每个空

        // 4.1) UEditor 处理
        try {
            // 找 UEditor 的 editorId（textarea 的 name 或 id 是 "answerEditor" 之类）
            const ueTextarea = questionEl.querySelector('textarea[name^="answerEditor"]');
            if (ueTextarea && typeof window.UE !== 'undefined' && window.UE.getEditor) {
                const editorId = ueTextarea.getAttribute('name') || ueTextarea.id;
                try {
                    const editor = window.UE.getEditor(editorId);
                    if (editor && editor.setContent) {
                        // 拆 answer：支持 ===/###/| 等多空分隔
                        const parts = String(answer).split(/\s*(?:===|###|\||;|；|@@|##)\s*/);
                        const finalAnswer = parts.join('<br/>');  // 多个空用 <br/> 分隔
                        editor.setContent(finalAnswer);
                        editor.fire && editor.fire("contentchange");
                        // 超星作业/考试要求点"保存"按钮（save_answerEditorId）
                        const saveBtn = document.querySelector(`#save_${editorId.replace('answerEditor', '')}`);
                        if (saveBtn) saveBtn.click();
                        addLog(`已填写 UEditor 富文本（多空用<br/>分隔）`, 'success');
                        return true;
                    }
                } catch (ueErr) {
                    addLog(`UEditor 写入失败: ${ueErr.message}`, 'warn');
                }
            }
        } catch (e) {}

        // 4.2) contenteditable 富文本
        const ce = questionEl.querySelector('[contenteditable="true"]');
        if (ce) {
            try {
                // 拆 answer 支持多空
                const parts = String(answer).split(/\s*(?:===|###|\||;|；|@@|##)\s*/);
                ce.innerHTML = parts.map(p => `<p>${p}</p>`).join('');
                ce.dispatchEvent(new Event('input', { bubbles: true }));
                ce.dispatchEvent(new Event('change', { bubbles: true }));
                addLog(`已填写 contenteditable（多空用<p>分隔）`, 'success');
                return true;
            } catch (e) {
                addLog(`contenteditable 写入失败: ${e.message}`, 'warn');
            }
        }

        // 4.3) 普通 input/textarea（填空题多个空）
        const allInputs = questionEl.querySelectorAll('input[type="text"], input[type="input"], input:not([type]), textarea, .answer-input, #answer, input[type="number"]');
        if (allInputs.length > 1) {
            // 多个空：用 # 拆 answer
            const parts = String(answer).split(/\s*(?:===|###|\||;|；|@@|##|#)\s*/);
            let success = 0;
            for (let i = 0; i < allInputs.length; i++) {
                const val = parts[i] !== undefined ? parts[i] : (parts[0] || '');
                if (val) {
                    setNativeInputValue(allInputs[i], val);
                    success++;
                }
            }
            if (success > 0) {
                addLog(`已填写 ${success} 个填空`, 'success');
                return true;
            }
        }

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

        // === 关键修复：先判断题目类型 ===
        // 1. 判断题特征：2 个 input[type=radio]（不是 > 2 个，所以不是单选/多选）
        // 2. 在判断题里，"A" 这个单字母答案**不是 A 选项**，而是答案"对"（因为 A 选项文本可能是"对"）
        // 3. 必须用 findJudgementOption 找**真正含"对/错"的那个 radio**，不能用 clickOption('A')
        const isJudgementQuestion = (() => {
            const radios = questionEl.querySelectorAll('input[type="radio"]');
            return radios.length === 2;  // 正好 2 个 radio = 判断题
        })();

        // === 判断题处理（参考 OCS judgement + 万能脚本 isTrue/isFalse）===
        // 万能脚本：isTrue / isFalse 正则判语义，再按 data.options 索引
        // OCS：correctWords / incorrectWords 数组匹配，遍历选项文本
        // 关键：单字母 "A"/"B" 在判断题里**不能直接 clickOption('A')**，
        //      因为判断题的 A 选项文本可能是"对"或"错"，不一定是 A
        function isJudgementTrue(str) { return /(^|,)(正确|是|对|√|T|ri|true|A)(,|$)/i.test(String(str)); }
        function isJudgementFalse(str) { return /(^|,)(错误|否|错|×|F|不是|wr|false|B)(,|$)/i.test(String(str)); }

        if (isJudgementQuestion) {
            const answerIsTrue = isJudgementTrue(cleanAnswer);
            const answerIsFalse = isJudgementFalse(cleanAnswer);
            if (answerIsTrue || answerIsFalse) {
                const targetIsTrue = answerIsTrue;
                const foundOption = findJudgementOption(questionEl, targetIsTrue);
                if (foundOption) {
                    try {
                        if (foundOption.isInput) {
                            if (!foundOption.element.checked) {
                                foundOption.element.checked = true;
                            }
                            foundOption.element.dispatchEvent(new Event('change', { bubbles: true }));
                            foundOption.element.dispatchEvent(new Event('input', { bubbles: true }));
                            // 某些平台用 click() 触发 Vue 监听器，再 click 一次
                            try { foundOption.element.click(); } catch (e) {}
                        } else {
                            foundOption.element.click();
                        }
                        addLog(`已选判断题"${targetIsTrue ? '对' : '错'}"（找到元素）`, 'success');
                        return true;
                    } catch (e) {
                        addLog(`判断题 click 异常: ${e.message}`, 'error');
                    }
                }
                // 兜底：硬编码 A=对/B=错
                addLog('判断题兜底：A=对/B=错', 'warn');
                return clickOption(questionEl, targetIsTrue ? 'A' : 'B');
            }
        }

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
        
        // 检测判断题答案（正确/错误、对/错）- 参考 OCS + 万能脚本的语义匹配逻辑
        // 核心：不硬编码 A=对/B=错，而是读取选项实际文本，用 isTrue/isFalse 正则判语义
        function isJudgementTrue(str) { return /(^|,)(正确|是|对|√|T|ri|true)(,|$)/i.test(String(str)); }
        function isJudgementFalse(str) { return /(^|,)(错误|否|错|×|F|不是|wr|false)(,|$)/i.test(String(str)); }

        const answerIsTrue = isJudgementTrue(cleanAnswer);
        const answerIsFalse = isJudgementFalse(cleanAnswer);

        if (answerIsTrue || answerIsFalse) {
            const targetIsTrue = answerIsTrue;

            // === 判断题专用填充逻辑（参考 OCS judgement + 万能脚本 isTrue/isFalse）===
            // 核心思路：不依赖 extractOptions（它找的"以A开头"的外层容器在
            // 新版超星上 click 会触发整块选中，不精确），而是直接找包含"对/错"
            // 文本的最小 label/li/span，并按 DOM 顺序定位到具体的 radio input。
            //
            // 万能脚本：options 配置为 input[type=radio]，按 data.options 索引 click
            // OCS：options 配置为 .subject_node .nodeLab，遍历文本匹配 correctWords/incorrectWords
            // 新版超星判断题 DOM 通常是：
            //   <ul><li><input type=radio><span>对</span></li><li><input type=radio><span>错</span></li></ul>
            //   或 <div><label><input type=radio><span class="nodeLab">对</span></label>...</div>

            const foundOption = findJudgementOption(questionEl, targetIsTrue);
            if (foundOption) {
                try {
                    if (foundOption.isInput) {
                        // radio/checkbox input
                        if (!foundOption.element.checked) {
                            foundOption.element.checked = true;
                        }
                        foundOption.element.dispatchEvent(new Event('change', { bubbles: true }));
                        foundOption.element.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        // label/li/div - 触发整块 click
                        foundOption.element.click();
                    }
                    addLog(`已选判断题"${targetIsTrue ? '对' : '错'}"（找到元素）`, 'success');
                    return true;
                } catch (e) {
                    addLog(`判断题 click 异常: ${e.message}`, 'error');
                }
            }

            // 兜底：硬编码 A=对/B=错
            addLog('判断题兜底：A=对/B=错', 'warn');
            return clickOption(questionEl, targetIsTrue ? 'A' : 'B');
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

    // ==================== 判断题专用查找函数 ====================
    // 参考 OCS 万能脚本的判断题处理：
    //   1) 遍历所有可点击选项元素（label/li/span/nodeLab）
    //   2) 找"文本含对/错且自身不含子选项"的最小容器
    //   3) 优先返回元素内部的 input（更精确），其次返回容器本身
    // 这样能避免 click 整个外层 li 触发"整块选中"导致选错
    function findJudgementOption(questionEl, targetIsTrue) {
        const targetWords = targetIsTrue
            ? ['对', '正确', '√', '是']
            : ['错', '错误', '×', '否', '不是'];

        // 1) 优先从 questionEl 下找所有 input[type=radio]，按 DOM 顺序
        //    通过"包含该 input 的最小文本容器"判断每个 radio 是"对"还是"错"
        const radios = Array.from(questionEl.querySelectorAll('input[type="radio"]'));
        if (radios.length === 2) {
            for (let i = 0; i < radios.length; i++) {
                const radio = radios[i];
                // 找 radio 关联的"最小文本容器"（label > li > 最近的父级）
                let container = radio.closest('label');
                if (!container) {
                    let p = radio.parentElement;
                    while (p && p !== questionEl) {
                        const t = (p.textContent || '').trim();
                        if (t.length > 0 && t.length < 30) {
                            container = p;
                            break;
                        }
                        p = p.parentElement;
                    }
                }
                const containerText = (container?.textContent || '').trim();
                if (targetWords.some(w => containerText.includes(w))) {
                    return { element: radio, isInput: true };
                }
            }
        }

        // 2) 找不到 2 个 radio 时，直接遍历所有 label/nodeLab/li/span
        //    找"文本含对/错且不含其他选项文本"的最小元素
        const candidates = Array.from(questionEl.querySelectorAll('label, .nodeLab, li, .topic-option-item, .answerBg, span, div'));
        let bestCandidate = null;
        let bestLength = Infinity;
        for (const el of candidates) {
            const t = (el.textContent || '').trim();
            if (!t) continue;
            if (t.length > 30) continue;  // 跳过题干/整块
            if (!targetWords.some(w => t === w || (t.length < 5 && t.includes(w)))) continue;
            // 排除"包含多个子选项"的元素（外层 li 含有两个 radio）
            const childRadios = el.querySelectorAll('input[type="radio"]');
            if (childRadios.length > 1) continue;
            if (t.length < bestLength) {
                bestLength = t.length;
                bestCandidate = el;
            }
        }

        if (bestCandidate) {
            const input = bestCandidate.querySelector('input[type="radio"], input[type="checkbox"]');
            if (input) {
                return { element: input, isInput: true };
            }
            return { element: bestCandidate, isInput: false };
        }

        return null;
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
                    // 点击元素（新版超星判断题：整个 li 容器 click 可能不触发，
                    // 需要 click 容器内每个可点击子元素：圆圈 span、文字 span）
                    const wasCheckedBefore = !!opt.element.querySelector('input:checked');
                    opt.element.click();
                    // 检查 100ms 内是否有 radio 被勾上（新加：检测 click 是否真生效）
                    setTimeout(() => {
                        const afterChecked = !!opt.element.querySelector('input:checked');
                        if (!afterChecked && !wasCheckedBefore) {
                            // click 没生效（超星新版），click 每个子元素
                            const allClickable = opt.element.querySelectorAll('span, i, b, em, label');
                            for (const c of allClickable) {
                                try { c.click(); } catch (e) {}
                            }
                        }
                    }, 100);
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
            const cachedEntry = state.questionCache.get(cacheKey);
            // 兼容旧缓存（纯字符串）和新缓存（{answer, ok}对象）
            const cachedAnswer = typeof cachedEntry === 'string' ? cachedEntry : (cachedEntry?.answer || '');
            if (cachedAnswer) return cachedAnswer;
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

            // 缓存答案（图片题目不缓存）- 注意：这里只缓存答案不缓存填写状态（getAnswerForQuestion不填写）
            if (!q.isImageQuestion && state.settings.useCache) {
                state.questionCache.set(cacheKey, { answer, ok: true });
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
    // 兼容两种格式：
    //   1) 简单 URL（tikuAdapter）：POST {question, options, type} → {answer:{allAnswer:[]}}
    //   2) OCS 风格完整配置：{name, url, method, type, data, headers, handler, contentType}
    function querySingleTiku(tiku, questionText, optionsArr, qType) {
        // 优先使用保存的 OCS 风格配置
        const cfg = tiku.config && typeof tiku.config === 'object' ? tiku.config : null;
        const method = (cfg?.method || 'post').toUpperCase();
        const reqType = cfg?.type || 'GM_xmlhttpRequest'; // fetch / GM_xmlhttpRequest
        const headers = (cfg?.headers && typeof cfg.headers === 'object') ? cfg.headers : { 'Content-Type': 'application/json;charset=utf-8' };
        const handlerStr = (cfg?.handler && typeof cfg.handler === 'string') ? cfg.handler : null;

        // 构造 URL：tikuAdapter 风格自动附加 wannengDisable
        let fullUrl = tiku.url;
        if (!cfg || !cfg.data) {
            fullUrl = tiku.url + (tiku.url.includes('?') ? '&' : '?') + 'wannengDisable=1';
        }

        // 构造 data（OCS 风格：data 中的 ${title}、${options}、${type} 是模板；{handler: 'return ...'} 是函数）
        let dataObj = null;
        if (cfg && cfg.data && typeof cfg.data === 'object') {
            dataObj = {};
            for (const [k, v] of Object.entries(cfg.data)) {
                if (v && typeof v === 'object' && typeof v.handler === 'string') {
                    // OCS handler 函数：return (env)=>...
                    try {
                        // eslint-disable-next-line no-new-func
                        const fn = new Function('return ' + v.handler)();
                        const env = { title: questionText, options: optionsArr, type: qType };
                        dataObj[k] = fn(env);
                    } catch (e) {
                        dataObj[k] = v;
                    }
                } else if (typeof v === 'string') {
                    // 模板字符串替换
                    dataObj[k] = v
                        .replace(/\$\{title\}/g, questionText || '')
                        .replace(/\$\{question\}/g, questionText || '')
                        .replace(/\$\{options\}/g, Array.isArray(optionsArr) ? optionsArr.join('\n') : (optionsArr || ''))
                        .replace(/\$\{type\}/g, qType || '');
                } else {
                    dataObj[k] = v;
                }
            }
        } else {
            // 默认 tikuAdapter 协议
            dataObj = {
                question: questionText,
                options: optionsArr || [],
                type: qType || ''
            };
        }

        return new Promise(resolve => {
            let resolved = false;
            const finish = (val) => {
                if (!resolved) { resolved = true; resolve(val); }
            };
            const timer = setTimeout(() => finish(null), 5000);

            const onSuccess = (raw) => {
                clearTimeout(timer);
                if (!raw) { finish(null); return; }
                let allAnswer = null;
                if (handlerStr) {
                    // OCS handler：return (res)=>...
                    try {
                        // eslint-disable-next-line no-new-func
                        const handlerFn = new Function('return ' + handlerStr)();
                        const result = handlerFn(raw);
                        if (Array.isArray(result) && result.length > 0) {
                            // OCS 风格：handler 返回 [answer, undefined] 或 [msg, allAnswer, extra]
                            const r0 = result[0];
                            const r1 = result[1];
                            if (Array.isArray(r1) && r1.length > 0) {
                                allAnswer = r1;
                            } else if (typeof r0 === 'string' && r0 && result.length > 1) {
                                allAnswer = result.slice(1).filter(x => x);
                            } else if (Array.isArray(r0) && r0.length > 0) {
                                allAnswer = r0;
                            }
                        }
                    } catch (e) {
                        // handler 解析失败，尝试降级
                    }
                }
                // 降级：尝试 tikuAdapter 格式
                if (!allAnswer) {
                    if (raw && raw.answer && Array.isArray(raw.answer.allAnswer) && raw.answer.allAnswer.length > 0) {
                        allAnswer = raw.answer.allAnswer;
                    } else if (raw && raw.data && Array.isArray(raw.data.answer)) {
                        allAnswer = raw.data.answer;
                    } else if (raw && Array.isArray(raw.answer)) {
                        allAnswer = raw.answer;
                    }
                }
                if (allAnswer && Array.isArray(allAnswer) && allAnswer.length > 0) {
                    finish({ source: tiku.name || cfg?.name || '题库', allAnswer });
                } else {
                    finish(null);
                }
            };

            try {
                if (reqType === 'fetch' && typeof fetch === 'function') {
                    fetch(fullUrl, {
                        method: method,
                        headers: headers,
                        body: method === 'GET' ? undefined : JSON.stringify(dataObj)
                    }).then(r => r.json().then(j => onSuccess(j)))
                      .catch(() => { clearTimeout(timer); finish(null); });
                } else {
                    GM_xmlhttpRequest({
                        method: method,
                        url: fullUrl,
                        headers: headers,
                        data: method === 'GET' ? undefined : JSON.stringify(dataObj),
                        onload: function(r) {
                            try {
                                const res = JSON.parse(r.responseText);
                                onSuccess(res);
                            } catch (e) {
                                clearTimeout(timer);
                                finish(null);
                            }
                        },
                        onerror: function() {
                            clearTimeout(timer);
                            finish(null);
                        }
                    });
                }
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
        // 缓存值：{answer, ok}  ok 表示上次是否真正填写成功
        if (!q.isImageQuestion && state.settings.useCache && q.cleanText.trim().length > 10 && state.questionCache.has(cacheKey)) {
            const cachedEntry = state.questionCache.get(cacheKey);
            const cachedAnswer = typeof cachedEntry === 'string'
                ? { answer: cachedEntry, ok: true }   // 兼容旧缓存（纯字符串）
                : cachedEntry;
            addLog(`第 ${q.index} 题: 使用缓存答案 ${cachedAnswer.answer}`, 'info');
            // 关键：缓存命中时**必须再调一次 fillAnswer**，上次可能没填成功
            // 但为了避免无限重试，强制尝试最多 2 次
            let filled = fillAnswer(q.element, cachedAnswer.answer);
            if (!filled && typeof q.element?.isConnected === 'boolean' && !q.element.isConnected) {
                // element 已被 Vue 替换，跳过
                addLog(`第 ${q.index} 题: 题目元素已失效，跳过缓存`, 'warn');
                return;
            }
            if (filled) {
                if (typeof cachedEntry === 'string') {
                    state.questionCache.set(cacheKey, { answer: cachedAnswer.answer, ok: true });
                }
                state.answeredCount++;
                showPreview(q.cleanText, cachedAnswer.answer);
                return;
            }
            // 缓存命中但填写失败 → 删掉缓存，降级走 AI（不要让用户拿到一个永远填不上的"假缓存"）
            addLog(`第 ${q.index} 题: 缓存命中但填写失败，删除缓存并调用AI重新作答`, 'warn');
            state.questionCache.delete(cacheKey);
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
            const filled = fillAnswer(q.element, tikuAnswer);
            if (!filled) {
                // 填写失败不写缓存，让下次能重新尝试
                addLog(`第 ${q.index} 题: [题库] ${tikuAnswer} 填写失败（元素可能已刷新）`, 'error');
                return;
            }
            if (state.settings.useCache) {
                state.questionCache.set(cacheKey, { answer: tikuAnswer, ok: true });
            }
            addLog(`第 ${q.index} 题: [题库] ${tikuAnswer}（来源：${tikuSource}）`, 'success');
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

            // 缓存答案（图片题目不缓存） - 必须先尝试填写，**成功才写缓存**
            const filled = fillAnswer(q.element, answer);
            if (!filled) {
                // 填写失败不写缓存，下次能重新尝试
                addLog(`第 ${q.index} 题: 答案 ${answer} 填写失败（元素可能已刷新）`, 'error');
                return;
            }
            if (!q.isImageQuestion && state.settings.useCache) {
                state.questionCache.set(cacheKey, { answer, ok: true });
            }

            // 情况B时，把"题库+AI"都展示出来
            const logPrefix = tikuAnswer ? `[题库${tikuAnswer}→AI${answer === tikuAnswer ? '一致' : '纠正'}] ` : '[AI] ';
            addLog(`第 ${q.index} 题: ${logPrefix}${answer}`, 'success');
            state.answeredCount++;

            showPreview(q.cleanText || '[图片题目]', answer);

        } catch(aiErr) {
            addLog(`第 ${q.index} 题 AI调用失败: ${aiErr.message}`, 'error');
            // AI失败但题库有答案：兜底用题库答案
            if (tikuAnswer) {
                addLog(`第 ${q.index} 题: 兜底使用题库答案 ${tikuAnswer}`, 'info');
                const filled = fillAnswer(q.element, tikuAnswer);
                if (!filled) {
                    addLog(`第 ${q.index} 题: 兜底题库答案 ${tikuAnswer} 填写失败`, 'error');
                    return;
                }
                if (state.settings.useCache) {
                    state.questionCache.set(cacheKey, { answer: tikuAnswer, ok: true });
                }
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
                <button class="tab-item" data-tab="study">视频刷课</button>
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

                    <!-- 🎬 视频刷课：已独立为 tab，不再放在控制台 -->

                    <div class="question-preview" id="question-preview" style="display:none"></div>
                </div>

                <!-- 视频刷课 -->
                <div class="tab-pane" id="pane-study">
                    <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:14px;">🎬 视频刷课</div>

                    <!-- 状态卡片 -->
                    <div id="study-status-card" style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                            <div id="study-status-dot" style="width:10px;height:10px;border-radius:50%;background:#9ca3af;"></div>
                            <div id="study-status-text" style="font-size:13px;color:#374151;font-weight:600;">未运行</div>
                        </div>
                        <div id="study-info" style="font-size:12px;color:#6b7280;line-height:1.6;">
                            倍速: <span id="study-info-rate">1.5</span>x · 音量: <span id="study-info-volume">0</span> · 视频数: <span id="study-info-count">0</span>
                        </div>
                    </div>

                    <!-- 配置区 -->
                    <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:14px;">
                        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:10px;">基础设置</div>
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                            <label style="font-size:12px;color:#374151;">倍速</label>
                            <input type="number" id="set-study-rate" min="0.5" max="16" step="0.5" value="1.5" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                            <label style="font-size:12px;color:#374151;">音量</label>
                            <input type="number" id="set-study-volume" min="0" max="1" step="0.1" value="0" style="width:80px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;">
                            <label style="font-size:12px;color:#374151;display:flex;align-items:center;gap:4px;">
                                <input type="checkbox" id="set-study-enabled" style="margin:0;"> 启用刷课
                            </label>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn btn-primary" id="btn-study-start" style="flex:1;padding:8px 14px;font-size:13px;">▶ 开始刷课</button>
                            <button class="btn btn-danger" id="btn-study-stop" style="flex:1;padding:8px 14px;font-size:13px;">⏹ 停止刷课</button>
                            <button class="btn btn-outline" id="btn-study-apply" style="flex:1;padding:8px 14px;font-size:13px;">⚡ 立即应用倍速</button>
                            <button class="btn btn-outline" id="btn-study-diagnose" style="flex:1;padding:8px 14px;font-size:13px;">🔍 诊断视频</button>
                        </div>
                    </div>

                    <!-- 功能开关 -->
                    <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:14px;">
                        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:10px;">功能开关</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:#374151;">
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-anti-pause" checked> 🛡️ 反鼠标检测
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-auto-unpause" checked> ▶️ 自动解除暂停
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-auto-next" checked> ⏭️ 自动跳任务点
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-loop" checked"> 🔁 视频自动连播
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-close-dialog" checked> ✖️ 自动关弹窗
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-handle-quiz" checked> 📝 自动做内嵌题
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-read" checked> 📖 自动读章节（PPT/书籍）
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f9fafb;border-radius:6px;cursor:pointer;">
                                <input type="checkbox" id="set-study-discuss" checked> 💬 讨论自动回复
                            </label>
                        </div>
                        <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                            <div style="padding:6px 8px;background:#f9fafb;border-radius:6px;">
                                <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">📖 翻页速度（秒/页）</div>
                                <input type="number" id="set-read-speed" min="1" max="10" step="0.5" value="1" style="width:100%;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;">
                            </div>
                            <div style="padding:6px 8px;background:#f9fafb;border-radius:6px;">
                                <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">💬 讨论模式</div>
                                <select id="set-study-discuss-mode" style="width:100%;padding:3px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;">
                                    <option value="random">🎲 随机一条</option>
                                    <option value="first">📌 第一条（最新）</option>
                                    <option value="max-show-up">🔥 出现最多（MOOC）</option>
                                    <option value="max-fav">👍 最多点赞（MOOC）</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- 高级设置 -->
                    <div style="padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;">
                        <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:10px;">高级</div>
                        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;cursor:pointer;">
                            <input type="checkbox" id="set-study-autostart" style="margin:0;"> 进入学习页面时自动启动刷课
                        </label>
                        <div style="font-size:11px;color:#9ca3af;margin-top:4px;margin-left:24px;">
                            ⚠️ 首次使用请手动点一下视频以激活浏览器（autoplay policy）
                        </div>
                        <div style="margin-top:12px;display:flex;gap:8px;">
                            <button class="btn btn-primary" id="btn-study-save" style="flex:1;padding:8px 14px;font-size:13px;">💾 保存设置并刷新页面</button>
                        </div>
                        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">
                            倍速/音量/自动启动等修改后必须点此按钮，刷新后才会真正生效
                        </div>
                    </div>
                </div>

                <!-- API配置 -->
                <div class="tab-pane" id="pane-apis">
                    <div id="api-list-container"></div>

                    <!-- 自定义 API 配置（从设置tab挪过来） -->
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
                            支持两种格式：①简单URL（tikuAdapter协议）②完整JSON配置（OCS/tikuAdapter格式）<br>
                            协议：POST {question, options, type} → {answer:{allAnswer:[]}}；JSON格式可粘贴整段配置自动导入
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

        // 刷课控制按钮（融合自OCS网课助手 - 独立实现）
        document.getElementById('btn-study-start')?.addEventListener('click', () => {
            if (typeof startStudy === 'function') {
                startStudy();
            } else {
                showToast('刷课模块未加载', 'error');
            }
        });
        document.getElementById('btn-study-stop')?.addEventListener('click', () => {
            if (typeof stopStudy === 'function') {
                stopStudy();
            } else {
                showToast('刷课模块未加载', 'error');
            }
        });
        document.getElementById('btn-study-apply')?.addEventListener('click', () => {
            if (typeof applyStudyRate === 'function') {
                const rate = parseFloat(document.getElementById('set-study-rate')?.value || 1.5);
                const vol = parseFloat(document.getElementById('set-study-volume')?.value || 0);
                const n = applyStudyRate(rate, vol);
                if (n > 0) {
                    showToast(`已对 ${n} 个视频应用 ${rate}x / 音量${vol}`, 'success');
                    addLog(`刷课: 已对 ${n} 个视频应用 ${rate}x / 音量${vol}`, 'success');
                } else {
                    showToast('当前页面没找到视频，点🔍诊断', 'warn');
                    addLog('刷课: 当前页面未找到视频（可点🔍诊断排查）', 'warn');
                }
            }
        });
        // 诊断按钮：详细列出页面所有可能的视频位置+iframe信息
        document.getElementById('btn-study-diagnose')?.addEventListener('click', () => {
            if (typeof diagnoseVideo === 'function') {
                diagnoseVideo();
            }
        });

        // 保存设置并刷新页面
        document.getElementById('btn-study-save')?.addEventListener('click', () => {
            if (typeof saveAllConfig === 'function') saveAllConfig();
            if (typeof addLog === 'function') addLog('刷课: 设置已保存，即将刷新页面', 'success');
            if (typeof showToast === 'function') showToast('设置已保存，正在刷新…', 'success');
            setTimeout(() => { try { location.reload(); } catch(e) {} }, 500);
        });

        // ========== 视频刷课 tab：状态更新 + 实时显示视频数 ==========
        function updateStudyStatus() {
            const dot = document.getElementById('study-status-dot');
            const text = document.getElementById('study-status-text');
            const rate = document.getElementById('study-info-rate');
            const vol = document.getElementById('study-info-volume');
            const count = document.getElementById('study-info-count');
            if (rate) rate.textContent = state.settings.studyRate;
            if (vol) vol.textContent = state.settings.studyVolume;
            if (count) {
                try { count.textContent = findAllVideos().length; } catch(e) { count.textContent = '?'; }
            }
            if (dot && text) {
                if (_STUDY.running) {
                    dot.style.background = '#10b981';
                    text.textContent = '运行中';
                    text.style.color = '#10b981';
                } else {
                    dot.style.background = '#9ca3af';
                    text.textContent = '未运行';
                    text.style.color = '#374151';
                }
            }
        }
        // 启动时初始化一次
        updateStudyStatus();
        // 每3秒刷新一次（视频数会变）
        setInterval(updateStudyStatus, 3000);

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
        // 刷课相关（融合自OCS网课助手）
        if (document.getElementById('set-study-enabled'))
            document.getElementById('set-study-enabled').checked = !!state.settings.studyEnabled;
        if (document.getElementById('set-study-rate'))
            document.getElementById('set-study-rate').value = state.settings.studyRate ?? 1.5;
        if (document.getElementById('set-study-volume'))
            document.getElementById('set-study-volume').value = state.settings.studyVolume ?? 0;
        if (document.getElementById('set-study-anti-pause'))
            document.getElementById('set-study-anti-pause').checked = state.settings.studyAntiPause !== false;
        if (document.getElementById('set-study-auto-unpause'))
            document.getElementById('set-study-auto-unpause').checked = state.settings.studyAutoUnpause !== false;
        if (document.getElementById('set-study-auto-next'))
            document.getElementById('set-study-auto-next').checked = state.settings.studyAutoNext !== false;
        if (document.getElementById('set-study-loop'))
            document.getElementById('set-study-loop').checked = state.settings.studyLoop !== false;
        if (document.getElementById('set-study-close-dialog'))
            document.getElementById('set-study-close-dialog').checked = state.settings.studyAutoCloseDialog !== false;
        if (document.getElementById('set-study-handle-quiz'))
            document.getElementById('set-study-handle-quiz').checked = state.settings.studyHandleVideoQuiz !== false;
        if (document.getElementById('set-study-autostart'))
            document.getElementById('set-study-autostart').checked = state.settings.studyAutoStartOnLoad === true;
        if (document.getElementById('set-study-read'))
            document.getElementById('set-study-read').checked = state.settings.studyReadTask !== false;
        if (document.getElementById('set-study-discuss'))
            document.getElementById('set-study-discuss').checked = state.settings.studyAutoDiscuss !== false;
        if (document.getElementById('set-study-discuss-mode'))
            document.getElementById('set-study-discuss-mode').value = state.settings.studyDiscussMode || 'random';
        if (document.getElementById('set-read-speed'))
            document.getElementById('set-read-speed').value = state.settings.readSpeed || 1;
        
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

    // 去掉字符串首尾的反引号 / 空白 / 引号（OCS 配置有时会带这些装饰字符）
    function cleanTikuStr(s) {
        if (typeof s !== 'string') return '';
        let v = s.trim();
        // 反复剥除成对的外层引号或反引号
        for (let i = 0; i < 3; i++) {
            if ((v.startsWith('"') && v.endsWith('"')) ||
                (v.startsWith("'") && v.endsWith("'")) ||
                (v.startsWith('`') && v.endsWith('`'))) {
                v = v.slice(1, -1).trim();
            } else {
                break;
            }
        }
        return v;
    }

    function addTiku() {
        const nameInput = document.getElementById('input-tiku-name');
        const urlInput = document.getElementById('input-tiku-url');
        if (!urlInput) return;
        const raw = (urlInput.value || '').trim();
        const name = (nameInput?.value || '').trim();

        if (!raw) {
            showToast('请填写题库URL或JSON配置', 'error');
            return;
        }
        if (!Array.isArray(state.settings.tikuList)) state.settings.tikuList = [];

        // 1) 如果是 JSON 数组（OCS / tikuAdapter 格式），整体导入
        if (raw.startsWith('[') || raw.startsWith('{')) {
            try {
                const parsed = JSON.parse(raw);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                let added = 0;
                let skipped = 0;
                for (const item of arr) {
                    if (!item || typeof item !== 'object') { skipped++; continue; }
                    // 清理 url 字段：去掉反引号 / 空白 / 外层引号
                    const cleanUrl = cleanTikuStr(item.url);
                    if (!cleanUrl) { skipped++; continue; }
                    if (!/^https?:\/\//i.test(cleanUrl)) { skipped++; continue; }
                    // 去重（按 url + name）
                    if (state.settings.tikuList.some(t => t.url === cleanUrl && (t.name || '') === (item.name || ''))) {
                        skipped++; continue;
                    }
                    // 构造保存的 config：url 清理掉反引号，保留其余字段
                    const saveConfig = { ...item, url: cleanUrl };
                    const finalName = (name && arr.length === 1)
                        ? name
                        : (cleanTikuStr(item.name) || ('题库' + (state.settings.tikuList.length + 1)));
                    state.settings.tikuList.push({
                        id: 'tiku_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        name: finalName,
                        url: cleanUrl,
                        enabled: true,
                        // 完整保存 OCS 风格配置（method/type/data/headers/handler）
                        config: saveConfig
                    });
                    added++;
                }
                if (added === 0) {
                    showToast('未添加任何题库（' + (skipped > 0 ? skipped + '项已跳过/格式不符' : '请检查格式') + '）', 'error');
                    return;
                }
                saveAllConfig();
                renderTikuList();
                if (nameInput) nameInput.value = '';
                if (urlInput) urlInput.value = '';
                showToast('已导入 ' + added + ' 个题库' + (skipped > 0 ? '（跳过 ' + skipped + '）' : ''), 'success');
                return;
            } catch (e) {
                showToast('JSON解析失败: ' + e.message, 'error');
                return;
            }
        }

        // 2) 否则当作普通 URL 处理（兼容旧版）
        const url = cleanTikuStr(raw);
        if (!url) {
            showToast('请填写题库URL或JSON配置', 'error');
            return;
        }
        if (!/^https?:\/\//i.test(url)) {
            showToast('URL必须以 http:// 或 https:// 开头', 'error');
            return;
        }
        if (state.settings.tikuList.some(t => t.url === url)) {
            showToast('该题库已存在', 'warn');
            return;
        }
        state.settings.tikuList.push({
            id: 'tiku_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: name || ('题库' + (state.settings.tikuList.length + 1)),
            url: url,
            enabled: true
        });
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        renderTikuList();
        saveAllConfig();
        showToast('已添加题库：' + (name || url), 'success');
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

    // ==================== 视频刷课模块（融合自OCS网课助手 - 独立实现）====================
    // 本模块**仅参考OCS的功能列表**，代码100%重写，不调用OCS任何内部API
    // 不污染state结构，挂在自己的命名空间 _STUDY 下
    // 功能：反鼠标检测 / 倍速 / 音量 / 自动播放(解除暂停) / 任务点跳转 / 视频连播 / 关弹窗
    const _STUDY = {
        running: false,           // 刷课总开关
        intervalId: null,         // 主循环setInterval id
        appliedVideos: new WeakSet(),  // 已应用过倍速/音量的video元素
        lastJumpAt: 0,            // 上次跳任务点时间戳（防抖）
        lastUnpauseAt: 0,         // 上次自动播放时间戳（防抖）
        lastCloseAt: 0,           // 上次关弹窗时间戳（防抖）
        faceNotified: false,      // 人脸识别已提示（30秒内不再提示）
        errorNotified: false,     // 视频加载失败已提示
        stop() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.running = false;
            if (typeof addLog === 'function') {
                addLog('刷课: 已停止', 'info');
            }
            if (typeof showToast === 'function') {
                showToast('刷课已停止', 'info');
            }
        }
    };

    // 找当前页面（包括iframe）所有<video>元素
    // 参考OCS：先在root内按 #video / #audio ID 找（超星/学习通实际DOM），
    //          再fallback到 tagName(video/audio)
    //          再递归iframe
    // 重要：过滤掉"不可见"的video（offsetParent=null 或 宽高=0）
    //       这些是隐藏的弹窗video/占位video，会让"找到N个"误导用户
    function isVisibleMedia(el) {
        if (!el) return false;
        try {
            // 必须有 size
            const r = el.getBoundingClientRect();
            if (!r || (r.width < 2 && r.height < 2)) return false;
            // offsetParent 为 null 可能只是 fixed 定位（不算隐藏）
            // 还要看 display:none / visibility:hidden
            const style = el.ownerDocument && el.ownerDocument.defaultView
                ? el.ownerDocument.defaultView.getComputedStyle(el) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0)) {
                return false;
            }
            return true;
        } catch (e) { return true; }
    }
    function findAllVideos() {
        const videos = [];
        const seen = new Set();
        // OCS实际用过的所有video/audio选择器（按优先级）
        const ocsSelectors = [
            '#video', '#audio', '#video-box',                // 超星/学习通 ID选择器
            'video', 'audio',                                // 通用tagName
            '.vjs-tech',                                      // videojs实际video
            '.xgplayer video', '.xgplayer audio'              // 字节xgplayer
        ];
        const scan = (doc) => {
            if (!doc) return;
            try {
                for (const sel of ocsSelectors) {
                    try {
                        const vs = doc.querySelectorAll(sel);
                        for (const v of vs) {
                            if (!seen.has(v) && isVisibleMedia(v)) {
                                seen.add(v);
                                videos.push(v);
                            }
                        }
                    } catch (e) { /* 复杂选择器在某些浏览器可能挂 */ }
                }
            } catch (e) { /* cross-origin iframe */ }
            // 递归iframe
            const iframes = doc.querySelectorAll('iframe');
            for (const f of iframes) {
                try {
                    const cw = f.contentWindow;
                    if (cw && cw.document) {
                        scan(cw.document);
                    }
                } catch (e) { /* 跨域iframe，忽略 */ }
            }
        };
        scan(document);
        // 还试 top / unsafeWindow（OCS的 knowCardWin）
        try {
            if (window.top && window.top.document && window.top.document !== document) {
                scan(window.top.document);
            }
        } catch (e) {}
        try {
            if (window.unsafeWindow && window.unsafeWindow.document) {
                scan(window.unsafeWindow.document);
            }
        } catch (e) {}
        // 排序：把"最像主视频"的排前面——
        // 主视频特征：在视口中央、宽高较大、不在display:none的容器里
        // 我们用简单的"宽 × 高"做score
        videos.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return (rb.width * rb.height) - (ra.width * ra.height);
        });
        return videos;
    }

    // 给一个video应用倍速+音量（如果已应用过就跳过）
    function applyOneVideo(v, rate, vol) {
        if (!v) return false;
        if (_STUDY.appliedVideos.has(v)) return false;
        try {
            v.playbackRate = rate;
            v.volume = vol;
            // 静音
            v.muted = (vol === 0);
        } catch (e) {
            return false;
        }
        _STUDY.appliedVideos.add(v);
        return true;
    }

    // 立即应用倍速+音量到所有视频（供"⚡ 立即应用倍速"按钮调用）
    function applyStudyRate(rate, vol) {
        const s = state && state.settings ? state.settings : null;
        if (s) {
            s.studyRate = rate;
            s.studyVolume = vol;
        }
        const videos = findAllVideos();
        let applied = 0;
        for (const v of videos) {
            if (applyOneVideo(v, rate, vol)) applied++;
        }
        return applied;
    }

    // 包装器：调用 play()，捕获 autoplay policy 错误，提示用户
    // 参考 OCS 的 playMedia(playFunction)
    // 浏览器拒绝 play() 的常见原因：用户没在画面交互过（chrome autoplay policy）
    function playWithErrorHandler(video) {
        try {
            const wasMuted = video.muted;
            video.muted = true; // muted 才能绕过 autoplay policy
            const p = video.play();
            if (p && typeof p.then === 'function') {
                return p.then(() => {
                    if (state.settings.studyVolume > 0) video.muted = wasMuted;
                    return true;
                }).catch((err) => {
                    video.muted = wasMuted;
                    const msg = String(err && err.message || err);
                    if (msg.includes("didn't interact with the document") ||
                        msg.includes("user gesture") ||
                        msg.includes("NotAllowedError")) {
                        if (typeof addLog === 'function') {
                            addLog('刷课: ⚠️ 浏览器拒绝自动播放 - 请手动点一下视频', 'warn');
                        }
                        if (typeof showToast === 'function') {
                            showToast('请点一下视频激活', 'warn');
                        }
                    } else if (msg.includes('no supported sources')) {
                        if (typeof addLog === 'function') {
                            addLog('刷课: ⚠️ 视频无法播放（格式/网络）', 'warn');
                        }
                    } else {
                        if (typeof addLog === 'function') {
                            addLog('刷课: play()失败 - ' + msg, 'warn');
                        }
                    }
                    return false;
                });
            }
            return Promise.resolve(true);
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    // 检测视频加载失败的弹窗（vjs-modal-dialog-content）
    // 参考 OCS 的 .vjs-modal-dialog-content 错误匹配
    function checkVideoLoadError() {
        const errorTexts = ['视频文件损坏', '网络错误导致视频下载中途失败', '视频因格式不支持', '网络的问题无法加载'];
        const dialog = document.querySelector('.vjs-modal-dialog-content');
        if (dialog && errorTexts.some(t => dialog.innerText && dialog.innerText.includes(t))) {
            if (!_STUDY.errorNotified) {
                _STUDY.errorNotified = true;
                if (typeof addLog === 'function') {
                    addLog('刷课: ⚠️ 视频加载失败（' + (dialog.innerText || '').trim() + '），3秒后跳下一节', 'warn');
                }
                // 3秒后让 tryAutoJumpTask 接管
                setTimeout(() => {
                    _STUDY.errorNotified = false;
                    if (typeof tryAutoJumpTask === 'function') tryAutoJumpTask();
                }, 3000);
            }
        }
    }

    // 检测人脸识别（参考 OCS 的 hasFaceRecognition / hasNewFaceRecognition）
    function checkFaceRecognition() {
        if (_STUDY.faceNotified) return;
        try {
            // 老版本：#fcqrimg 有 src
            const faces = document.querySelectorAll('#fcqrimg');
            for (const f of faces) {
                if (f.getAttribute('src')) {
                    _STUDY.faceNotified = true;
                    if (typeof addLog === 'function') {
                        addLog('刷课: ⚠️ 检测到人脸识别，请手动识别后继续', 'warn');
                    }
                    if (typeof showToast === 'function') {
                        showToast('⚠️ 人脸识别：手动完成后继续', 'warn');
                    }
                    // 30秒后再允许提示
                    setTimeout(() => { _STUDY.faceNotified = false; }, 30000);
                    return;
                }
            }
            // 新版本：.chapterVideoFaceMaskDiv display !== none
            const newMasks = document.querySelectorAll('.chapterVideoFaceMaskDiv');
            for (const m of newMasks) {
                if (m.style.display !== 'none') {
                    _STUDY.faceNotified = true;
                    if (typeof addLog === 'function') {
                        addLog('刷课: ⚠️ 检测到人脸识别（新版本），请手动识别后继续', 'warn');
                    }
                    if (typeof showToast === 'function') {
                        showToast('⚠️ 人脸识别：手动完成后继续', 'warn');
                    }
                    setTimeout(() => { _STUDY.faceNotified = false; }, 30000);
                    return;
                }
            }
        } catch (e) {}
    }

    // 修复控制条被隐藏（参考 OCS fixedVideoProgress）
    function fixControlBar() {
        try {
            const bar = document.querySelector('.vjs-control-bar');
            if (bar) bar.style.opacity = '1';
            // 超星新版控制条
            const newBar = document.querySelector('.xgplayer-controls, .xg-controls');
            if (newBar) newBar.style.opacity = '1';
        } catch (e) {}
    }

    // ==================== PPT/书籍/读章节 自动完成（参考 OCS readPPTWithAudio / read / timereader） ====================
    // 用户说"不提交到后端"——所以只用本地模拟翻页/等待，**不调 finishJob()**

    /**
     * 检测当前页面是否是"读章节"任务点（PPT/书籍/长时阅读）
     * OCS 的 read 条件：attachment.property.job === true 且 dom 含 .swiper-container 或 .reading 或 timereader
     */
    function detectReadTask() {
        // 超星：包含 .swiper-container 的iframe（PPT）
        const swiper = document.querySelector('.swiper-container, .swiper, .ux-pdf-reader');
        if (swiper) {
            // 找iframe里的swiper（更稳）
            const iframes = document.querySelectorAll('iframe');
            for (const f of iframes) {
                try {
                    if (f.contentDocument && f.contentDocument.querySelector('.swiper-container, .swiper-slide, .swiper-wrapper')) {
                        return { type: 'ppt', target: f.contentDocument, win: f.contentWindow, hasSwiperNext: !!f.contentWindow.swiperNext };
                    }
                } catch (e) { /* 跨域 */ }
            }
            // 也可能swiper在顶层
            if (document.querySelector('.swiper-container')) {
                return { type: 'ppt', target: document, win: window, hasSwiperNext: !!window.swiperNext };
            }
        }

        // 超星：阅读任务点（readsvr/book/mooc 页面）
        if (location.pathname.includes('/readsvr/book/mooc') ||
            location.href.includes('readsvr') ||
            document.querySelector('.ans-attach-online, .readPdf, .book-reader')) {
            return { type: 'read', target: document, win: window, hasSwiperNext: false };
        }

        // 超星：长时阅读任务点（含 timing 参数的iframe）
        const timeIframes = document.querySelectorAll('iframe[src*="timing="]');
        for (const f of timeIframes) {
            let timing = 60;
            try { timing = parseInt(new URL(f.src).searchParams.get('timing') || '60'); } catch (e) {}
            return { type: 'timereader', target: document, win: window, iframe: f, timing };
        }

        // 智慧树：读书模块
        if (location.hostname.includes('zhihuishu.com') &&
            (document.querySelector('.reader-container, .read-page, .book-content, .pdf-reader'))) {
            return { type: 'read', target: document, win: window, hasSwiperNext: false };
        }

        // 智慧职教：PPT/书籍
        if (location.hostname.includes('icve.com.cn') &&
            (document.querySelector('.docBox, .ppt-content, .pdf-viewer, .reader'))) {
            return { type: 'read', target: document, win: window, hasSwiperNext: false };
        }

        return null;
    }

    /**
     * 执行"读章节"任务点
     * - PPT 模式：调 swiperNext 翻完所有页 + audio.muted
     * - read 模式：等待 3 秒（用户说本地不提交后端）
     * - timereader 模式：等待 timing 秒
     */
    async function runReadTask(task) {
        if (typeof addLog === 'function') {
            addLog(`刷课: 检测到读章节任务点（${task.type}）`, 'info');
        }
        if (task.type === 'ppt') {
            // 静音所有 audio（OCS readPPTWithAudio 的做法）
            try {
                task.target.querySelectorAll('audio').forEach(a => { try { a.muted = true; } catch (e) {} });
            } catch (e) {}
            // 找总页数
            let total = 0;
            try {
                total = task.target.querySelectorAll('.swiper-container .swiper-slide').length;
            } catch (e) {}
            if (total === 0) {
                // 兜底：取 .swiper-slide
                try { total = task.target.querySelectorAll('.swiper-slide').length; } catch (e) {}
            }
            if (typeof addLog === 'function') {
                addLog(`刷课: PPT/书籍共 ${total} 页，开始自动翻页`, 'info');
            }
            const delay = (state.settings && state.settings.readSpeed ? state.settings.readSpeed : 1) * 1000;
            for (let i = 0; i < total; i++) {
                try {
                    if (task.win && typeof task.win.swiperNext === 'function') {
                        task.win.swiperNext();
                    } else {
                        // 兜底：找下一页按钮
                        const nextBtn = task.target.querySelector('.swiper-button-next, .arrow-right, .next, .next-page, .page-next');
                        if (nextBtn) nextBtn.click();
                    }
                } catch (e) {}
                await new Promise(r => setTimeout(r, delay));
            }
            await new Promise(r => setTimeout(r, 3000));
            if (typeof addLog === 'function') {
                addLog('刷课: PPT/书籍翻页完成', 'success');
            }
            return true;
        } else if (task.type === 'timereader') {
            const t = task.timing || 60;
            const total = (t + 3) * 3;
            if (typeof addLog === 'function') {
                addLog(`刷课: 长时阅读任务，预计等待 ${total} 秒`, 'info');
            }
            showToast && showToast(`长时阅读：${total}秒后完成`, 'info');
            await new Promise(r => setTimeout(r, total * 1000));
            if (typeof addLog === 'function') {
                addLog('刷课: 长时阅读完成', 'success');
            }
            return true;
        } else if (task.type === 'read') {
            // 普通阅读任务：3秒搞定（用户说本地不提交后端）
            if (typeof addLog === 'function') {
                addLog('刷课: 阅读任务 3秒后标记完成（本地模式）', 'info');
            }
            await new Promise(r => setTimeout(r, 3000));
            return true;
        }
        return false;
    }

    // 状态：避免重复处理同一个读章节任务
    let _readTaskRunning = false;
    let _readTaskDone = false;

    /**
     * 读章节主入口：被刷课主循环调用
     * 防重入：同一任务点只处理一次
     */
    function tryReadTask() {
        if (!state.settings.studyReadTask) return;
        if (_readTaskRunning || _readTaskDone) return;
        const task = detectReadTask();
        if (!task) return;
        _readTaskRunning = true;
        runReadTask(task).then(() => {
            _readTaskDone = true;
            _readTaskRunning = false;
        }).catch(e => {
            _readTaskRunning = false;
            if (typeof addLog === 'function') {
                addLog(`刷课: 读章节异常 - ${e.message || e}`, 'warn');
            }
        });
    }

    // ==================== 讨论自动回复（参考 OCS discussion / v2_study discuss） ====================

    /**
     * 检测当前页面是否是讨论/回复区
     */
    function detectDiscussTask() {
        // MOOC: /learn/forum /discuss / .j-reply-add
        if (location.hostname.includes('icourse163.org')) {
            if (document.querySelector('.j-reply-add, .j-reply-all')) {
                return { type: 'mooc', existingReplies: document.querySelectorAll('.j-reply-all .f-pr .j-content') };
            }
        }
        // 雨课堂: /v2/web/lms/.../forum + .new_discuss_list
        if (location.hostname.includes('yuketang.cn')) {
            if (location.pathname.match(/v2\/web\/lms\/.*\/forum/)) {
                const list = document.querySelector('.new_discuss_list');
                if (list) {
                    return { type: 'ykt', existingReplies: list.querySelectorAll('.cont_detail') };
                }
            }
        }
        // 超星新版讨论
        if (location.hostname.includes('chaoxing.com') || location.hostname.endsWith('edu.cn')) {
            // 通用：找讨论/回复输入框
            if (document.querySelector('.reply-area, .discussion-reply, .editor-box, [contenteditable="true"]')) {
                return { type: 'cx', existingReplies: document.querySelectorAll('.reply-item, .comment-item, .reply, .comment') };
            }
        }
        return null;
    }

    /**
     * 选出一条讨论内容
     * @param {object} task detectDiscussTask()的返回值
     * @param {string} mode 'random' | 'first' | 'lastest' | 'max-show-up' | 'max-fav'
     * @returns {string}
     */
    function pickDiscussion(task, mode) {
        const replies = Array.from(task.existingReplies || []);
        if (replies.length === 0) return '';

        if (task.type === 'mooc') {
            if (mode === 'max-show-up') {
                // 出现次数最多
                const m = new Map();
                for (const r of replies) {
                    const t = (r.textContent || '').trim();
                    if (t) m.set(t, (m.get(t) || 0) + 1);
                }
                return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
            } else if (mode === 'max-fav') {
                // 最多点赞
                const list = Array.from(document.querySelectorAll('.j-reply-all .f-pr'));
                let max = 0, maxEl = null;
                for (const item of list) {
                    const num = parseInt(item.querySelector('.bar .num')?.textContent || '0');
                    if (num > max) { max = num; maxEl = item; }
                }
                return maxEl?.querySelector('.j-content')?.textContent || '';
            } else if (mode === 'lastest' || mode === 'first') {
                // 最新
                return replies[0]?.textContent?.trim() || '';
            } else if (mode === 'random') {
                return replies[Math.floor(Math.random() * replies.length)]?.textContent?.trim() || '';
            }
        } else {
            // 雨课堂 + 超星通用
            if (mode === 'first' || mode === 'lastest') {
                return replies[0]?.textContent?.trim() || '';
            } else {
                // 默认 random
                return replies[Math.floor(Math.random() * replies.length)]?.textContent?.trim() || '';
            }
        }
        return '';
    }

    /**
     * 填入文本到讨论框并点击提交
     * @param {string} text
     * @returns {boolean} 是否成功
     */
    function fillAndSubmitDiscuss(text) {
        if (!text) return false;
        // 1) 找输入框
        const inputs = [
            // MOOC
            document.querySelector('.j-reply-add div.ql-editor p, .j-reply-add .ql-editor'),
            // 雨课堂
            document.querySelector('textarea.el-textarea__inner'),
            // 超星 contenteditable
            document.querySelector('.reply-area [contenteditable="true"], .discussion-reply [contenteditable="true"], .editor-box [contenteditable="true"]'),
            // 兜底
            document.querySelector('textarea[placeholder*="回复"], textarea[placeholder*="评论"], textarea[placeholder*="讨论"]'),
            document.querySelector('textarea')
        ].filter(Boolean);
        const input = inputs[0];
        if (!input) return false;
        // 2) 填入
        if (input.tagName === 'TEXTAREA') {
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // contenteditable
            input.innerText = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // 3) 找提交按钮
        const submitBtns = [
            document.querySelector('.j-reply-add .editbtn, .j-reply-add .submit, .j-reply-add button'),
            document.querySelector('button.submitComment, .submit-comment, button.submit'),
            // 超星提交
            document.querySelector('.reply-area .btn-submit, .discussion-reply .btn-submit, .editor-box .btn-submit'),
            // 兜底：包含"提交"或"回复"或"发表"或"评论"的button
            Array.from(document.querySelectorAll('button, a')).find(b => {
                const t = (b.textContent || '').trim();
                return ['提交', '回复', '发表', '评论', '发送', '发布'].includes(t) ||
                       ['提交', '回复', '发表', '评论', '发送', '发布'].some(k => t.includes(k));
            })
        ].filter(Boolean);
        const submit = submitBtns[0];
        if (!submit) return false;
        try { submit.click(); return true; } catch (e) { return false; }
    }

    // 状态：避免重复处理讨论
    let _discussRunning = false;
    let _discussDone = false;

    /**
     * 讨论自动回复主入口
     */
    function tryDiscuss() {
        if (!state.settings.studyAutoDiscuss) return;
        if (_discussRunning || _discussDone) return;
        const task = detectDiscussTask();
        if (!task) return;
        _discussRunning = true;
        const mode = state.settings.studyDiscussMode || 'random';
        if (mode === 'none' || mode === 'not-reply') {
            _discussDone = true;
            _discussRunning = false;
            if (typeof addLog === 'function') {
                addLog('刷课: 讨论自动回复已关闭', 'info');
            }
            return;
        }
        const text = pickDiscussion(task, mode);
        if (!text) {
            _discussRunning = false;
            if (typeof addLog === 'function') {
                addLog('刷课: 讨论区没有可参考的回复内容', 'warn');
            }
            return;
        }
        const ok = fillAndSubmitDiscuss(text);
        if (ok) {
            _discussDone = true;
            if (typeof addLog === 'function') {
                addLog(`刷课: 讨论已自动回复（模式: ${mode}）`, 'success');
            }
            if (typeof showToast === 'function') {
                showToast('讨论已自动回复', 'success');
            }
        }
        _discussRunning = false;
    }

    // 详细诊断：列出当前页面所有"可能的视频位置"
    // 用于"立即找不到视频"时帮用户排查（仅在主控台输出，不污染UI）
    function diagnoseVideo() {
        const s = state && state.settings ? state.settings : null;
        const rate = s ? s.studyRate : 1.5;
        const vol = s ? s.studyVolume : 0;
        const videos = findAllVideos();
        console.log('[Study诊断] 找到 video/audio 元素:', videos.length);
        if (videos.length > 0) {
            for (const v of videos) {
                console.log('  - tag:', v.tagName, 'id:', v.id, 'class:', v.className, 'src:', v.src ? v.src.slice(0, 60) : '(无)');
            }
            // 顺便应用
            for (const v of videos) {
                applyOneVideo(v, rate, vol);
            }
            if (typeof addLog === 'function') {
                addLog(`刷课诊断: 找到 ${videos.length} 个视频，已应用${rate}x`, 'success');
            }
        } else {
            // 找不到时给详细诊断
            const iframes = document.querySelectorAll('iframe');
            const ids = ['#video', '#audio', '#video-box'].map(s => {
                try {
                    return s + (document.querySelector(s) ? '✓' : '✗');
                } catch (e) { return s + '?'; }
            }).join(' ');
            if (typeof addLog === 'function') {
                addLog(`刷课诊断: 未找到视频。iframe数=${iframes.length}，顶层选择器[${ids}]`, 'warn');
            }
            console.log('[Study诊断] 当前页面 iframe 数:', iframes.length);
            for (let i = 0; i < Math.min(iframes.length, 5); i++) {
                const f = iframes[i];
                console.log('  iframe[' + i + '] src:', (f.src || '').slice(0, 80));
            }
        }
        return videos.length;
    }

    // 自动解除暂停：检测到 paused 状态就 play()
    // 关键：play()可能被浏览器autoplay policy拒绝（"user didn't interact"）
    //      解决方法：play前先设 muted=true（muted play不受限制），
    //               然后用户配置里的音量再单独设
    function tryAutoUnpause() {
        if (!state.settings.studyAutoUnpause) return;
        const now = Date.now();
        // 1秒内只尝试一次（防抖）
        if (now - _STUDY.lastUnpauseAt < 1000) return;
        const videos = findAllVideos();
        for (const v of videos) {
            if (v.paused && !v.ended && v.readyState >= 2) {
                _STUDY.lastUnpauseAt = now;
                playWithErrorHandler(v).then(ok => {
                    if (ok && typeof addLog === 'function') {
                        addLog('刷课: 已自动播放', 'success');
                    }
                });
                break;  // 一次只处理一个
            }
        }
    }

    // ========== 找未完成章节（参考 OCS getChapterInfos）==========
    // 解析策略：
    // 1) 超星：[onclick^="getTeacherAjax"] + 隐藏 input.jobUnfinishCount
    // 2) 通用：.posCatalog_item / .chapter_item / .task-item 含 "已完成"/"未完成" icon
    // 3) 当前激活章节 = .posCatalog_active
    // 返回 [{element, unFinishCount, isActive}, ...] 或 []
    function findUnfinishedChapters() {
        const result = [];

        // ===== 策略1：超星 getTeacherAjax 元素 =====
        try {
            const els = document.querySelectorAll('[onclick^="getTeacherAjax"]');
            els.forEach(el => {
                let unFinish = 0;
                try {
                    const inp = el.parentElement ? el.parentElement.querySelector('.jobUnfinishCount') : null;
                    unFinish = parseInt(inp && inp.value ? inp.value : '0') || 0;
                } catch (e) {}
                result.push({
                    element: el,
                    unFinishCount: unFinish,
                    isActive: el.classList.contains('posCatalog_active') ||
                              (el.parentElement && el.parentElement.classList.contains('posCatalog_active')),
                    source: 'getTeacherAjax'
                });
            });
        } catch (e) {}

        if (result.length > 0) return result;

        // ===== 策略2：通用 task-item / chapter-item =====
        // 找包含"未完成"或"已完成"icon的列表项
        const candidateSelectors = [
            '.posCatalog_select',          // 超星左侧目录条目
            '.posCatalog_item',
            '.chapter_item',
            '.catalog_item',
            '.task-item',
            '.task_item',
            '.lesson-item',
            '.lesson_item',
            '.point-item',
            '.point_item',
            '.j-list .list',               // OCS在 .j-chapter .j-list .list
            '.j-chapter .list',
            'li[data-chapter-id]',
            'li[data-task-id]'
        ];
        for (const sel of candidateSelectors) {
            const nodes = document.querySelectorAll(sel);
            if (nodes.length === 0) continue;

            // 判断每个节点的"未完成数"
            // 启发式：找包含数字的"未完成"标签 / icon_Completed
            nodes.forEach(n => {
                let unFinish = 0;
                // 找显示未完成数的span
                const unSpan = n.querySelector('.unfinish-num, .unfinished-num, .jobUnfinishCount, .num-unfinish');
                if (unSpan) {
                    unFinish = parseInt(unSpan.textContent.trim() || unSpan.value || '0') || 0;
                } else {
                    // 找完成/未完成 icon
                    const completedIcon = n.querySelector('.icon_Completed, .icon-completed, .completed, .finish, .finished, .done');
                    const unfinishIcon = n.querySelector('.icon_unfinish, .icon-unfinish, .unfinish, .unfinished, .todo, .pending');
                    if (unfinishIcon) {
                        unFinish = 1;  // 至少1个未完成
                    } else if (!completedIcon) {
                        // 没icon = 不知道状态，保守算1（认为未完成）
                        unFinish = 1;
                    }
                }
                result.push({
                    element: n,
                    unFinishCount: unFinish,
                    isActive: n.classList.contains('active') ||
                              n.classList.contains('posCatalog_active') ||
                              n.classList.contains('currents') ||
                              n.classList.contains('current'),
                    source: 'generic'
                });
            });
            if (result.length > 0) break;
        }
        return result;
    }

    // ========== 跳到最早未完成章节（参考 OCS studyDispatcher）==========
    // 策略：找 unFinishCount > 0 的第一个 chapter，调 getTeacherAjax 跳转
    // silent=true: 不打印日志（用于循环里的常规检查）
    // silent=false: 是用户启动刷课时的首次跳转
    function tryJumpToFirstUnfinished(silent) {
        if (typeof state === 'undefined' || !state.settings) return;
        if (state.settings.studyAutoNext === false) return;

        const chapters = findUnfinishedChapters();
        if (chapters.length === 0) return;  // 还没加载完目录

        // 找第一个 unFinishCount > 0
        const first = chapters.find(c => c.unFinishCount > 0);
        if (!first) {
            if (!silent && typeof addLog === 'function') {
                addLog('刷课: 所有章节已完成，无可跳转目标', 'success');
            }
            return;
        }

        // 如果第一个未完成 = 当前激活章节，则不需要跳转
        if (first.isActive) {
            if (!silent && typeof addLog === 'function') {
                addLog('刷课: 当前已是最早未完成章节', 'info');
            }
            return;
        }

        // 跳转
        const now = Date.now();
        // 防抖：30秒内不重复跳（避免被OCS策略循环）
        if (now - _STUDY.lastJumpAt < 5000) return;
        _STUDY.lastJumpAt = now;

        try {
            if (first.source === 'getTeacherAjax' && typeof window.getTeacherAjax === 'function') {
                // 解析 onclick 参数 'courseId','classId','chapterId'
                const oc = first.element.getAttribute('onclick') || '';
                const m = oc.match(/\('(.*?)','(.*?)','(.*?)'\)/);
                if (m) {
                    window.getTeacherAjax(m[1], m[2], m[3]);
                    if (!silent && typeof addLog === 'function') {
                        addLog(`刷课: 已跳到最早未完成章节（chapterId=${m[3]}）`, 'success');
                    }
                    scheduleAfterJump('跳最早未完成');
                    return;
                }
            }
            // 通用：点 .posCatalog_name / a / 元素本身
            const target = first.element.querySelector('.posCatalog_name, .chapter_name, .job_name, .name, a, .leaf-title, .topic-title, .lesson-title, .unit-title, h3, h4, span')
                         || first.element;
            target.click();
            if (!silent && typeof addLog === 'function') {
                addLog('刷课: 已跳到最早未完成章节', 'success');
            }
            scheduleAfterJump('跳最早未完成');
        } catch (e) {
            if (typeof addLog === 'function') {
                addLog(`刷课: 跳最早未完成失败 - ${e.message || e}`, 'error');
            }
        }
    }

    // ========== 跳转后自动播放（参考 OCS playMedia + waitForMedia）==========
    // 三个跳转函数（tryJumpToFirstUnfinished / tryCorrectActiveChapter / tryJumpToNextUnfinishedChapter
    //              / tryAutoJumpTask）调 getTeacherAjax/click 后，新章节视频是异步加载的。
    // OCS 的做法是 waitForMedia(src 长度>0) → video.play()。
    // 我的实现：3秒后每隔 1 秒轮询（最多10次），找"未在播放的、有 src 的 video"，调 playWithErrorHandler。
    function scheduleAfterJump(reason) {
        try {
            const seenTags = new Set();  // 同一个 video 只激活一次
            let attempts = 0;
            const startTs = Date.now();

            // 跳过已 ended 的、已有 src 的视频（说明刚加载完）
            const tick = () => {
                attempts++;
                if (attempts > 10) return;  // 最多 10 秒
                if (!_STUDY.running) return;

                const videos = findAllVideos();
                let activated = 0;
                for (const v of videos) {
                    if (seenTags.has(v)) continue;
                    if (!v.src || v.src.length === 0) continue;
                    if (v.ended) { seenTags.add(v); continue; }
                    // 跳过明显是弹窗/小窗的视频（宽高 < 200）
                    try {
                        if (v.videoWidth > 0 && v.videoWidth < 200) { seenTags.add(v); continue; }
                    } catch (e) {}
                    // 还没播放过 + 还没结束 → 激活
                    if (v.paused && v.readyState >= 1) {
                        // 先应用倍速/音量
                        try {
                            if (state.settings.studyRate) v.playbackRate = state.settings.studyRate;
                            if (typeof state.settings.studyVolume === 'number') {
                                v.volume = state.settings.studyVolume / 100;
                            }
                        } catch (e) {}
                        // 强制播放
                        playWithErrorHandler(v);
                        activated++;
                    }
                    seenTags.add(v);
                }

                // 3秒内没激活成功 → 继续等（视频可能还在缓冲）
                if (activated === 0 && (Date.now() - startTs) < 10000) {
                    const t = setTimeout(tick, 1000);
                    _STUDY._jumpTimers = _STUDY._jumpTimers || [];
                    _STUDY._jumpTimers.push(t);
                } else if (activated > 0 && typeof addLog === 'function') {
                    addLog(`刷课: 跳转后已自动激活 ${activated} 个视频（${reason}）`, 'success');
                }
            };
            // 3秒后开始（给 DOM 渲染 + 视频元数据加载时间）
            const t = setTimeout(tick, 3000);
            _STUDY._jumpTimers = _STUDY._jumpTimers || [];
            _STUDY._jumpTimers.push(t);
        } catch (e) {
            if (typeof addLog === 'function') {
                addLog(`刷课: 跳转后激活失败 - ${e.message || e}`, 'error');
            }
        }
    }

    // ========== 修正调度：让"当前激活章节"始终保持"最早未完成"（参考 OCS 目录策略）==========
    // 用户场景：
    //   1,2,3,4,5,6 六个任务点，用户手动点了第3个
    //   → 脚本要主动跳回第1个（最早未完成）
    //   → 视频看完后 → 跳第2个
    //   → 第2个看完 → 跳第3个（用户之前点过的）…
    // 触发条件：每3秒检查一次（不能太频繁否则会闪）
    // 与 tryAutoJumpTask 不冲突：tryAutoJumpTask 只在"视频 ended"时跳；本函数是"主动修正"
    function tryCorrectActiveChapter() {
        if (!state.settings.studyAutoNext) return;
        const now = Date.now();
        // 防抖：8秒内不重复修正（避免和 tryAutoJumpTask 撞车）
        if (now - _STUDY.lastJumpAt < 8000) return;

        // 1) 如果刚启动/视频还没加载完（防抖 30 秒内不检查）
        if (now - (_STUDY.startedAt || 0) < 3000) return;

        // 2) 如果有视频在播放，等它自然结束再跳（避免中断用户学习）
        const videos = findAllVideos();
        let hasPlaying = false;
        for (const v of videos) {
            if (!v.paused && !v.ended && v.readyState >= 2) {
                hasPlaying = true;
                break;
            }
        }
        if (hasPlaying) return;

        // 3) 找所有未完成章节
        const chapters = (typeof findUnfinishedChapters === 'function') ? findUnfinishedChapters() : [];
        if (chapters.length === 0) return;  // 目录还没加载

        // 4) 找"最早未完成"（包含未完成题目也算）
        const firstUnfinished = chapters.find(c => c.unFinishCount > 0);
        if (!firstUnfinished) {
            // 所有章节都完成了，不动
            return;
        }

        // 5) 当前激活章节 = 最早未完成？→ OK
        if (firstUnfinished.isActive) {
            return;
        }

        // 6) 当前激活 ≠ 最早未完成 → 强制跳回
        _STUDY.lastJumpAt = now;
        try {
            if (firstUnfinished.source === 'getTeacherAjax' && typeof window.getTeacherAjax === 'function') {
                const oc = firstUnfinished.element.getAttribute('onclick') || '';
                const m = oc.match(/\('(.*?)','(.*?)','(.*?)'\)/);
                if (m) {
                    window.getTeacherAjax(m[1], m[2], m[3]);
                    if (typeof addLog === 'function') {
                        addLog(`刷课: 检测到当前章节不是最早未完成，已强制跳回（chapterId=${m[3]}）`, 'success');
                    }
                    scheduleAfterJump('修正调度-跳回最早');
                    return;
                }
            }
            const target = firstUnfinished.element.querySelector('.posCatalog_name, .chapter_name, .job_name, .name, a, .leaf-title, .topic-title, .lesson-title, .unit-title, h3, h4, span')
                         || firstUnfinished.element;
            target.click();
            if (typeof addLog === 'function') {
                addLog('刷课: 检测到当前章节不是最早未完成，已强制跳回最早未完成章节', 'success');
            }
            scheduleAfterJump('修正调度-跳回最早');
        } catch (e) {
            if (typeof addLog === 'function') {
                addLog(`刷课: 强制跳回失败 - ${e.message || e}`, 'error');
            }
        }
    }

    // ========== 找当前章节的下一个未完成章节（OCS getNext 思路）==========
    // 区别于 tryCorrectActiveChapter：
    //   tryCorrectActiveChapter：主动修正（用户点了非最早未完成）
    //   tryJumpToNextUnfinishedChapter：被动推进（视频自然结束/题目做完后）
    function tryJumpToNextUnfinishedChapter() {
        if (!state.settings.studyAutoNext) return;
        const now = Date.now();
        if (now - _STUDY.lastJumpAt < 5000) return;

        const chapters = (typeof findUnfinishedChapters === 'function') ? findUnfinishedChapters() : [];
        if (chapters.length === 0) return;

        // 找当前激活章节的索引
        const currentIdx = chapters.findIndex(c => c.isActive);
        if (currentIdx === -1) {
            // 没有激活章节 → 跳最早未完成
            return tryJumpToFirstUnfinished(true);
        }

        // 找当前章节之后的"第一个未完成章节"
        const nextUnfinished = chapters.slice(currentIdx + 1).find(c => c.unFinishCount > 0);
        if (!nextUnfinished) {
            // 后面没有了 → 全部完成
            if (typeof addLog === 'function') {
                addLog('刷课: 当前章节之后没有未完成章节，全部任务点已学完', 'success');
            }
            return;
        }

        // 跳到下一个未完成
        _STUDY.lastJumpAt = now;
        try {
            if (nextUnfinished.source === 'getTeacherAjax' && typeof window.getTeacherAjax === 'function') {
                const oc = nextUnfinished.element.getAttribute('onclick') || '';
                const m = oc.match(/\('(.*?)','(.*?)','(.*?)'\)/);
                if (m) {
                    window.getTeacherAjax(m[1], m[2], m[3]);
                    if (typeof addLog === 'function') {
                        addLog(`刷课: 跳到下一个未完成章节（chapterId=${m[3]}）`, 'success');
                    }
                    scheduleAfterJump('跳下一个未完成');
                    return;
                }
            }
            const target = nextUnfinished.element.querySelector('.posCatalog_name, .chapter_name, .job_name, .name, a, .leaf-title, .topic-title, .lesson-title, .unit-title, h3, h4, span')
                         || nextUnfinished.element;
            target.click();
            if (typeof addLog === 'function') {
                addLog('刷课: 跳到下一个未完成章节', 'success');
            }
            scheduleAfterJump('跳下一个未完成');
        } catch (e) {
            if (typeof addLog === 'function') {
                addLog(`刷课: 跳下一个未完成失败 - ${e.message || e}`, 'error');
            }
        }
    }

    // 自动跳任务点：当前视频 ended → 找下一个未完成任务点
    // 策略（参考 OCS studyDispatcher）：优先跳到"最早未完成章节"
    // 因为视频看完就算完成（题目不影响），不一定要按 next 顺序
    function tryAutoJumpTask() {
        if (!state.settings.studyAutoNext) return;
        const now = Date.now();
        // 5秒防抖（任务点跳转是个大动作）
        if (now - _STUDY.lastJumpAt < 5000) return;

        // 检查是否所有视频都已结束
        const videos = findAllVideos();
        let allEnded = videos.length > 0;
        for (const v of videos) {
            if (!v.ended) { allEnded = false; break; }
        }
        if (!allEnded) return;

        // ===== 优先策略：跳到"最早未完成章节"（OCS 做法）=====
        // 先看是否有可识别的chapter列表
        const chapters = (typeof findUnfinishedChapters === 'function') ? findUnfinishedChapters() : [];
        if (chapters.length > 0) {
            const first = chapters.find(c => c.unFinishCount > 0);
            if (first && !first.isActive) {
                // 跳到最早未完成
                _STUDY.lastJumpAt = now;
                try {
                    if (first.source === 'getTeacherAjax' && typeof window.getTeacherAjax === 'function') {
                        const oc = first.element.getAttribute('onclick') || '';
                        const m = oc.match(/\('(.*?)','(.*?)','(.*?)'\)/);
                        if (m) {
                            window.getTeacherAjax(m[1], m[2], m[3]);
                            if (typeof addLog === 'function') {
                                addLog(`刷课: 视频已看完，跳到最早未完成章节（chapterId=${m[3]}）`, 'success');
                            }
                            scheduleAfterJump('视频结束-跳最早');
                            return;
                        }
                    }
                    const target = first.element.querySelector('.posCatalog_name, .chapter_name, .job_name, .name, a, .leaf-title, .topic-title, .lesson-title, .unit-title, h3, h4, span')
                                 || first.element;
                    target.click();
                    if (typeof addLog === 'function') {
                        addLog('刷课: 视频已看完，跳到最早未完成章节', 'success');
                    }
                    scheduleAfterJump('视频结束-跳最早');
                } catch (e) {}
                return;
            }
        }

        // ===== 兜底策略：原"next"逻辑（没解析出chapter列表时）=====
        // 获取当前平台（用于加载平台特定选区器）
        const platform = (typeof detectPlatform === 'function') ? detectPlatform() : null;
        const platformSels = platform && platform.selectors ? platform.selectors : {};

        // 找下一个任务点（参考OCS的posCatalog_active/posCatalog_name选择器 + 平台选区器）
        // 候选选择器：先试平台专用，再试通用（参考 OCS JobRunner.media）
        const candidates = [
            // 超星专用
            '.posCatalog_active + .posCatalog_item, .posCatalog_active ~ .posCatalog_item',
            '.posCatalog_name',
            '.job_item:not(.finished)',
            '.chapter_item:not(.finished)',
            '.catalog_item:not(.finished)',
            '.task-point:not(.finished)',
            // 平台专用
            (platformSels.taskPoint || '') + ' ~ *:not(.finished):not(.complete)',
            // 通用：tab栏下一个
            '.tabtags .currents + *, .tabs .currents ~ *:not(.finished):not(.complete)',
            // 通用：菜单下一项
            '.menu-item.active ~ .menu-item:not(.finished)',
            // 通用：列表下一项
            'li.active + li, li.currents + li, li.currents ~ li'
        ].filter(s => s && s.trim());

        for (const sel of candidates) {
            // 找包含"完成"或非active的项
            let nextNode = null;
            if (sel.includes('posCatalog_active')) {
                const active = document.querySelector('.posCatalog_active');
                if (active && active.nextElementSibling) {
                    nextNode = active.nextElementSibling;
                }
            } else {
                const nodes = document.querySelectorAll(sel);
                for (const n of nodes) {
                    if (n !== document.querySelector('.posCatalog_active') &&
                        !n.classList.contains('finished') &&
                        !n.classList.contains('complete')) {
                        nextNode = n;
                        break;
                    }
                }
            }

            if (nextNode) {
                _STUDY.lastJumpAt = now;
                const platformName = platform ? platform.name : '当前平台';
                if (typeof addLog === 'function') {
                    addLog(`刷课: 当前任务点完成，即将跳转下一项（${platformName}）`, 'success');
                }
                try {
                    // 优先点击内部锚点或name节点（OCS的做法）
                    const target = nextNode.querySelector('.posCatalog_name, .chapter_name, .job_name, .name, a, .leaf-title, .topic-title, .lesson-title, .unit-title')
                                 || nextNode;
                    target.click();
                    scheduleAfterJump('兜底-next');
                } catch (e) {}
                return;
            }
        }
    }

    // 自动连播：视频ended → 找下一个video source并切换
    function tryAutoLoop() {
        if (!state.settings.studyLoop) return;
        // 跟 tryAutoJumpTask 共享逻辑：都靠点击下一个任务点
        tryAutoJumpTask();
    }

    // 自动关弹窗：检测 "习惯分已满" / "确认" / "是否继续" 等弹窗
    function tryCloseDialog() {
        if (!state.settings.studyAutoCloseDialog) return;
        const now = Date.now();
        if (now - _STUDY.lastCloseAt < 2000) return;

        // 学习通习惯分弹窗："当天学习时间已满"
        // 超星确认弹窗：确定/关闭按钮
        const dialogSelectors = [
            { sel: '.layui-layer-btn0, .layui-layer-btn a', text: '确定' },     // layui弹窗"确定"
            { sel: '.el-message-box__btns button.el-button--primary', text: '确定' }, // elementUI
            { sel: '.ant-modal-confirm-btns button.ant-btn-primary', text: '确定' },   // antd
            { sel: '.dialog-footer .btn-primary, .dialog button.btn-primary', text: '确定' },
            { sel: 'button:contains("确定"):visible', text: '确定' },
            { sel: 'button:contains("我知道了"):visible', text: '我知道了' },
            { sel: 'button:contains("继续学习"):visible', text: '继续学习' }
        ];

        for (const { sel, text } of dialogSelectors) {
            try {
                let btns = [];
                if (sel.includes(':contains')) {
                    // 自定义contains选择器（jQuery风格，原生不支持）
                    const baseSel = sel.split(':contains')[0] || 'button';
                    const all = document.querySelectorAll(baseSel);
                    btns = Array.from(all).filter(b => {
                        if (b.offsetParent === null && sel.includes(':visible')) return false; // 不可见
                        const t = (b.textContent || '').trim();
                        return t === text || t.includes(text);
                    });
                } else {
                    btns = Array.from(document.querySelectorAll(sel)).filter(b => {
                        const rect = b.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;  // 可见
                    });
                }
                if (btns.length > 0) {
                    btns[0].click();
                    _STUDY.lastCloseAt = now;
                    if (typeof addLog === 'function') {
                        addLog(`刷课: 自动关闭弹窗（${text}）`, 'info');
                    }
                    return;
                }
            } catch (e) {}
        }
    }

    // 视频内嵌题目（参考OCS的ans-videoquiz处理）
    // 学习通在某些视频里会暂停播放，弹出选择题让用户做
    // 策略：随机选一个 → 点提交按钮 → 移除题目容器（让视频继续播）
    function handleVideoQuiz() {
        // 找当前可见的内嵌题目容器
        // OCS选择器：#video .ans-videoquiz；扩展支持：雨课堂、MOOC、智慧树、智慧职教
        const platform = (typeof detectPlatform === 'function') ? detectPlatform() : null;
        const platformSels = platform && platform.selectors ? platform.selectors : {};

        const quizContainers = [
            '#video .ans-videoquiz',
            '.ans-videoquiz',
            '.videoquiz',
            '.video-quiz',
            '#videoquiz',
            '.x-videoquiz',
            '.ans-task-videoquiz',
            '.video_popup',  // 部分平台
            '.exam_popup',
            // 平台专用
            platformSels.videoQuizPanel,
            // 跨平台兜底
            '.topic-item:not(.done)',
            '.video-question',
            '.quiz-popup'
        ].filter(Boolean);
        for (const sel of quizContainers) {
            let containers = [];
            try { containers = Array.from(document.querySelectorAll(sel)); } catch(e){ continue; }
            for (const box of containers) {
                // 检查是否真的可见
                if (!box || !box.offsetParent) continue;
                // 找选项
                const optionSelectors = [
                    '.ans-videoquiz-opt label',
                    '.ans-videoquiz-option',
                    '.videoquiz-option',
                    '.option-item',
                    'label.radio',
                    'input[type="radio"]',
                    '.x-option',
                    // 跨平台
                    'label[for]',
                    '.option',
                    '.choice',
                    'li[role="option"]'
                ];
                let options = [];
                for (const os of optionSelectors) {
                    try {
                        const found = box.querySelectorAll(os);
                        if (found && found.length > 0) {
                            options = Array.from(found);
                            break;
                        }
                    } catch(e){}
                }
                if (options.length === 0) continue;
                // 随机选一个
                const pick = options[Math.floor(Math.random() * options.length)];
                // 模拟点击选项（label + 内部input都要点）
                if (typeof addLog === 'function') {
                    const labelText = (pick.textContent || '').trim().slice(0, 30);
                    addLog(`刷课: 视频内嵌题-选 [${labelText}]`, 'info');
                }
                try { pick.click(); } catch(e){}
                // label里如果有input也点
                const input = pick.querySelector && pick.querySelector('input');
                if (input) { try { input.click(); } catch(e){} }
                // 找提交按钮
                const submitSelectors = [
                    '#videoquiz-submit',
                    '.ans-videoquiz-submit',
                    '.videoquiz-submit',
                    'button.submit',
                    'button[type="submit"]',
                    'a.submit'
                ];
                let submitBtn = null;
                for (const ss of submitSelectors) {
                    try {
                        const f = box.querySelector(ss);
                        if (f) { submitBtn = f; break; }
                    } catch(e){}
                }
                // 也找全局提交按钮
                if (!submitBtn) {
                    for (const ss of submitSelectors) {
                        try {
                            const f = document.querySelector(ss);
                            if (f) { submitBtn = f; break; }
                        } catch(e){}
                    }
                }
                // 兜底：找包含"提交"文字的按钮
                if (!submitBtn) {
                    const allBtns = document.querySelectorAll('button, a');
                    for (const b of allBtns) {
                        const t = (b.textContent || '').trim();
                        if (t === '提交' || t === '提交答案' || t === '确认提交' || t === '提交试题') {
                            submitBtn = b; break;
                        }
                    }
                }
                if (submitBtn) {
                    setTimeout(() => {
                        try {
                            submitBtn.click();
                            if (typeof addLog === 'function') {
                                addLog('刷课: 视频内嵌题-已提交', 'success');
                            }
                            // OCS的做法：提交后立即移除容器+隐藏x-component
                            setTimeout(() => {
                                try { box.remove(); } catch(e){}
                                // 隐藏可能的弹窗覆盖层
                                document.querySelectorAll('.x-component-default').forEach(c => {
                                    try { c.style.display = 'none'; } catch(e){}
                                });
                            }, 500);
                        } catch(e){}
                    }, 300);
                }
                return true; // 处理了一个
            }
        }
        return false;
    }

    // 反鼠标检测：劫持 document 的 mouseleave / visibilitychange 事件
    // 思路：阻止播放器自带的"鼠标离开就暂停"事件触发
    // 注意：超星/学习通的检测方式多种多样，这里用**统一拦截**的方式
    function setupAntiMouseLeave() {
        if (!state.settings.studyAntiPause) return;
        // 已经设过标记，避免重复挂监听
        if (window._aa_anti_mouse_installed) return;
        window._aa_anti_mouse_installed = true;

        // 1. 重写 video 的 pause 方法（让"检测到鼠标离开就pause"失效）
        const origPause = HTMLMediaElement.prototype.pause;
        // 存到window以便停止时还原
        window._aa_orig_pause = origPause;
        HTMLMediaElement.prototype.pause = function() {
            // 如果是反鼠标检测导致的暂停（不是用户主动暂停），拦截
            if (window._aa_user_intended_pause) {
                return origPause.apply(this, arguments);
            }
            // 否则静默（什么也不做）
            // 但同时启动自动恢复
            if (state.settings.studyAutoUnpause && this.paused === false) {
                // 注意：pause 还没执行，但参数已到
            }
            // 用 setTimeout 0 让 play 在 pause 之后执行
            setTimeout(() => {
                if (!this.ended && this.paused) {
                    this.play().catch(() => {});
                }
            }, 0);
        };

        // 2. 拦截 mcpaperwrapper 等容器的 mouseleave
        //    学习通：播放器最外层是 #video 或者 .vjs-tech，hover检测在它们的祖先元素上
        const blockLeave = (e) => {
            // 阻止冒泡到检测层（不调用 stopImmediatePropagation，保留其他正常监听）
            // 这里什么都不做，依赖 video.pause 的覆盖
        };
        document.addEventListener('mouseleave', blockLeave, true);
        document.addEventListener('mouseout', blockLeave, true);

        if (typeof addLog === 'function') {
            addLog('刷课: 反鼠标检测已挂载', 'info');
        }
    }

    // ========== 视频自动播放核心逻辑（页面刷新后也能恢复）==========
    // 问题：getTeacherAjax 会刷新页面，导致跳转前的定时器被取消
    // 解决方案：每次 startStudy 时启动一个"视频监控器"，持续检测并播放视频
    // 策略（参考 OCS JobRunner.media）：
    //   1. 持续轮询查找未播放的视频
    //   2. 检测到新视频时立即播放
    //   3. 使用 playWithErrorHandler 处理 autoplay 限制
    let _videoMonitorInterval = null;
    let _lastActivatedSrc = '';

    function startVideoMonitor() {
        // 停止已有的监控
        if (_videoMonitorInterval) {
            clearInterval(_videoMonitorInterval);
        }

        let consecutiveNoVideo = 0;
        let consecutiveNoPlay = 0;

        _videoMonitorInterval = setInterval(() => {
            if (!_STUDY.running) {
                clearInterval(_videoMonitorInterval);
                _videoMonitorInterval = null;
                return;
            }

            const videos = findAllVideos();

            // 没有视频时的处理
            if (videos.length === 0) {
                consecutiveNoVideo++;
                consecutiveNoPlay = 0;
                // 连续 30 秒没有视频，停止监控（节省资源）
                if (consecutiveNoVideo > 30) {
                    if (typeof addLog === 'function') {
                        addLog('刷课: 30秒内未检测到视频，暂停监控', 'info');
                    }
                    clearInterval(_videoMonitorInterval);
                    _videoMonitorInterval = null;
                }
                return;
            }

            consecutiveNoVideo = 0;

            // 遍历所有视频
            for (const v of videos) {
                // 跳过已结束的
                if (v.ended) continue;

                // 跳过正在播放的
                if (!v.paused) {
                    consecutiveNoPlay = 0;
                    continue;
                }

                // 跳过没有有效 src 的
                if (!v.src || v.src.length === 0) continue;

                // 跳过小窗/弹窗视频（宽高 < 200）
                try {
                    if (v.videoWidth > 0 && v.videoWidth < 200) continue;
                    if (v.videoHeight > 0 && v.videoHeight < 200) continue;
                } catch (e) {}

                // 检测是否是新的视频（src 变化了）
                const isNewVideo = (v.src !== _lastActivatedSrc && _lastActivatedSrc !== '');

                // 尝试播放
                consecutiveNoPlay++;
                if (consecutiveNoPlay <= 3 || isNewVideo) {
                    // 先应用倍速和音量
                    try {
                        if (state.settings.studyRate) v.playbackRate = state.settings.studyRate;
                        if (typeof state.settings.studyVolume === 'number') {
                            v.volume = state.settings.studyVolume / 100;
                        }
                    } catch (e) {}

                    // 播放
                    const ok = playWithErrorHandler(v);
                    if (ok && typeof addLog === 'function') {
                        _lastActivatedSrc = v.src;
                        const reason = isNewVideo ? '检测到新视频' : '自动恢复播放';
                        addLog(`刷课: ${reason}（${v.videoWidth}x${v.videoHeight}）`, 'success');
                    }
                }
            }
        }, 1000);
    }

    // ========== 页面可见性变化时重新激活视频（参考 OCS visibilitychange）==========
    // 当用户切换标签页回来时，浏览器可能会暂停视频，需要重新激活
    function setupVisibilityMonitor() {
        document.removeEventListener('visibilitychange', _handleVisibilityChange);
        document.addEventListener('visibilitychange', _handleVisibilityChange);
    }

    function _handleVisibilityChange() {
        if (document.visibilityState === 'visible' && _STUDY.running) {
            // 页面重新可见时，等待 1 秒后重新激活视频
            setTimeout(() => {
                if (!_STUDY.running) return;
                const videos = findAllVideos();
                let activated = 0;
                for (const v of videos) {
                    if (v.paused && !v.ended && v.readyState >= 2 && v.src && v.src.length > 0) {
                        try {
                            if (state.settings.studyRate) v.playbackRate = state.settings.studyRate;
                            if (typeof state.settings.studyVolume === 'number') {
                                v.volume = state.settings.studyVolume / 100;
                            }
                            playWithErrorHandler(v);
                            activated++;
                        } catch (e) {}
                    }
                }
                if (activated > 0 && typeof addLog === 'function') {
                    addLog(`刷课: 页面恢复，已激活 ${activated} 个视频`, 'success');
                }
            }, 1000);
        }
    }

    // ========== 页面加载完成时等待并播放（参考 OCS waitForMedia + 3秒延迟）==========
    function setupPageLoadMonitor() {
        // 页面加载完成后，等待 3 秒让视频加载，然后尝试播放
        // 这个逻辑在每次页面完全加载时都会执行
        if (document.readyState === 'complete') {
            onPageFullyLoaded();
        } else {
            window.addEventListener('load', onPageFullyLoaded);
        }
    }

    function onPageFullyLoaded() {
        if (!_STUDY.running) return;

        // 等待 3 秒让视频元数据加载（参考 OCS study 函数的 3 秒延迟）
        setTimeout(() => {
            if (!_STUDY.running) return;

            const videos = findAllVideos();
            let activated = 0;
            for (const v of videos) {
                if (v.paused && !v.ended && v.readyState >= 1 && v.src && v.src.length > 0) {
                    try {
                        if (state.settings.studyRate) v.playbackRate = state.settings.studyRate;
                        if (typeof state.settings.studyVolume === 'number') {
                            v.volume = state.settings.studyVolume / 100;
                        }
                        playWithErrorHandler(v);
                        activated++;
                    } catch (e) {}
                }
            }
            if (activated > 0 && typeof addLog === 'function') {
                addLog(`刷课: 页面加载完成，已激活 ${activated} 个视频`, 'success');
            }

            // 启动持续监控
            startVideoMonitor();
        }, 3000);
    }

    // 开始刷课
    function startStudy() {
        if (_STUDY.running) {
            if (typeof showToast === 'function') showToast('刷课已在运行', 'info');
            return;
        }
        _STUDY.running = true;
        state.settings.studyEnabled = true;
        if (typeof saveAllConfig === 'function') saveAllConfig();

        // 立即应用一次
        applyStudyRate(state.settings.studyRate, state.settings.studyVolume);

        // 挂反鼠标检测（一次性）
        setupAntiMouseLeave();

        // 挂可见性监控（页面切换回来时重新激活视频）
        setupVisibilityMonitor();

        // 挂页面加载监控（页面刷新后自动播放）
        setupPageLoadMonitor();

        // 关键：用户在点"▶开始"时，浏览器把这个事件当作"用户激活"，
        // 在这个事件处理函数的同步执行流里调 play() 不受autoplay policy限制。
        // 我们立即尝试给所有video play()，抢这个激活窗口
        try {
            const vs = findAllVideos();
            let playedCount = 0;
            for (const v of vs) {
                if (v.paused && !v.ended) {
                    const r = playWithErrorHandler(v);
                    if (r && typeof r.then === 'function') {
                        r.then(ok => { if (ok) playedCount++; });
                    }
                }
            }
            if (playedCount > 0 && typeof addLog === 'function') {
                addLog(`刷课: 启动时已激活播放 ${playedCount} 个视频`, 'success');
            }
        } catch (e) {}

        // 记录启动时间（给 tryCorrectActiveChapter 防抖用）
        _STUDY.startedAt = Date.now();

        // 立即启动视频监控（覆盖页面已加载的情况）
        startVideoMonitor();

        // 启动后2秒 + 5秒 各尝试一次"跳到最早未完成章节"（给目录加载留时间）
        setTimeout(() => { try { tryJumpToFirstUnfinished(false); } catch (e) {} }, 2000);
        setTimeout(() => { try { tryJumpToFirstUnfinished(false); } catch (e) {} }, 5000);

        // 主循环：每1秒检查一次（参考OCS的轮询节奏，200ms太长会刷屏，1s平衡）
        _STUDY.intervalId = setInterval(() => {
            if (!_STUDY.running) {
                _STUDY.stop();
                return;
            }
            try {
                // 0) 修复控制条（OCS fixedVideoProgress）
                fixControlBar();
                // 0.5) 视频加载失败检测 + 人脸识别
                checkVideoLoadError();
                checkFaceRecognition();
                // 1) 给新出现的video应用倍速（迟加载的视频）
                applyStudyRate(state.settings.studyRate, state.settings.studyVolume);
                // 2) 视频内嵌题目（必须放最前，题目会卡视频）
                if (state.settings.studyHandleVideoQuiz) {
                    handleVideoQuiz();
                }
                // 2.5) 读章节（PPT/书籍/长时阅读）
                if (typeof tryReadTask === 'function') {
                    tryReadTask();
                }
                // 2.6) 讨论自动回复
                if (typeof tryDiscuss === 'function') {
                    tryDiscuss();
                }
                // 3) 自动解除暂停
                tryAutoUnpause();
                // 4) 自动连播（任务点跳转）
                tryAutoLoop();
                // 4.5) 修正调度：每3秒检查一次"当前激活章节是否是最早未完成"
                //      用户场景：6个任务点，手动点了第3个 → 强制跳回第1个
                _STUDY._correctTick = (_STUDY._correctTick || 0) + 1;
                if (_STUDY._correctTick >= 3) {
                    _STUDY._correctTick = 0;
                    if (typeof tryCorrectActiveChapter === 'function') {
                        tryCorrectActiveChapter();
                    }
                }
                // 5) 自动关弹窗
                tryCloseDialog();
            } catch (e) {
                console.error('[StudyLoop] 错误:', e);
            }
        }, 1000);

        if (typeof addLog === 'function') {
            addLog(`刷课: 已启动（倍速${state.settings.studyRate}x / 音量${state.settings.studyVolume}）`, 'success');
        }
        if (typeof showToast === 'function') {
            showToast('刷课已启动', 'success');
        }
    }

    // 停止刷课：不仅清主循环，还要真把视频pause()掉、解除反鼠标劫持
    function stopStudy() {
        state.settings.studyEnabled = false;
        if (typeof saveAllConfig === 'function') saveAllConfig();
        // 主动 pause 所有正在播放的视频
        try {
            const vs = findAllVideos();
            for (const v of vs) {
                if (!v.paused) {
                    try { v.pause(); } catch (e) {}
                }
            }
        } catch (e) {}
        // 解除反鼠标劫持
        if (window._aa_orig_pause) {
            try { HTMLMediaElement.prototype.pause = window._aa_orig_pause; } catch (e) {}
            window._aa_orig_pause = null;
        }
        window._aa_anti_mouse_installed = false;
        // 重置读章节 + 讨论 状态（让用户重新启动刷课时能处理下一个任务点）
        try { _readTaskRunning = false; _readTaskDone = false; } catch (e) {}
        try { _discussRunning = false; _discussDone = false; } catch (e) {}
        // 清掉 scheduleAfterJump 的轮询定时器
        try {
            if (_STUDY._jumpTimers) {
                _STUDY._jumpTimers.forEach(t => { try { clearTimeout(t); } catch (e) {} });
                _STUDY._jumpTimers = [];
            }
        } catch (e) {}
        // 清掉视频监控器
        try {
            if (_videoMonitorInterval) {
                clearInterval(_videoMonitorInterval);
                _videoMonitorInterval = null;
            }
        } catch (e) {}
        // 移除可见性监控（避免内存泄漏）
        try {
            document.removeEventListener('visibilitychange', _handleVisibilityChange);
        } catch (e) {}
        // 重置视频监控状态
        _lastActivatedSrc = '';
        _STUDY.stop();
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

        // 平台检测（参考 OCS 4.13.19 的 Project.domains 匹配）
        const platform = (typeof detectPlatform === 'function') ? detectPlatform() : null;
        if (platform) {
            console.log('%c[智能答题助手Pro]%c 当前平台: ' + platform.name +
                ' | 已加载平台专用选区器 (nextBtn: ' + (platform.selectors.nextBtn || '-') +
                ', videoQuiz: ' + (platform.selectors.videoQuizPanel || '-') + ')',
                'color:#2563eb;font-weight:bold', 'color:#666');
            if (typeof addLog === 'function') {
                addLog(`平台适配: ${platform.name}（已启用该平台专用刷课逻辑）`, 'info');
            }
        } else {
            if (typeof addLog === 'function') {
                addLog('平台适配: 当前网站未在内置平台列表，使用通用刷课逻辑', 'info');
            }
        }

        console.log('%c[智能答题助手Pro]%c v5.0.0 已加载 | 支持自动搜题+最新AI模型', 'color:#2563eb;font-weight:bold', 'color:#666');

        // 自动启动刷课（如果用户开启）
        // 等面板创建完+视频可能还没加载，等2秒后启动
        if (state.settings.studyAutoStartOnLoad) {
            setTimeout(() => {
                if (!_STUDY.running && typeof startStudy === 'function') {
                    const pname = platform ? platform.name : '当前平台';
                    addLog(`刷课: 检测到开启【进入页面自动启动】(平台: ${pname})，2秒后自动开始`, 'info');
                    // 用户没在画面——play()可能会被autoplay policy拒绝
                    // 解决：模拟一次用户点击（dispatchEvent不增加激活时间）
                    // 最稳：先提示用户"首次请手动点一下视频以激活浏览器"
                    showToast('已自动启动刷课（首次请手动点一下视频以激活）', 'info');
                    startStudy();
                }
            }, 2000);
        }
    }

    init();

})();
