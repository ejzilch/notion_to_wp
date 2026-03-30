import { load } from "@tauri-apps/plugin-store";
import { StyleConfig, buildDefaultStyleConfig, BlockType } from "../types/style";

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

    const defaults = buildDefaultStyleConfig();

    if (!saved) return defaults;

    const merged = Object.fromEntries(
        (Object.keys(defaults) as BlockType[]).map((k) => [
            k,
            { ...defaults[k], ...(saved[k] ?? {}) }
        ])
    ) as StyleConfig;

    return merged;
}