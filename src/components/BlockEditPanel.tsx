import { useState, useEffect, useRef } from "react";
import {
    BlockType,
    BlockStyle,
    BLOCK_LABELS,
} from "../types/style";
import { parseCssClasses } from "../utils/parseCssClasses";
import { loadCustomCss } from "../store/customCssStore";

interface Props {
    blockIndex: number;
    blockType: BlockType;
    currentStyle: Partial<BlockStyle>;
    onUpdate: (style: Partial<BlockStyle>) => void;
    onReset: () => void;
    onClose: () => void;
    onDelete: () => void;
}

export default function BlockEditPanel({
    blockIndex,
    blockType,
    currentStyle,
    onUpdate,
    onReset,
    onClose,
    onDelete,
}: Props) {
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    const [style, setStyle] = useState<Partial<BlockStyle>>(currentStyle);
    const [isDirty, setIsDirty] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadCustomCss().then((css) => setAvailableClasses(parseCssClasses(css)));
    }, []);

    // 點擊面板外部關閉
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (panelRef.current && !panelRef.current.contains(target)) {
                handleClose();
            }
        };

        // 監聽主視窗
        document.addEventListener("mousedown", handleOutsideClick);

        // 關鍵：監聽 iframe 內部 (假設你的 iframe 有個 ref 叫 iframeRef)
        const iframe = document.querySelector('iframe'); // 或者使用 iframeRef.current
        const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;

        if (iframeDoc) {
            iframeDoc.addEventListener("mousedown", handleOutsideClick);
        }

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            if (iframeDoc) {
                iframeDoc.removeEventListener("mousedown", handleOutsideClick);
            }
        };
    }, [handleClose]);

    function update(field: keyof BlockStyle, value: string) {
        const next = { ...style, [field]: value };
        setStyle(next);
        setIsDirty(true);
        onUpdate(next);
    }

    function handleReset() {
        setStyle({});
        setIsDirty(false);
        onReset();
    }

    function handleClose() {
        if (isDirty) {
            const confirmed = window.confirm("已有修改尚未儲存，確定要關閉嗎？\n（目前修改已套用至預覽，關閉不會還原）");
            if (!confirmed) return;
        }
        onClose();
    }

    const label = BLOCK_LABELS[blockType] ?? blockType;

    return (
        <div
            ref={panelRef}
            className="fixed bottom-6 right-80 z-50 w-68 bg-zinc-800 border border-zinc-600
        rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "260px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        >
            {/* 標題列 */}
            <div className="flex items-center justify-between px-4 py-2.5
        bg-zinc-700 border-b border-zinc-600">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                        區塊覆寫：{label}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        #{blockIndex + 1} · 只影響此區塊
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="ml-2 shrink-0 text-zinc-400 hover:text-white
            w-6 h-6 flex items-center justify-center rounded
            hover:bg-zinc-600 transition-colors text-base"
                >
                    ×
                </button>
            </div>

            {/* 設定欄位 */}
            <div className="px-4 py-3 flex flex-col gap-3">
                <PanelColorRow
                    label="字體顏色"
                    value={style.color ?? ""}
                    onChange={(v) => update("color", v)}
                />
                <PanelColorRow
                    label="背景顏色"
                    value={style.background ?? ""}
                    onChange={(v) => update("background", v)}
                />

                {/* 字型大小 */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 shrink-0 w-16">字型大小</label>
                    <div className="flex items-center flex-1 rounded bg-zinc-700
            border border-zinc-600 focus-within:border-indigo-500 overflow-hidden">
                        <input
                            type="text"
                            value={(style.fontSize ?? "").replace(/px$/i, "")}
                            onChange={(e) =>
                                update(
                                    "fontSize",
                                    e.target.value
                                        ? `${e.target.value.replace(/[^0-9.]/g, "")}px`
                                        : ""
                                )
                            }
                            placeholder="16"
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-transparent
                text-white placeholder-zinc-500 focus:outline-none"
                        />
                        <span className="px-2 text-zinc-400 text-xs select-none shrink-0">px</span>
                    </div>
                </div>

                {/* 字體粗細 */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 shrink-0 w-16">字體粗細</label>
                    <select
                        value={style.fontWeight ?? ""}
                        onChange={(e) => update("fontWeight", e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded bg-zinc-700
              border border-zinc-600 text-white focus:outline-none
              focus:border-indigo-500"
                    >
                        <option value="">（預設）</option>
                        <option value="300">300 細</option>
                        <option value="400">400 標準</option>
                        <option value="500">500 中等</option>
                        <option value="600">600 半粗</option>
                        <option value="700">700 粗</option>
                    </select>
                </div>

                {/* 底線 */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 shrink-0 w-16">底線</label>
                    <select
                        value={style.textDecoration ?? ""}
                        onChange={(e) => update("textDecoration", e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded bg-zinc-700
                            border border-zinc-600 text-white focus:outline-none
                            focus:border-indigo-500"
                    >
                        <option value="">（預設）</option>
                        <option value="underline">底線</option>
                        <option value="none">移除底線</option>
                        <option value="line-through">刪除線</option>
                    </select>
                </div>

                {/* CSS Class */}
                <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 shrink-0 w-16">CSS Class</label>
                    <select
                        value={style.cssClass ?? ""}
                        onChange={(e) => update("cssClass", e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded bg-zinc-700
              border border-zinc-600 text-white focus:outline-none
              focus:border-indigo-500"
                    >
                        <option value="">（不套用）</option>
                        {availableClasses.length === 0 ? (
                            <option disabled value="">尚無自訂 CSS</option>
                        ) : (
                            availableClasses.map((cls) => (
                                <option key={cls} value={cls}>.{cls}</option>
                            ))
                        )}
                    </select>
                </div>
            </div>

            {/* 底部操作 */}
            <div className="px-4 py-2.5 border-t border-zinc-700 flex justify-between items-center">
                <button
                    onClick={handleReset}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                >
                    清除覆寫
                </button>
                <button
                    onClick={() => {
                        if (window.confirm("確定要刪除這個區塊嗎？")) {
                            onDelete();
                        }
                    }}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                    刪除區塊
                </button>
                <button
                    onClick={() => { setIsDirty(false); onClose(); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600
            hover:bg-indigo-500 text-white transition-colors"
                >
                    完成
                </button>
            </div>
        </div>
    );
}

// ── 顏色輸入列 ────────────────────────────────────────

function PanelColorRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const [draft, setDraft] = useState(value.replace(/^#/, ""));

    useEffect(() => {
        setDraft(value.replace(/^#/, ""));
    }, [value]);

    return (
        <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 shrink-0 w-16">{label}</label>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                    type="color"
                    value={value || "#ffffff"}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-7 h-7 shrink-0 rounded cursor-pointer border
            border-zinc-600 bg-transparent p-0.5"
                />
                <div className="flex items-center flex-1 min-w-0 rounded bg-zinc-700
          border border-zinc-600 focus-within:border-indigo-500 overflow-hidden">
                    <span className="pl-2 text-zinc-400 text-xs select-none shrink-0">#</span>
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value.replace(/^#+/, ""))}
                        onBlur={() => onChange(draft ? `#${draft}` : "")}
                        maxLength={6}
                        placeholder="ffffff"
                        className="flex-1 min-w-0 px-1 py-1.5 text-xs bg-transparent
              text-white placeholder-zinc-500 focus:outline-none"
                    />
                </div>
                {value && (
                    <button
                        onClick={() => { onChange(""); setDraft(""); }}
                        className="shrink-0 text-zinc-600 hover:text-zinc-400 text-xs"
                    >✕</button>
                )}
            </div>
        </div>
    );
}