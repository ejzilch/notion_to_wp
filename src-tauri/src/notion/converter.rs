use super::fetcher::fetch_all_blocks;
use async_recursion::async_recursion;
use futures::stream::{FuturesUnordered, StreamExt};
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type HtmlCache = Arc<Mutex<HashMap<String, String>>>;

#[async_recursion]
pub async fn blocks_to_wp_html(
    client: Arc<Client>,
    blocks: &[Value],
    token: &str,
    cache: HtmlCache,
) -> String {
    let mut html_segments: Vec<String> = Vec::new();
    let mut list_buffer: Vec<String> = Vec::new();
    let mut current_list_type: Option<&str> = None;

    for block in blocks {
        let block_type = block["type"].as_str().unwrap_or("unsupported");

        match (current_list_type, block_type) {
            (None, "bulleted_list_item") => {
                current_list_type = Some("bulleted_list_item");
                let item = convert_block_to_html(
                    Arc::clone(&client),
                    block.clone(),
                    token.to_string(),
                    Arc::clone(&cache),
                )
                .await;
                list_buffer.push(item);
            }
            (None, "numbered_list_item") => {
                current_list_type = Some("numbered_list_item");
                let item = convert_block_to_html(
                    Arc::clone(&client),
                    block.clone(),
                    token.to_string(),
                    Arc::clone(&cache),
                )
                .await;
                list_buffer.push(item);
            }
            (Some("bulleted_list_item"), "bulleted_list_item")
            | (Some("numbered_list_item"), "numbered_list_item") => {
                let item = convert_block_to_html(
                    Arc::clone(&client),
                    block.clone(),
                    token.to_string(),
                    Arc::clone(&cache),
                )
                .await;
                list_buffer.push(item);
            }
            (Some(list_type), _) => {
                html_segments.push(flush_list(list_type, &list_buffer));
                list_buffer.clear();
                current_list_type = None;

                if block_type == "bulleted_list_item" || block_type == "numbered_list_item" {
                    current_list_type = Some(block_type);
                    let item = convert_block_to_html(
                        Arc::clone(&client),
                        block.clone(),
                        token.to_string(),
                        Arc::clone(&cache),
                    )
                    .await;
                    list_buffer.push(item);
                } else {
                    let html = convert_block_to_html(
                        Arc::clone(&client),
                        block.clone(),
                        token.to_string(),
                        Arc::clone(&cache),
                    )
                    .await;
                    if !html.is_empty() {
                        html_segments.push(html);
                    }
                }
            }
            (None, _) => {
                let html = convert_block_to_html(
                    Arc::clone(&client),
                    block.clone(),
                    token.to_string(),
                    Arc::clone(&cache),
                )
                .await;
                if !html.is_empty() {
                    html_segments.push(html);
                }
            }
        }
    }

    if let Some(list_type) = current_list_type {
        html_segments.push(flush_list(list_type, &list_buffer));
    }

    html_segments.join("\n")
}

fn flush_list(list_type: &str, items: &[String]) -> String {
    let items_str = items.join("\n");
    if list_type == "bulleted_list_item" {
        format!(
            "\n<!-- wp:list -->\n<ul class=\"wp-block-list\">{items_str}</ul>\n<!-- /wp:list -->\n"
        )
    } else {
        format!(
            "\n<!-- wp:list {{\"ordered\":true}} -->\n<ol class=\"wp-block-list\">{items_str}</ol>\n<!-- /wp:list -->\n"
        )
    }
}

#[async_recursion]
async fn convert_block_to_html(
    client: Arc<Client>,
    block: Value,
    token: String,
    cache: HtmlCache,
) -> String {
    let block_type = block["type"].as_str().unwrap_or("unsupported");

    match block_type {
        "paragraph" => {
            let content = extract_rich_text(&block, "paragraph");
            if content.is_empty() {
                "<!-- wp:spacer {\"height\":\"20px\"} -->\n<div style=\"height:20px\" aria-hidden=\"true\" class=\"wp-block-spacer\"></div>\n<!-- /wp:spacer -->".to_string()
            } else {
                format!(
                    "\n<!-- wp:paragraph -->\n<p>{}</p>\n<!-- /wp:paragraph -->\n",
                    content
                )
            }
        }

        "heading_1" => {
            let content = extract_rich_text(&block, "heading_1");
            format!(
                "\n<!-- wp:heading {{\"level\":1}} -->\n<h1 class=\"wp-block-heading\">{}</h1>\n<!-- /wp:heading -->\n",
                content
            )
        }
        "heading_2" => {
            let content = extract_rich_text(&block, "heading_2");
            format!(
                "\n<!-- wp:heading {{\"level\":2}} -->\n<h2 class=\"wp-block-heading\">{}</h2>\n<!-- /wp:heading -->\n",
                content
            )
        }
        "heading_3" => {
            let content = extract_rich_text(&block, "heading_3");
            format!(
                "\n<!-- wp:heading {{\"level\":3}} -->\n<h3 class=\"wp-block-heading\">{}</h3>\n<!-- /wp:heading -->\n",
                content
            )
        }
        "heading_4" => {
            let content = extract_rich_text(&block, "heading_4");
            format!(
                "\n<!-- wp:heading {{\"level\":4}} -->\n<h4 class=\"wp-block-heading\">{}</h4>\n<!-- /wp:heading -->\n",
                content
            )
        }

        "bulleted_list_item" | "numbered_list_item" => {
                let content = extract_rich_text(&block, block_type);
                let mut nested = String::new();

                if block["has_children"].as_bool() == Some(true) {
                    if let Ok(children) = fetch_all_blocks(
                        &client,
                        block["id"].as_str().unwrap_or(""),
                        &token,
                    )
                    .await
                    {
                        let (list_tag, list_attrs) = if block_type == "numbered_list_item" {
                            ("ol", r#"<!-- wp:list {"ordered":true} -->"#)
                        } else {
                            ("ul", "<!-- wp:list -->")
                        };

                        nested = format!(
                            "\n{}\n<{} class=\"wp-block-list\">\n{}\n</{}>\n<!-- /wp:list -->",
                            list_attrs,
                            list_tag,
                            blocks_to_wp_html(Arc::clone(&client), &children, &token, Arc::clone(&cache)).await,
                            list_tag,
                        );
                    }
                }

            format!(
                "\n<!-- wp:list-item -->\n<li>{}{}</li>\n<!-- /wp:list-item -->\n",
                content, nested
            )
        }

        "image" => {
            let img_obj = &block["image"];
            let url = img_obj["file"]["url"]
                .as_str()
                .or(img_obj["external"]["url"].as_str())
                .unwrap_or("");
            if url.is_empty() {
                return String::new();
            }
            let caption = img_obj["caption"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|c| c["plain_text"].as_str())
                .unwrap_or("")
                .to_string();

            let caption_html = if caption.is_empty() {
                String::new()
            } else {
                format!(
                    "<figcaption class=\"wp-element-caption\">{}</figcaption>",
                    caption
                )
            };

            format!(
                "\n<!-- wp:image -->\n<figure class=\"wp-block-image size-large\"><img src=\"{}\" alt=\"{}\" />{}</figure>\n<!-- /wp:image -->\n",
                url, caption, caption_html
            )
        }

        "divider" => {
            "\n<!-- wp:separator -->\n<hr class=\"wp-block-separator has-alpha-channel-opacity\"/>\n<!-- /wp:separator -->\n".to_string()
        }

        "quote" => {
            let content = extract_rich_text(&block, "quote");
            format!(
                "\n<!-- wp:quote -->\n<blockquote class=\"wp-block-quote\"><p>{}</p></blockquote>\n<!-- /wp:quote -->\n",
                content
            )
        }

        // 修正原本的語法錯誤：補上完整的 format! 閉合
        "code" => {
            let content = extract_rich_text(&block, "code");
            let lang =
                block["code"]["language"].as_str().unwrap_or("plaintext");
            format!(
                "\n<!-- wp:code -->\n<pre class=\"wp-block-code\"><code lang=\"{}\">{}</code></pre>\n<!-- /wp:code -->\n",
                lang,
                html_escape(&content)
            )
        }

        "table" => {
            let table_id = block["id"].as_str().unwrap_or("");
            let has_header = block["table"]["has_column_header"]
                .as_bool()
                .unwrap_or(false);

            match fetch_all_blocks(&client, table_id, &token).await {
                Ok(rows) => {
                    let mut tr_list = Vec::new();
                    let mut head_html = String::new();

                    for (i, row) in rows.iter().enumerate() {
                        let mut cells_html = Vec::new();
                        if let Some(cells) =
                            row["table_row"]["cells"].as_array()
                        {
                            for cell in cells {
                                let tag =
                                    if i == 0 && has_header { "th" } else { "td" };
                                let content =
                                    if let Some(cell_array) = cell.as_array() {
                                        process_rich_text_array(cell_array)
                                    } else {
                                        String::new()
                                    };
                                cells_html.push(format!(
                                    "<{}>{}</{}>",
                                    tag, content, tag
                                ));
                            }
                        }
                        let row_str =
                            format!("<tr>{}</tr>", cells_html.concat());
                        if i == 0 && has_header {
                            head_html =
                                format!("<thead>{}</thead>", row_str);
                        } else {
                            tr_list.push(row_str);
                        }
                    }

                    format!(
                        "\n\n<figure class=\"wp-block-table\"><table>{}{}</table></figure>\n\n",
                        head_html,
                        format!("<tbody>{}</tbody>", tr_list.concat())
                    )
                }
                Err(_) => String::new(),
            }
        }

        "callout" => {
            let html = format_callout(
                Arc::clone(&client),
                block,
                token,
                cache,
            )
            .await;
            format!("\n{}\n", html)
        }

        "synced_block" => {
            process_synced_block(Arc::clone(&client), block, token, cache)
                .await
        }

        _ => String::new(),
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

#[async_recursion]
async fn format_callout(
    client: Arc<Client>,
    block: Value,
    token: String,
    cache: HtmlCache,
) -> String {
    let callout_data = &block["callout"];
    let icon = callout_data["icon"]["emoji"].as_str().unwrap_or("💡");
    let first_line = extract_rich_text(&block, "callout");

    let mut sub_content = String::new();
    if block["has_children"].as_bool() == Some(true) {
        if let Ok(children) =
            fetch_all_blocks(&client, block["id"].as_str().unwrap_or(""), &token).await
        {
            sub_content =
                blocks_to_wp_html(Arc::clone(&client), &children, &token, Arc::clone(&cache)).await;
        }
    }

    format!(
        "\n<!-- wp:group -->\n\
        <div class=\"wp-block-group\">\n\
        <!-- wp:paragraph -->\n\
        <p>{icon} {first_line}</p>\n\
        <!-- /wp:paragraph -->\n\
        {sub_content}\
        </div>\n\
        <!-- /wp:group -->\n"
    )
}

#[async_recursion]
async fn process_synced_block(
    client: Arc<Client>,
    block: Value,
    token: String,
    cache: HtmlCache,
) -> String {
    let synced_info = &block["synced_block"];
    let target_id = if synced_info["synced_from"].is_null() {
        block["id"].as_str().unwrap_or("").to_string()
    } else {
        synced_info["synced_from"]["block_id"]
            .as_str()
            .unwrap_or("")
            .to_string()
    };

    if target_id.is_empty() {
        return String::new();
    }

    {
        let lock = cache.lock().await;
        if let Some(cached_html) = lock.get(&target_id) {
            return cached_html.clone();
        }
    }

    let children = match fetch_all_blocks(&client, &target_id, &token).await {
        Ok(c) => c,
        Err(_) => return String::new(),
    };

    let final_html =
        process_multiple_children(Arc::clone(&client), children, &token, Arc::clone(&cache)).await;

    {
        let mut lock = cache.lock().await;
        lock.insert(target_id, final_html.clone());
    }

    final_html
}

// FuturesUnordered 取代 tokio::spawn，不需要 'static
async fn process_multiple_children(
    client: Arc<Client>,
    children: Vec<Value>,
    token: &str,
    cache: HtmlCache,
) -> String {
    let tasks: FuturesUnordered<_> = children
        .into_iter()
        .map(|child| {
            let t = token.to_string();
            let c_clone = Arc::clone(&cache);
            let client_clone = Arc::clone(&client);
            async move { convert_block_to_html(client_clone, child, t, c_clone).await }
        })
        .collect();

    tasks.collect::<Vec<String>>().await.join("\n")
}

fn process_rich_text_array(rich_texts: &[Value]) -> String {
    let mut html = String::new();
    for rt in rich_texts {
        let plain_text = rt["plain_text"].as_str().unwrap_or("");
        let annotations = &rt["annotations"];
        let mut formatted = html_escape(plain_text);

        if annotations["bold"].as_bool() == Some(true) {
            formatted = format!("<strong>{}</strong>", formatted);
        }
        if annotations["italic"].as_bool() == Some(true) {
            formatted = format!("<em>{}</em>", formatted);
        }
        if annotations["strikethrough"].as_bool() == Some(true) {
            formatted = format!("<del>{}</del>", formatted);
        }
        if annotations["underline"].as_bool() == Some(true) {
            formatted = format!("<u>{}</u>", formatted);
        }
        if annotations["code"].as_bool() == Some(true) {
            formatted = format!("<code>{}</code>", formatted);
        }
        if let Some(link) = rt["href"].as_str() {
            formatted = format!("<a href=\"{}\" target=\"_blank\">{}</a>", link, formatted);
        }
        html.push_str(&formatted);
    }
    html
}

fn extract_rich_text(block: &Value, block_type: &str) -> String {
    if let Some(rich_texts) = block[block_type]["rich_text"].as_array() {
        process_rich_text_array(rich_texts)
    } else {
        String::new()
    }
}
