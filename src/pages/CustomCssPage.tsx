import { useState, useEffect } from "react";
import { saveCustomCss, loadCustomCss } from "../store/customCssStore";

export default function CustomCssPage() {
    const [css, setCss] = useState("");
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadCustomCss().then(setCss);
    }, []);

    async function handleSave() {
        await saveCustomCss(css);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function handleClear() {
        setCss("");
        saveCustomCss("");
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="shrink-0 flex items-center justify-between
        px-6 py-4 border-b border-zinc-700">
                <div>
                    <h1 className="text-base font-semibold text-white">自訂 CSS</h1>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        貼上你在 WordPress 外觀→自訂 CSS 裡的樣式，預覽時會一起套用
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleClear}
                        className="text-xs text-zinc-500 hover:text-red-400
              border border-zinc-700 hover:border-red-800 px-3 py-1.5
              rounded-lg transition-colors"
                    >
                        清除
                    </button>
                    <button
                        onClick={handleSave}
                        className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600
              hover:bg-indigo-500 text-white font-medium transition-colors"
                    >
                        {saved ? "✓ 已儲存" : "儲存"}
                    </button>
                </div>
            </div>

            <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                spellCheck={false}
                placeholder={`.wp-block-heading {\n  font-family: "Noto Serif TC", serif;\n}\n\n.wp-block-group {\n  border-radius: 8px;\n  padding: 1.5rem;\n}`}
                className="flex-1 resize-none bg-zinc-950 text-zinc-200 text-sm
          font-mono p-5 focus:outline-none placeholder-zinc-700
          leading-relaxed"
            />
        </div>
    );
}