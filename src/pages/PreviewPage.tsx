import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loadSettings } from "../store/settingsStore";
import StyleEditor from "../components/StyleEditor";
import BlockEditPanel from "../components/BlockEditPanel";
import { StyleConfig, BlockType, BlockStyle, BlockOverrideMap } from "../types/style";
import { buildStyleContent, buildFinalHtml, buildWpHtml, removeDeletedBlocks } from "../utils/applyStyles";
import { loadCustomCss } from "../store/customCssStore";

interface Props {
    html: string;
    title: string;
    defaultStyleConfig: StyleConfig;
}

interface SelectedBlock {
    blockIndex: number;
    blockType: BlockType;
}

export default function PreviewPage({ html, title, defaultStyleConfig }: Props) {
    const [styleConfig, setStyleConfig] = useState<StyleConfig>(defaultStyleConfig);
    const [overrides, setOverrides] = useState<BlockOverrideMap>({});
    const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(null);
    const [posting, setPosting] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [customCss, setCustomCss] = useState("");
    const [deletedBlocks, setDeletedBlocks] = useState<Set<string>>(new Set());
    const prevDefaultStyleConfig = useRef(defaultStyleConfig);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeReady, setIframeReady] = useState(false);

    useEffect(() => {
        loadCustomCss().then(setCustomCss);
    }, [html]);

    useEffect(() => {
        setStyleConfig(defaultStyleConfig);
    }, [defaultStyleConfig]);

    // 接收 iframe 訊息
    useEffect(() => {
        function handleMessage(e: MessageEvent) {
            if (e.data?.type === "block-click") {
                setSelectedBlock({
                    blockIndex: e.data.blockIndex,
                    blockType: e.data.blockType as BlockType,
                });
            }
            if (e.data?.type === "iframe-ready") {
                setIframeReady(true);
            }
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // iframe ready 後推送初始樣式
    useEffect(() => {
        if (!iframeReady) return;
        pushStylesToIframe();
    }, [iframeReady]);

    // 樣式變動時推送，不重載 iframe
    useEffect(() => {
        if (!iframeReady) return;
        pushStylesToIframe();
    }, [styleConfig, overrides, deletedBlocks, customCss]);

    // html 變動時重置 iframe
    useEffect(() => {
        setIframeReady(false);
        setStyleConfig(defaultStyleConfig);
        setOverrides({});
        setDeletedBlocks(new Set());
    }, [html]);

    useEffect(() => {
        const defaultChanged =
            JSON.stringify(prevDefaultStyleConfig.current) !==
            JSON.stringify(defaultStyleConfig);

        prevDefaultStyleConfig.current = defaultStyleConfig;

        if (defaultChanged) {
            // 只更新 styleConfig，不清空 overrides（保留使用者的 per-block 編輯）
            setStyleConfig(defaultStyleConfig);
        }
    }, [defaultStyleConfig]);

    // 接收 iframe 點擊事件
    useEffect(() => {
        function handleMessage(e: MessageEvent) {
            if (e.data?.type === "block-click") {
                setSelectedBlock({
                    blockIndex: e.data.blockIndex,
                    blockType: e.data.blockType as BlockType,
                });
            }
        }
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // 更新某個區塊的覆寫樣式
    function handleOverrideUpdate(
        blockIndex: number,
        blockType: BlockType,
        style: Partial<BlockStyle>
    ) {
        setOverrides((prev) => ({
            ...prev,
            [blockIndex]: { blockIndex, blockType, style },
        }));
    }

    function handleOverrideReset(blockIndex: number) {
        setOverrides((prev) => {
            const next = { ...prev };
            delete next[blockIndex];
            return next;
        });
    }

    function handleDeleteBlock(blockIndex: number, blockType: BlockType) {
        const key = `${blockType}-${blockIndex}`;
        setDeletedBlocks(prev => new Set([...prev, key]));
        setSelectedBlock(null);
    }

    const reloadCss = useCallback(() => {
        loadCustomCss().then(setCustomCss);
    }, []);

    const clickScript = `
    <script>
        document.addEventListener('click', function(e) {
            const el = e.target.closest('[data-block-index]');
            if (!el) return;
            // 移除之前的 highlight
            document.querySelectorAll('.--block-selected').forEach(function(n) {
            n.classList.remove('--block-selected');
            });
            el.classList.add('--block-selected');
            window.parent.postMessage({
            type: 'block-click',
            blockIndex: parseInt(el.dataset.blockIndex),
            blockType: el.dataset.blockType,
            }, '*');
        });
        </script>
        <style>
        [data-block-index] { cursor: pointer; transition: outline 0.15s; }
        [data-block-index]:hover { outline: 2px dashed #6366f1; outline-offset: 3px; }
        .--block-selected { outline: 2px solid #6366f1 !important; outline-offset: 3px; }
        </style>
    `;

    const initialDoc = useMemo(() => {
        return buildInitialDoc(html, clickScript);
    }, [html]);

    function buildInitialDoc(html: string, clickScript: string): string {
        return `<!DOCTYPE html><html><head>
            <style id="__base__">
            * { box-sizing: border-box; }
            body { font-family: sans-serif; padding: 2.5rem 3rem; color: #111;
                line-height: 1.7; max-width: 860px; margin: 0 auto; }
            h1,h2,h3,h4 { font-weight: 600; line-height: 1.3; }
            img { max-width: 100%; border-radius: 6px; }
            pre { background: #f4f4f4; padding: 1.2rem; border-radius: 6px;
                overflow-x: auto; font-size: 0.875rem; }
            blockquote { border-left: 4px solid #ddd; margin: 0;
                padding: 0.5rem 1rem; color: #555; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #ddd; padding: 8px 14px; }
            th { background: #f8f8f8; font-weight: 600; }
            ul, ol { padding-left: 1.5rem; }
            hr { border: none; border-top: 1px solid #e5e5e5; margin: 1.5rem 0; }
            </style>
            <style id="__custom-styles__"></style>
            <style id="__custom-css__"></style>
            <style>
            [data-block-index] { cursor: pointer; transition: outline 0.15s; }
            [data-block-index]:hover { outline: 2px dashed #6366f1; outline-offset: 3px; }
            .--block-selected { outline: 2px solid #6366f1 !important; outline-offset: 3px; }
            </style>
            <script>
            window.addEventListener('load', function() {
                window.parent.postMessage({ type: 'iframe-ready' }, '*');
            });

            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'update-styles') return;

                // 直接設定 textContent，不用 regex
                var styleEl = document.getElementById('__custom-styles__');
                if (styleEl) styleEl.textContent = e.data.styleTag || '';

                var cssEl = document.getElementById('__custom-css__');
                if (cssEl) cssEl.textContent = e.data.customCss || '';

                var scrollY = window.scrollY;
                document.body.innerHTML = e.data.html;
                window.scrollTo(0, scrollY);
                bindBlockClick();
            });

            function bindBlockClick() {
                document.addEventListener('click', function(e) {
                var el = e.target.closest('[data-block-index]');
                if (!el) return;
                document.querySelectorAll('.--block-selected').forEach(function(n) {
                    n.classList.remove('--block-selected');
                });
                el.classList.add('--block-selected');
                window.parent.postMessage({
                    type: 'block-click',
                    blockIndex: parseInt(el.dataset.blockIndex),
                    blockType: el.dataset.blockType,
                }, '*');
                });
            }

            bindBlockClick();
            <\/script>
        </head><body></body></html>`;
    }

    async function handlePost() {
        setPosting(true);
        setResult(null);
        try {
            const settings = await loadSettings();
            // 輸出給 WP：移除 data-* 屬性
            const finalHtml = removeDeletedBlocks(
                buildWpHtml(html, styleConfig, overrides),
                deletedBlocks
            );

            const link = await invoke<string>("post_to_wp", {
                title,
                content: finalHtml,
                wpUrl: settings.wpUrl,
                wpUser: settings.wpUser,
                wpAppPwd: settings.wpAppPwd,
            });
            setResult({ ok: true, msg: `草稿已建立：${link}` });
        } catch (e) {
            setResult({ ok: false, msg: String(e) });
        } finally {
            setPosting(false);
        }
    }

    if (!html) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                尚無預覽內容，請先到任務頁抓取。
            </div>
        );
    }

    function pushStylesToIframe() {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        // 直接傳 CSS 內容，不含 <style> 標籤
        const styleContent = buildStyleContent(styleConfig);
        const finalHtml = removeDeletedBlocks(
            buildFinalHtml(html, styleConfig, overrides),
            deletedBlocks
        );

        iframe.contentWindow.postMessage({
            type: "update-styles",
            styleTag: styleContent,   // ← 純 CSS 字串，不含 <style> 標籤
            customCss,
            html: finalHtml,
        }, "*");
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* 左側：預覽區 */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-700">
                <div className="shrink-0 flex items-center justify-between
          px-5 py-3 bg-zinc-900 border-b border-zinc-700">
                    <h1 className="text-sm font-semibold text-white truncate mr-4">
                        {title || "（無標題）"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={reloadCss}
                            className="px-3 py-1.5 rounded-lg border border-zinc-600
                hover:border-zinc-400 text-zinc-400 hover:text-white
                text-xs transition-colors"
                        >
                            ↺ 重載 CSS
                        </button>
                        <button
                            onClick={handlePost}
                            disabled={posting}
                            className="shrink-0 px-4 py-1.5 rounded-lg bg-indigo-600
                hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-400
                disabled:cursor-not-allowed text-white text-sm font-medium
                transition-colors flex items-center gap-2"
                        >
                            {posting && (
                                <span className="w-3.5 h-3.5 border-2 border-white/30
                  border-t-white rounded-full animate-spin" />
                            )}
                            {posting ? "發布中..." : "Post 至 WordPress"}
                        </button>
                    </div>
                </div>

                {result && (
                    <div className={`shrink-0 px-5 py-2.5 text-sm border-b
            ${result.ok
                            ? "text-green-400 bg-green-950 border-green-800"
                            : "text-red-400 bg-red-950 border-red-800"
                        }`}
                    >
                        {result.msg}
                    </div>
                )}

                <div className="flex-1 overflow-hidden bg-white relative">
                    <iframe
                        ref={iframeRef}
                        srcDoc={initialDoc}
                        className="w-full h-full"
                        sandbox="allow-same-origin allow-scripts"
                        title="預覽"
                    />
                </div>
            </div>

            {/* 右側：全域樣式編輯 */}
            <StyleEditor config={styleConfig} onChange={setStyleConfig} />

            {/* 浮動：區塊覆寫面板（點擊區塊後出現，固定右下角） */}
            {selectedBlock && (
                <BlockEditPanel
                    blockIndex={selectedBlock.blockIndex}
                    blockType={selectedBlock.blockType}
                    currentStyle={overrides[selectedBlock.blockIndex]?.style ?? {}}
                    onUpdate={(style) =>
                        handleOverrideUpdate(selectedBlock.blockIndex, selectedBlock.blockType, style)
                    }
                    onReset={() => handleOverrideReset(selectedBlock.blockIndex)}
                    onClose={() => setSelectedBlock(null)}
                    onDelete={() =>
                        handleDeleteBlock(selectedBlock.blockIndex, selectedBlock.blockType)
                    }
                />
            )}
        </div>
    );
}