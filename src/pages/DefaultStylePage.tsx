import { useEffect, useState } from "react";
import { StyleConfig, buildDefaultStyleConfig } from "../types/style";
import { saveDefaultStyleConfig, loadDefaultStyleConfig } from "../store/defaultStyleStore";
import StyleEditor from "../components/StyleEditor";

interface Props {
    onSave?: (config: StyleConfig) => void;
}

export default function DefaultStylePage({ onSave }: Props) {
    const [config, setConfig] = useState<StyleConfig>(buildDefaultStyleConfig());
    const [saved] = useState(false);

    useEffect(() => {
        loadDefaultStyleConfig().then(setConfig);
    }, []);

    async function handleSave() {
        await saveDefaultStyleConfig(config);
        onSave?.(config);
    }

    async function handleReset() {
        if (!window.confirm("確定要清除所有預設樣式嗎？")) return;
        const empty = buildDefaultStyleConfig();
        setConfig(empty);
        await saveDefaultStyleConfig(empty);
    }

    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between
          px-5 py-3 bg-zinc-900 border-b border-zinc-700">
                    <div>
                        <h1 className="text-sm font-semibold text-white">預設樣式</h1>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            儲存後每次預覽頁面都會自動套用，可在預覽頁覆寫
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleReset}
                            className="text-xs text-zinc-500 hover:text-red-400 border
                border-zinc-700 hover:border-red-800 px-3 py-1.5 rounded-lg transition-colors">
                            清除預設
                        </button>
                        <button onClick={handleSave}
                            className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600
                hover:bg-indigo-500 text-white font-medium transition-colors">
                            {saved ? "✓ 已儲存" : "儲存預設"}
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 text-zinc-500 text-sm
          flex items-start justify-center pt-12">
                    在右側設定各區塊的預設樣式
                </div>
            </div>
            <StyleEditor config={config} onChange={setConfig} />
        </div>
    );
}