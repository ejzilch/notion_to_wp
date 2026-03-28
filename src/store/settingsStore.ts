import { load } from "@tauri-apps/plugin-store";

const STORE_FILE = "settings.bin";

export interface AppSettings {
    notionToken: string;
    wpUrl: string;
    wpUser: string;
    wpAppPwd: string;
}

// 獨立出來，避免重複建立
async function getStore() {
    return await load(STORE_FILE, {
        defaults: {
            notionToken: "",
            wpUrl: "",
            wpUser: "",
            wpAppPwd: "",
        },
    });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    const store = await getStore();
    await store.set("notionToken", settings.notionToken);
    await store.set("wpUrl", settings.wpUrl);
    await store.set("wpUser", settings.wpUser);
    await store.set("wpAppPwd", settings.wpAppPwd);
}

export async function loadSettings(): Promise<AppSettings> {
    const store = await getStore();
    return {
        notionToken: (await store.get<string>("notionToken")) ?? "",
        wpUrl: (await store.get<string>("wpUrl")) ?? "",
        wpUser: (await store.get<string>("wpUser")) ?? "",
        wpAppPwd: (await store.get<string>("wpAppPwd")) ?? "",
    };
}