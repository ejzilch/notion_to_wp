interface Props {
    dark: boolean;
    onToggle: () => void;
}

export default function ThemeToggle({ dark, onToggle }: Props) {
    return (
        <button
            onClick={onToggle}
            className="text-xs px-3 py-1.5 rounded-md border border-zinc-600
        text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors"
        >
            {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
    );
}