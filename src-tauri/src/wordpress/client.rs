use anyhow::anyhow;
use base64::{Engine as _, engine::general_purpose};
use reqwest::Client;
use serde_json::Value;

pub async fn post_to_wordpress(
    client: &Client,
    title: &str,
    content: &str,
    wp_url: &str,
    wp_user: &str,
    wp_app_pwd: &str,
) -> anyhow::Result<String> {
    let auth_base64 = general_purpose::STANDARD.encode(format!("{}:{}", wp_user, wp_app_pwd));

    let body = serde_json::json!({
        "title": title,
        "content": content,
        "status": "draft",
        "format": "standard",
    });

    let res = client
        .post(format!("{}/wp-json/wp/v2/posts", wp_url))
        .header("Authorization", format!("Basic {}", auth_base64))
        .json(&body)
        .send()
        .await?;

    if res.status().is_success() {
        let res_json: Value = res.json().await?;
        let link = res_json["link"]
            .as_str()
            .ok_or_else(|| anyhow!("回應中找不到 link 欄位"))?;
        Ok(link.to_string())
    } else {
        let status = res.status();
        let body = res.text().await?;
        anyhow::bail!("WordPress 上傳失敗 [{}]: {}", status, body)
    }
}
