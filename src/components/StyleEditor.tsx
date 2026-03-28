import { useState, useEffect } from "react";
import {
    BlockType,
    BlockStyle,
    StyleConfig,
    BLOCK_LABELS,
    DEFAULT_STYLE,
} from "../types/style";
import { loadCustomCss } from "../store/customCssStore";
import { parseCssClasses } from "../utils/parseCssClasses";

interface Props {
    config: StyleConfig;
    onChange: (config: StyleConfig) => void;
}

export default function StyleEditor({ config, onChange }: Props) {
    const [open, setOpen] = useState<BlockType | null>(null);
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    // 載入自訂 CSS 並解析 class 名稱
    useEffect(() => {
        loadCustomCss().then((css) => {
            setAvailableClasses(parseCssClasses(css));
        });
    }, []);

    function update(type: BlockType, field: keyof BlockStyle, value: string) {
        onChange({ ...config, [type]: { ...config[type], [field]: value } });
    }

    function reset(type: BlockType) {
        onChange({ ...config, [type]: { ...DEFAULT_STYLE } });
    }

    function hasStyle(type: BlockType) {
        return Object.values(config[type]).some((v) => v !== "");
    }

    return (
        <aside className="w-72 shrink-0 bg-zinc-900 border-l border-zinc-700 overflow-y-auto flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-white">樣式編輯</p>
                    <p className="text-xs text-zinc-500 mt-0.5">依區塊類型套用</p>
                </div>
                {/* 重新載入 CSS class 清單 */}
                <button
                    onClick={() =>
                        loadCustomCss().then((css) =>
                            setAvailableClasses(parseCssClasses(css))
                        )
                    }
                    className="text-xs text-zinc-500 hover:text-white border border-zinc-700
            hover:border-zinc-500 px-2 py-1 rounded transition-colors"
                    title="重新載入自訂 CSS class"
                >
                    ↺
                </button>
            </div>

            <div className="flex flex-col divide-y divide-zinc-800">
                {(Object.keys(BLOCK_LABELS) as BlockType[]).map((type) => (
                    <div key={type}>
                        <button
                            onClick={() => setOpen(open === type ? null : type)}
                            className="w-full flex items-center justify-between px-4 py-2.5
                text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasStyle(type) ? "bg-indigo-400" : "bg-transparent"
                                        }`}
                                />
                                {BLOCK_LABELS[type]}
                            </span>
                            <span className="text-zinc-600 text-xs">
                                {open === type ? "▲" : "▼"}
                            </span>
                        </button>

                        {open === type && (
                            <div className="px-4 pb-4 pt-2 bg-zinc-800/50 flex flex-col gap-3">
                                <StyleRow
                                    label="字體顏色"
                                    type="color-text"
                                    value={config[type].color}
                                    onChange={(v) => update(type, "color", v)}
                                />
                                <StyleRow
                                    label="背景顏色"
                                    type="color-bg"
                                    value={config[type].background}
                                    onChange={(v) => update(type, "background", v)}
                                />
                                <StyleRow
                                    label="字型大小"
                                    type="font-size"
                                    value={config[type].fontSize}
                                    onChange={(v) => update(type, "fontSize", v)}
                                />
                                <StyleRow
                                    label="字體粗細"
                                    type="font-weight"
                                    value={config[type].fontWeight}
                                    onChange={(v) => update(type, "fontWeight", v)}
                                />
                                {/* CSS Class 改成下拉選單 */}
                                <CssClassRow
                                    value={config[type].cssClass}
                                    availableClasses={availableClasses}
                                    onChange={(v) => update(type, "cssClass", v)}
                                />

                                <button
                                    onClick={() => reset(type)}
                                    className="mt-1 text-xs text-zinc-500 hover:text-red-400
                    transition-colors text-left"
                                >
                                    重置此區塊
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}

// ── CSS Class 下拉選單元件 ─────────────────────────────

interface CssClassRowProps {
    value: string;
    availableClasses: string[];
    onChange: (v: string) => void;
}

function CssClassRow({ value, availableClasses, onChange }: CssClassRowProps) {
    const [inputMode, setInputMode] = useState(false);

    // 目前選中的值不在清單裡時，自動切換成手動輸入模式
    const isCustom = value !== "" && !availableClasses.includes(value);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">CSS Class</label>
                <button
                    onClick={() => setInputMode((m) => !m)}
                    className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                    {inputMode || isCustom ? "切換下拉" : "手動輸入"}
                </button>
            </div>

            {inputMode || isCustom ? (
                // 手動輸入模式
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="my-class another-class"
                    className="px-2 py-1.5 text-xs rounded bg-zinc-700 border border-zinc-600
            text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
            ) : (
                // 下拉選單模式
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="px-2 py-1.5 text-xs rounded bg-zinc-700 border border-zinc-600
            text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="">（不套用）</option>
                    {availableClasses.length === 0 ? (
                        <option disabled value="">
                            尚無自訂 CSS — 請先到自訂 CSS 頁面貼上
                        </option>
                    ) : (
                        availableClasses.map((cls) => (
                            <option key={cls} value={cls}>
                                .{cls}
                            </option>
                        ))
                    )}
                </select>
            )}

            {value && (
                <button
                    onClick={() => onChange("")}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors text-left"
                >
                    清除 class
                </button>
            )}
        </div>
    );
}

// ── StyleRow 維持不變（顏色/字型/字重） ──────────────────

function normalizeColor(raw: string): string {
    const v = raw.trim().replace(/^#+/, "");
    return v ? `#${v}` : "";
}

function normalizeFontSize(raw: string): string {
    const v = raw.trim().replace(/px$/i, "");
    return v ? `${v}px` : "";
}

interface StyleRowProps {
    label: string;
    type: "color-text" | "color-bg" | "font-size" | "font-weight";
    value: string;
    onChange: (v: string) => void;
}

function StyleRow({ label, type, value, onChange }: StyleRowProps) {
    const [draft, setDraft] = useState(
        type === "color-text" || type === "color-bg"
            ? value.replace(/^#/, "")
            : type === "font-size"
                ? value.replace(/px$/i, "")
                : value
    );

    useEffect(() => {
        if (type === "color-text" || type === "color-bg") {
            setDraft(value.replace(/^#/, ""));
        } else if (type === "font-size") {
            setDraft(value.replace(/px$/i, ""));
        } else {
            setDraft(value);
        }
    }, [value]);

    function handleBlur() {
        if (type === "color-text" || type === "color-bg") {
            onChange(normalizeColor(draft));
        } else if (type === "font-size") {
            onChange(normalizeFontSize(draft));
        }
    }

    return (
        <div className="flex items-center justify-between gap-3">
            <label className="text-xs text-zinc-400 shrink-0 w-20">{label}</label>

            {(type === "color-text" || type === "color-bg") && (
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="color"
                        value={value || "#ffffff"}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border border-zinc-600
              bg-transparent p-0.5"
                    />
                    <div className="flex items-center flex-1 rounded bg-zinc-700
            border border-zinc-600 focus-within:border-indigo-500 overflow-hidden">
                        <span className="pl-2 text-zinc-400 text-xs select-none">#</span>
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.replace(/^#+/, ""))}
                            onBlur={handleBlur}
                            maxLength={6}
                            placeholder="ffffff"
                            className="flex-1 px-1 py-1 text-xs bg-transparent text-white
                placeholder-zinc-500 focus:outline-none"
                        />
                    </div>
                    {value && (
                        <button
                            onClick={() => { onChange(""); setDraft(""); }}
                            className="text-zinc-600 hover:text-zinc-400 text-xs"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {type === "font-size" && (
                <div className="flex items-center flex-1 rounded bg-zinc-700
          border border-zinc-600 focus-within:border-indigo-500 overflow-hidden">
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                        onBlur={handleBlur}
                        placeholder="16"
                        className="flex-1 px-2 py-1 text-xs bg-transparent text-white
              placeholder-zinc-500 focus:outline-none"
                    />
                    <span className="pr-2 text-zinc-400 text-xs select-none">px</span>
                </div>
            )}

            {type === "font-weight" && (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs rounded bg-zinc-700 border
            border-zinc-600 text-white focus:outline-none focus:border-indigo-500"
                >
                    <option value="">（預設）</option>
                    <option value="300">300 細</option>
                    <option value="400">400 標準</option>
                    <option value="500">500 中等</option>
                    <option value="600">600 半粗</option>
                    <option value="700">700 粗</option>
                </select>
            )}
        </div>
    );
}