mod notion;
mod wordpress;

use notion::converter::{HtmlCache, blocks_to_wp_html};
use notion::fetcher::fetch_all_blocks;
use once_cell::sync::OnceCell;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

static CLIENT: OnceCell<Arc<Client>> = OnceCell::new();

fn get_client() -> anyhow::Result<Arc<Client>> {
    CLIENT
        .get_or_try_init(|| -> anyhow::Result<Arc<Client>> {
            Ok(Arc::new(
                Client::builder()
                    .timeout(std::time::Duration::from_secs(30))
                    .build()?,
            ))
        })
        .cloned()
}

#[derive(Serialize, Deserialize)]
pub struct ConvertResult {
    pub html: String,
}

#[tauri::command]
async fn fetch_and_convert(page_id: String, notion_token: String) -> Result<ConvertResult, String> {
    let client = get_client().map_err(|e| e.to_string())?;
    let cache: HtmlCache = Arc::new(Mutex::new(HashMap::new()));

    let blocks = fetch_all_blocks(&client, &page_id, &notion_token)
        .await
        .map_err(|e| e.to_string())?;

    let html = blocks_to_wp_html(Arc::clone(&client), &blocks, &notion_token, cache).await;

    Ok(ConvertResult { html })
}

#[tauri::command]
async fn post_to_wp(
    title: String,
    content: String,
    wp_url: String,
    wp_user: String,
    wp_app_pwd: String,
) -> Result<String, String> {
    let client = get_client().map_err(|e| e.to_string())?;
    let link: String = wordpress::client::post_to_wordpress(
        &client,
        &title,
        &content,
        &wp_url,
        &wp_user,
        &wp_app_pwd,
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(link)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_keyring::init())
        .invoke_handler(tauri::generate_handler![fetch_and_convert, post_to_wp])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
