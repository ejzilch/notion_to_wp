import { StyleConfig, BlockType, BlockStyle, BlockOverrideMap } from "../types/style";

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

const WP_BLOCK_TAG: Partial<Record<BlockType, string>> = {
    heading_1: "wp:heading",
    heading_2: "wp:heading",
    heading_3: "wp:heading",
    heading_4: "wp:heading",
    paragraph: "wp:paragraph",
    quote: "wp:quote",
    code: "wp:code",
    table: "wp:table",
    bulleted_list_item: "wp:list",
    numbered_list_item: "wp:list",
    callout: "wp:group",
};

export function buildStyleTag(config: StyleConfig): string {
    const SELECTORS: Partial<Record<BlockType, string>> = {
        heading_1: "h1",
        heading_2: "h2",
        heading_3: "h3",
        heading_4: "h4",
        paragraph: "p",
        quote: "blockquote",
        code: "pre",
        table: "table",
        callout: ".wp-block-group",
        bulleted_list_item: "ul > li",
        numbered_list_item: "ol > li",
        divider: "hr",
    };

    const rules: string[] = [];
    for (const [blockType, style] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const selector = SELECTORS[blockType];
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
    return rules.length > 0 ? `<style>\n${rules.join("\n")}\n</style>` : "";
}

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

function wpColorClasses(color: string, bg: string): string {
    const classes: string[] = [];
    if (color) classes.push("has-text-color", "has-link-color");
    if (bg) classes.push("has-background");
    return classes.join(" ");
}

function mergeStyle(base: BlockStyle, override?: Partial<BlockStyle>): BlockStyle {
    if (!override) return base;
    return {
        color: override.color !== undefined ? override.color : base.color,
        fontWeight: override.fontWeight !== undefined ? override.fontWeight : base.fontWeight,
        fontSize: override.fontSize !== undefined ? override.fontSize : base.fontSize,
        background: override.background !== undefined ? override.background : base.background,
        cssClass: override.cssClass !== undefined ? override.cssClass : base.cssClass,
    };
}

// 把一個標籤的屬性重新組裝，確保無多餘空格
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
    // 用單一空格連接，結尾不留空格
    return `<${parts.join(" ")}>`;
}

export function buildFinalHtml(
    html: string,
    config: StyleConfig,
    overrides: BlockOverrideMap = {}
): string {
    let result = html;

    // li 只處理一次，避免 bulleted 和 numbered 重複套用
    const processedTags = new Set<string>();
    // 每個 tag 的計數器，用於對應 blockIndex
    const tagCounters: Record<string, number> = {};

    for (const [blockType, baseStyle] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const tag = TAG_MAP[blockType];

        if (!tag) continue;
        console.log(tag);
        // li 只處理一次（bulleted 和 numbered 共用同一個 tag）
        if (processedTags.has(tag)) continue;
        processedTags.add(tag);

        // 這個 tag 對應哪些 blockType（li 對應兩種）
        const relatedTypes = (Object.entries(TAG_MAP) as [BlockType, string][])
            .filter(([, t]) => t === tag)
            .map(([bt]) => bt);

        const regex = new RegExp(`<${tag}((?:\\s[^>]*)?)>`, "g");
        result = result.replace(regex, (match, attrStr) => {
            const idx = tagCounters[tag] ?? 0;
            tagCounters[tag] = idx + 1;

            // 判斷這個 tag 屬於哪個 blockType
            // 透過檢查 data-block-type（如果已有）或預設用第一個 relatedType
            const existingTypeMatch = attrStr.match(/data-block-type="([^"]*)"/);
            const currentBlockType: BlockType = existingTypeMatch
                ? (existingTypeMatch[1] as BlockType)
                : relatedTypes[0];

            const currentBaseStyle = config[currentBlockType] ?? baseStyle;

            // 找覆寫
            const override = Object.values(overrides).find(
                (o) => o.blockType === currentBlockType && o.blockIndex === idx
            );
            const style = mergeStyle(currentBaseStyle, override?.style);

            const hasAny = style.color || style.background ||
                style.fontSize || style.fontWeight || style.cssClass;

            // 取出現有屬性（去掉 data-block-* 避免重複）
            const cleanAttrs = attrStr
                .replace(/\s*data-block-index="\d+"/g, "")
                .replace(/\s*data-block-type="[^"]*"/g, "")
                .trim();

            const classMatch = cleanAttrs.match(/class="([^"]*)"/);
            const existingClass = classMatch ? classMatch[1] : "";

            const styleMatch = cleanAttrs.match(/style="([^"]*)"/);
            const existingStyle = styleMatch ? styleMatch[1].replace(/;+$/, "") : "";

            const otherAttrs = cleanAttrs
                .replace(/\s*class="[^"]*"/, "")
                .replace(/\s*style="[^"]*"/, "")
                .trim();

            const dataAttrs = `data-block-index="${idx}" data-block-type="${currentBlockType}"`;

            if (!hasAny) {
                return buildTag(tag, existingClass, existingStyle, dataAttrs, otherAttrs);
            }

            // 組裝新的 class
            const extraClasses = mergeClasses(
                wpColorClasses(style.color, style.background),
                style.cssClass
            );
            const newClass = mergeClasses(existingClass, extraClasses);

            // 組裝新的 style（避免重複：先移除已存在的同屬性）
            const inlineParts: string[] = [];
            if (style.color) inlineParts.push(`color:${style.color}`);
            if (style.background) inlineParts.push(`background-color:${style.background}`);
            if (style.fontSize) inlineParts.push(`font-size:${style.fontSize}`);
            if (style.fontWeight) inlineParts.push(`font-weight:${style.fontWeight}`);

            // 把現有 style 裡不衝突的屬性保留
            const newStyleProps = new Map<string, string>();
            if (existingStyle) {
                for (const decl of existingStyle.split(";").map((s: string) => s.trim()).filter(Boolean)) {
                    const [prop] = decl.split(":").map((s: string) => s.trim());
                    newStyleProps.set(prop, decl);
                }
            }
            // 新的覆蓋舊的
            for (const decl of inlineParts) {
                const [prop] = decl.split(":").map(s => s.trim());
                newStyleProps.set(prop, decl);
            }
            const newStyle = Array.from(newStyleProps.values()).join(";");

            return buildTag(tag, newClass, newStyle, dataAttrs, otherAttrs);
        });

        // 更新 wp block 註解
        const needsCommentUpdate = baseStyle.color || baseStyle.background || baseStyle.fontSize;
        if (needsCommentUpdate) {
            result = updateBlockComment(result, blockType, baseStyle);
        }
    }

    return result;
}

export function buildWpHtml(
    html: string,
    config: StyleConfig,
    overrides: BlockOverrideMap = {}
): string {
    const withData = buildFinalHtml(html, config, overrides);

    const cleaned = withData
        .replace(/\s*data-block-index="\d+"/g, "")
        .replace(/\s*data-block-type="[^"]*"/g, "")
        .replace(/\s+>/g, ">")
        .replace(/(<\w+)\s{2,}/g, "$1 ");
    // debug：印出所有 wp:heading 區塊
    const debugMatches = cleaned.match(/<!-- wp:heading[\s\S]*?<!-- \/wp:heading -->/g);
    console.log("[buildWpHtml] wp:heading blocks:", debugMatches);

    return cleaned;
}

function updateBlockComment(
    html: string,
    blockType: BlockType,
    style: BlockStyle,
): string {
    const wpTag = WP_BLOCK_TAG[blockType];
    if (!wpTag) return html;

    // heading 需要對應 level，避免 h2 的樣式套到 h3
    const levelMap: Partial<Record<BlockType, number>> = {
        heading_1: 1,
        heading_2: 2,
        heading_3: 3,
        heading_4: 4,
    };
    const level = levelMap[blockType];

    const commentRegex = new RegExp(
        `<!-- ${wpTag}(\\s+(\\{[\\s\\S]*?\\}))?(\\s*)-->`,
        "g"
    );

    return html.replace(commentRegex, (match, _withJson, jsonPart) => {
        let attrs: Record<string, unknown> = {};

        if (jsonPart && jsonPart.trim()) {
            try {
                attrs = JSON.parse(jsonPart.trim());
            } catch {
                return match;
            }
        }

        // 如果有 level 限制，只處理對應 level 的區塊
        if (level !== undefined) {
            if (attrs.level !== level) return match;
        }

        if (style.color || style.background) {
            if (!attrs.style) attrs.style = {};
            const s = attrs.style as Record<string, unknown>;
            if (!s.color) s.color = {};
            const c = s.color as Record<string, unknown>;
            if (style.color) c.text = style.color;
            if (style.background) c.background = style.background;
        }

        if (style.fontSize) {
            if (!attrs.style) attrs.style = {};
            const s = attrs.style as Record<string, unknown>;
            if (!s.typography) s.typography = {};
            (s.typography as Record<string, unknown>).fontSize = style.fontSize;
        }

        const jsonStr = JSON.stringify(attrs);
        const mid = jsonStr === "{}" ? "" : ` ${jsonStr}`;
        return `<!-- ${wpTag}${mid} -->`;
    });
}