type Page = "settings" | "task" | "preview" | "custom-css";

interface Props {
    current: Page;
    onChange: (p: Page) => void;
}

const items: { id: Page; label: string }[] = [
    { id: "settings", label: "⚙️  設定" },
    { id: "task", label: "📄  任務" },
    { id: "preview", label: "👁  預覽" },
    { id: "custom-css", label: "🎨  自訂 CSS" },
];

export default function Sidebar({ current, onChange }: Props) {
    return (
        <aside className="w-48 shrink-0 bg-zinc-900 border-r border-zinc-700 flex flex-col py-6 gap-1">
            <p className="px-5 mb-4 text-xs font-semibold tracking-widest text-zinc-500 uppercase">
                Notion → WP
            </p>
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`text-left px-5 py-2.5 rounded-none text-sm transition-colors
            ${current === item.id
                            ? "bg-zinc-700 text-white font-medium"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                >
                    {item.label}
                </button>
            ))}
        </aside>
    );
}