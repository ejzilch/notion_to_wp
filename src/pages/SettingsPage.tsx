import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "../store/settingsStore";

export default function SettingsPage() {
    const [form, setForm] = useState({
        notionToken: "",
        wpUrl: "",
        wpUser: "",
        wpAppPwd: "",
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings().then((s) => {
            setForm({
                notionToken: s.notionToken ?? "",
                wpUrl: s.wpUrl ?? "",
                wpUser: s.wpUser ?? "",
                wpAppPwd: s.wpAppPwd ?? "",
            });
        });
    }, []);

    async function handleSave() {
        await saveSettings(form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <div className="max-w-lg mx-auto py-10 px-6 flex flex-col gap-6">
            <h1 className="text-xl font-semibold text-white">連線設定</h1>
            <p className="text-sm text-zinc-400">
                資料加密儲存於本機，不會上傳至任何伺服器。
            </p>

            <Field
                label="Notion Token"
                type="password"
                value={form.notionToken}
                onChange={(v) => setForm({ ...form, notionToken: v })}
                placeholder="secret_xxxxxxxxxxxx"
            />
            <Field
                label="WordPress 網址"
                type="text"
                value={form.wpUrl}
                onChange={(v) => setForm({ ...form, wpUrl: v })}
                placeholder="https://your-site.com"
            />
            <Field
                label="WordPress 帳號"
                type="text"
                value={form.wpUser}
                onChange={(v) => setForm({ ...form, wpUser: v })}
                placeholder="admin"
            />
            <Field
                label="應用程式密碼"
                type="password"
                value={form.wpAppPwd}
                onChange={(v) => setForm({ ...form, wpAppPwd: v })}
                placeholder="xxxx xxxx xxxx xxxx"
            />

            <button
                onClick={handleSave}
                className="mt-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500
          text-white text-sm font-medium transition-colors"
            >
                {saved ? "✓ 已儲存" : "儲存設定"}
            </button>
        </div>
    );
}

interface FieldProps {
    label: string;
    type: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}

function Field({ label, type, value, onChange, placeholder }: FieldProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-300">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600
          text-white text-sm placeholder-zinc-500
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
          transition-colors"
            />
        </div>
    );
}