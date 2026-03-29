import { load } from "@tauri-apps/plugin-store";
import { StyleConfig, buildDefaultStyleConfig } from "../types/style";

const STORE_FILE = "settings.bin";

async function getStore() {
    return await load(STORE_FILE, { defaults: {} });
}

export async function saveDefaultStyleConfig(config: StyleConfig): Promise<void> {
    const store = await getStore();
    await store.set("defaultStyleConfig", config);
}

export async function loadDefaultStyleConfig(): Promise<StyleConfig> {

    const store = await getStore();
    const saved = await store.get<StyleConfig>("defaultStyleConfig");
    return saved ?? buildDefaultStyleConfig();
}