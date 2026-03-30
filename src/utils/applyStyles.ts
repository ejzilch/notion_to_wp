import { StyleConfig, BlockType, BlockStyle, BlockOverrideMap } from "../types/style";

/**
 * ✅ Block → Gutenberg + HTML + Style target
 */
type BlockRenderConfig = {
    wpTag: string;
    htmlTag: string;
    styleTarget: string;
    skipCommentStyle?: boolean;
};

const BLOCK_CONFIG: Partial<Record<BlockType, BlockRenderConfig>> = {
    heading_1: { wpTag: "wp:heading", htmlTag: "h1", styleTarget: "h1" },
    heading_2: { wpTag: "wp:heading", htmlTag: "h2", styleTarget: "h2" },
    heading_3: { wpTag: "wp:heading", htmlTag: "h3", styleTarget: "h3" },
    heading_4: { wpTag: "wp:heading", htmlTag: "h4", styleTarget: "h4" },

    paragraph: { wpTag: "wp:paragraph", htmlTag: "p", styleTarget: "p" },
    quote: { wpTag: "wp:quote", htmlTag: "blockquote", styleTarget: "blockquote" },
    code: { wpTag: "wp:code", htmlTag: "pre", styleTarget: "pre" },
    table: { wpTag: "wp:table", htmlTag: "table", styleTarget: "table" },
    callout: { wpTag: "wp:group", htmlTag: "div", styleTarget: ".wp-block-group" },

    // 🔥 核心：list
    bulleted_list_item: {
        wpTag: "wp:list-item",
        htmlTag: "li",
        styleTarget: "ul.wp-block-list > li",
        skipCommentStyle: false,
    },
    numbered_list_item: {
        wpTag: "wp:list-item",
        htmlTag: "li",
        styleTarget: "ol.wp-block-list > li",
        skipCommentStyle: false,
    },
    divider: {
        wpTag: "wp:separator",
        htmlTag: "hr",
        styleTarget: "hr",
    },
};

/**
 * 🔧 這裡代表「要操作的 HTML tag」
 */
const TAG_MAP: Partial<Record<BlockType, string>> = {
    heading_1: "h1",
    heading_2: "h2",
    heading_3: "h3",
    heading_4: "h4",
    paragraph: "p",
    quote: "blockquote",
    code: "pre",
    table: "table",
    callout: "div",
    bulleted_list_item: "li",
    numbered_list_item: "li",
};

/* ============================= */
/* Style Tag */
/* ============================= */

export function buildStyleTag(config: StyleConfig): string {
    const rules: string[] = [];

    for (const [blockType, style] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const block = BLOCK_CONFIG[blockType];
        if (!block) continue;

        const selector = block.styleTarget;
        if (!selector) continue;

        const declarations: string[] = [];
        if (style.color) declarations.push(`color: ${style.color}`);
        if (style.background) declarations.push(`background-color: ${style.background}`);
        if (style.fontSize) declarations.push(`font-size: ${style.fontSize}`);
        if (style.fontWeight) declarations.push(`font-weight: ${style.fontWeight}`);

        if (declarations.length > 0) {
            rules.push(`${selector} { ${declarations.join("; ")}; }`);
        }
    }

    return rules.length ? `<style>\n${rules.join("\n")}\n</style>` : "";
}

/* ============================= */
/* Utils */
/* ============================= */

function mergeClasses(...groups: string[]): string {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const group of groups) {
        for (const cls of group.split(/\s+/).filter(Boolean)) {
            if (!seen.has(cls)) {
                seen.add(cls);
                result.push(cls);
            }
        }
    }
    return result.join(" ");
}

function wpColorClasses(color?: string, bg?: string): string {
    const classes: string[] = [];
    if (color) classes.push("has-text-color", "has-link-color");
    if (bg) classes.push("has-background");
    return classes.join(" ");
}

function mergeStyle(base: BlockStyle, override?: Partial<BlockStyle>): BlockStyle {
    if (!override) return base;
    return {
        color: override.color ?? base.color,
        fontWeight: override.fontWeight ?? base.fontWeight,
        fontSize: override.fontSize ?? base.fontSize,
        background: override.background ?? base.background,
        cssClass: override.cssClass ?? base.cssClass,
    };
}

function buildTag(
    tag: string,
    newClass: string,
    newStyle: string,
    dataAttrs: string,
    otherAttrs: string
): string {
    const parts: string[] = [tag];
    if (newClass) parts.push(`class="${newClass}"`);
    if (newStyle) parts.push(`style="${newStyle}"`);
    if (dataAttrs) parts.push(dataAttrs);
    if (otherAttrs) parts.push(otherAttrs);

    return `<${parts.join(" ")}>`;
}

/* ============================= */
/* HTML Processing */
/* ============================= */
export function buildFinalHtml(
    html: string,
    config: StyleConfig,
    overrides: BlockOverrideMap = {}
): string {
    // Step 1: 用 DOMParser 標記每個 <li> 的真實 block type
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");

    // 標記 ul > li 為 bulleted_list_item，ol > li 為 numbered_list_item
    const typeCounters: Record<string, number> = {};

    doc.querySelectorAll("ul > li").forEach((li) => {
        const bt = "bulleted_list_item";
        const idx = typeCounters[bt] ?? 0;
        typeCounters[bt] = idx + 1;
        li.setAttribute("data-block-type", bt);
        li.setAttribute("data-block-index", String(idx));
    });

    doc.querySelectorAll("ol > li").forEach((li) => {
        const bt = "numbered_list_item";
        const idx = typeCounters[bt] ?? 0;
        typeCounters[bt] = idx + 1;
        li.setAttribute("data-block-type", bt);
        li.setAttribute("data-block-index", String(idx));
    });

    // Step 2: 對其他非 li 的 tag，維持原本 regex 邏輯
    // (heading, p, blockquote, etc. — 這些沒有衝突)
    const NON_LIST_TYPES: BlockType[] = [
        "heading_1", "heading_2", "heading_3", "heading_4",
        "paragraph", "quote", "code", "table", "callout", "divider",
    ];

    for (const blockType of NON_LIST_TYPES) {
        const baseStyle = config[blockType];
        if (!baseStyle) continue;
        const tag = TAG_MAP[blockType];
        if (!tag) continue;

        const elements = doc.querySelectorAll(tag);
        let idx = 0;
        elements.forEach((el) => {
            el.setAttribute("data-block-type", blockType);
            el.setAttribute("data-block-index", String(idx++));
        });
    }

    // Step 3: 套用樣式
    for (const [blockType, baseStyle] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const tag = TAG_MAP[blockType];
        if (!tag) continue;

        const elements = doc.querySelectorAll(
            `[data-block-type="${blockType}"]`
        );

        elements.forEach((el) => {
            const idx = parseInt(el.getAttribute("data-block-index") ?? "0");
            const override = Object.values(overrides).find(
                (o) => o.blockType === blockType && o.blockIndex === idx
            );
            const style = mergeStyle(baseStyle, override?.style);

            const hasAny = style.color || style.background || style.fontSize || style.fontWeight || style.cssClass;
            if (!hasAny) return;

            const extraClasses = mergeClasses(
                wpColorClasses(style.color, style.background),
                style.cssClass ?? ""
            );
            if (extraClasses) {
                el.className = mergeClasses(el.className, extraClasses);
            }

            const inlineStyle: string[] = [];
            if (style.color) inlineStyle.push(`color:${style.color}`);
            if (style.background) inlineStyle.push(`background-color:${style.background}`);
            if (style.fontSize) inlineStyle.push(`font-size:${style.fontSize}`);
            if (style.fontWeight) inlineStyle.push(`font-weight:${style.fontWeight}`);

            if (inlineStyle.length) {
                const existing = el.getAttribute("style") ?? "";
                const merged = existing
                    ? `${existing.replace(/;+$/, "")};${inlineStyle.join(";")}`
                    : inlineStyle.join(";");
                el.setAttribute("style", merged);
            }
        });
    }

    return doc.querySelector("div")!.innerHTML;
}

/* ============================= */
/* WP HTML */
/* ============================= */

export function buildWpHtml(
    html: string,
    config: StyleConfig,
    overrides: BlockOverrideMap = {}
): string {
    const withData = buildFinalHtml(html, config, overrides);

    let result = withData
        .replace(/\s*data-block-index="\d+"/g, "")
        .replace(/\s*data-block-type="[^"]*"/g, "")
        .replace(/\s+>/g, ">")
        .replace(/(<\w+)\s{2,}/g, "$1 ");

    for (const [blockType, baseStyle] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const block = BLOCK_CONFIG[blockType];
        if (!block || block.skipCommentStyle) continue;

        // 找出這個 blockType 所有的 overrides
        const blockOverrides = Object.values(overrides).filter(
            (o) => o.blockType === blockType
        );

        // 只要全域樣式或任一 override 有值就執行
        const globalNeeds = baseStyle.color || baseStyle.background ||
            baseStyle.fontSize || baseStyle.fontWeight;
        const overrideNeeds = blockOverrides.length > 0;

        if (!globalNeeds && !overrideNeeds) continue;

        result = updateBlockComment(result, blockType, baseStyle, overrides);
    }

    return result;
}

/* ============================= */
/* WP Comment */
/* ============================= */
function updateBlockComment(
    html: string,
    blockType: BlockType,
    style: BlockStyle,
    overrides?: BlockOverrideMap
): string {
    const block = BLOCK_CONFIG[blockType];
    if (!block) return html;

    const wpTag = block.wpTag;

    const levelMap: Partial<Record<BlockType, number>> = {
        heading_1: 1,
        heading_2: 2,
        heading_3: 3,
        heading_4: 4,
    };
    const level = levelMap[blockType];

    const isListItem =
        blockType === "bulleted_list_item" || blockType === "numbered_list_item";

    const regex = new RegExp(
        `<!-- ${wpTag}(\\s+(\\{[\\s\\S]*?\\}))?(\\s*)-->`,
        "g"
    );

    const counter = { count: 0 };

    return html.replace(regex, (match, _withJson, jsonPart, _ws, offset: number) => {
        let attrs: Record<string, any> = {};
        if (jsonPart?.trim()) {
            try { attrs = JSON.parse(jsonPart.trim()); } catch { return match; }
        }

        // heading level 不符跳過
        if (level !== undefined) {
            if (attrs.level !== undefined && attrs.level !== level) return match;
        }

        // list-item 判斷父層
        if (isListItem) {
            const before = html.slice(0, offset);
            const lastUl = before.lastIndexOf("<ul");
            const lastOl = before.lastIndexOf("<ol");
            const isOrdered = lastOl > lastUl;
            const expectedType: BlockType = isOrdered
                ? "numbered_list_item"
                : "bulleted_list_item";
            if (expectedType !== blockType) return match;
        }

        const idx = counter.count++;

        // ★ 核心修正：合併 override
        const override = overrides
            ? Object.values(overrides).find(
                (o) => o.blockType === blockType && o.blockIndex === idx
            )
            : undefined;

        const finalStyle = mergeStyle(style, override?.style);

        // 沒有任何樣式就跳過，保留原本的 comment
        const hasAny = finalStyle.color || finalStyle.background ||
            finalStyle.fontSize || finalStyle.fontWeight;
        if (!hasAny) return match;

        if (finalStyle.color || finalStyle.background) {
            attrs.style = attrs.style || {};
            attrs.style.color = attrs.style.color || {};
            if (finalStyle.color) attrs.style.color.text = finalStyle.color;
            if (finalStyle.background) attrs.style.color.background = finalStyle.background;
        }
        if (finalStyle.fontSize) {
            attrs.style = attrs.style || {};
            attrs.style.typography = attrs.style.typography || {};
            attrs.style.typography.fontSize = finalStyle.fontSize;
        }
        if (finalStyle.fontWeight) {
            attrs.style = attrs.style || {};
            attrs.style.typography = attrs.style.typography || {};
            attrs.style.typography.fontWeight = finalStyle.fontWeight;
        }

        const jsonStr = JSON.stringify(attrs);
        return `<!-- ${wpTag}${jsonStr === "{}" ? "" : ` ${jsonStr}`} -->`;
    });
}

export function removeDeletedBlocks(
    html: string,
    deletedBlocks: Set<string>
): string {
    let result = html;
    for (const key of deletedBlocks) {
        const lastDash = key.lastIndexOf("-");
        const blockType = key.slice(0, lastDash) as BlockType;
        const idx = key.slice(lastDash + 1);
        const tag = TAG_MAP[blockType];
        if (!tag) continue;
        const pattern = new RegExp(
            `<${tag}[^>]*data-block-index="${idx}"[^>]*data-block-type="${blockType}"[^>]*>[\\s\\S]*?<\\/${tag}>`,
            "g"
        );
        result = result.replace(pattern, "");
    }
    return result;
}