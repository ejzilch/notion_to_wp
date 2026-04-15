use anyhow::anyhow;
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub async fn fetch_all_blocks(
    client: &Client,
    page_id: &str,
    token: &str,
) -> anyhow::Result<Vec<Value>> {
    let mut all_blocks = Vec::new();
    let mut cursor: Option<String> = None;
    const MAX_PAGE_SIZE: u32 = 100;

    loop {
        let url = format!("https://api.notion.com/v1/blocks/{}/children", page_id);

        let mut params: Vec<(&str, String)> = vec![("page_size", MAX_PAGE_SIZE.to_string())];

        if let Some(ref c) = cursor {
            params.push(("start_cursor", c.clone()));
        }

        let request = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("Notion-Version", "2022-06-28")
            .query(&params);

        let response = fetch_with_retry(request).await?;

        if let Some(results) = response["results"].as_array() {
            all_blocks.extend(results.clone());
        }

        if response["has_more"].as_bool().unwrap_or(false) {
            cursor = response["next_cursor"].as_str().map(|s| s.to_string());
        } else {
            break;
        }
    }

    Ok(all_blocks)
}

async fn fetch_with_retry(request: reqwest::RequestBuilder) -> anyhow::Result<Value> {
    let mut delay = Duration::from_millis(500);

    for attempt in 0..4u32 {
        let req = request
            .try_clone()
            .ok_or_else(|| anyhow!("request 無法 clone"))?;

        let response = req.send().await?;
        let status = response.status();

        if status == 429 || status.is_server_error() {
            if attempt < 3 {
                tokio::time::sleep(delay).await;
                delay *= 2;
                continue;
            } else {
                anyhow::bail!("Notion API 持續回傳錯誤：{}", status);
            }
        }

        return Ok(response.json().await?);
    }

    anyhow::bail!("fetch_with_retry 不應到達這裡")
}
