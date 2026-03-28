import { load } from "@tauri-apps/plugin-store";

const STORE_FILE = "settings.bin";

async function getStore() {
    return await load(STORE_FILE, { defaults: { customCss: "" } });
}

export async function saveCustomCss(css: string): Promise<void> {
    const store = await getStore();
    await store.set("customCss", css);
}

export async function loadCustomCss(): Promise<string> {
    const store = await getStore();
    return (await store.get<string>("customCss")) ?? "";
}