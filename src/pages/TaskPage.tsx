import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { loadSettings } from "../store/settingsStore";

interface Props {
    onConverted: (html: string) => void;
    onTitleChange: (title: string) => void;
    onNavigate: (page: "preview") => void;
}

export default function TaskPage({ onConverted, onTitleChange, onNavigate }: Props) {
    const [pageId, setPageId] = useState(
        () => sessionStorage.getItem("task_pageId") ?? ""
    );
    const [title, setTitle] = useState(
        () => sessionStorage.getItem("task_title") ?? ""
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 每次變更都暫存
    useEffect(() => {
        sessionStorage.setItem("task_pageId", pageId);
    }, [pageId]);

    useEffect(() => {
        sessionStorage.setItem("task_title", title);
        onTitleChange(title);
    }, [title]);

    function handleClear() {
        setPageId("");
        setTitle("");
        sessionStorage.removeItem("task_pageId");
        sessionStorage.removeItem("task_title");
    }

    async function handleFetch() {
        setError("");
        if (!pageId.trim()) { setError("請輸入 Page ID"); return; }
        if (!title.trim()) { setError("請輸入文章標題"); return; }

        setLoading(true);
        try {
            const settings = await loadSettings();
            if (!settings.notionToken) {
                setError("請先在設定頁填入 Notion Token");
                return;
            }
            const result = await invoke<{ html: string }>("fetch_and_convert", {
                pageId: pageId.trim(),
                notionToken: settings.notionToken,
            });
            onConverted(result.html);
            onNavigate("preview");
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-lg mx-auto py-10 px-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-white">匯入任務</h1>
                <button
                    onClick={handleClear}
                    className="text-xs text-zinc-500 hover:text-red-400
            border border-zinc-700 hover:border-red-800 px-3 py-1.5
            rounded-lg transition-colors"
                >
                    清除
                </button>
            </div>

            <p className="text-sm text-zinc-400">
                Page ID 和標題暫存於本次工作階段，關閉程式後清除。
            </p>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">Notion Page ID</label>
                <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600
            text-white text-sm placeholder-zinc-500
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-xs text-zinc-500">
                    從 Notion 頁面 URL 最後一段取得
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-300">文章標題</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="WordPress 文章標題"
                    className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600
            text-white text-sm placeholder-zinc-500
            focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
            </div>

            {error && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-800
          rounded-lg px-4 py-2.5">
                    {error}
                </p>
            )}

            <button
                onClick={handleFetch}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
          disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed
          text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
                {loading && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white
            rounded-full animate-spin" />
                )}
                {loading ? "抓取中..." : "從 Notion 抓取並轉換"}
            </button>
        </div>
    );
}