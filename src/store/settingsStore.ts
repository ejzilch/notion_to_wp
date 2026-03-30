import { load } from "@tauri-apps/plugin-store";
import { getPassword, setPassword } from "tauri-plugin-keyring-api";

const STORE_FILE = "settings.bin";
const KEYRING_SERVICE = "notion_to_wp";

export interface AppSettings {
    notionToken: string;
    wpUrl: string;
    wpUser: string;
    wpAppPwd: string;
}

async function getStore() {
    return await load(STORE_FILE, {
        defaults: {
            wpUrl: "",
            wpUser: "",
        },
    });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    const store = await getStore();

    // 非敏感資料存 settings.bin
    await store.set("wpUrl", settings.wpUrl);
    await store.set("wpUser", settings.wpUser);

    // 敏感資料存系統 keyring
    await setPassword(KEYRING_SERVICE, "notionToken", settings.notionToken);
    await setPassword(KEYRING_SERVICE, "wpAppPwd", settings.wpAppPwd);

    // 清除 settings.bin 裡的舊敏感資料
    await store.set("notionToken", "");
    await store.set("wpAppPwd", "");

    await store.save();
}

export async function loadSettings(): Promise<AppSettings> {
    const store = await getStore();

    return {
        wpUrl: (await store.get<string>("wpUrl")) ?? "",
        wpUser: (await store.get<string>("wpUser")) ?? "",
        // 從 keyring 讀取敏感資料
        notionToken: (await getPassword(KEYRING_SERVICE, "notionToken")) ?? "",
        wpAppPwd: (await getPassword(KEYRING_SERVICE, "wpAppPwd")) ?? "",
    };
}