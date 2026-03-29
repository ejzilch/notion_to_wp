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
        styleTarget: "li",
        skipCommentStyle: false,
    },
    numbered_list_item: {
        wpTag: "wp:list-item",
        htmlTag: "li",
        styleTarget: "li",
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
    let result = html;

    const processedTags = new Set<string>();
    const tagCounters: Record<string, number> = {};

    for (const [blockType, baseStyle] of Object.entries(config) as [BlockType, BlockStyle][]) {
        const tag = TAG_MAP[blockType];
        if (!tag) continue;

        if (processedTags.has(tag)) continue;
        processedTags.add(tag);

        const relatedTypes = (Object.entries(TAG_MAP) as [BlockType, string][])
            .filter(([, t]) => t === tag)
            .map(([bt]) => bt);

        const regex = new RegExp(`<${tag}((?:\\s[^>]*)?)>`, "g");

        result = result.replace(regex, (match, attrStr) => {
            const idx = tagCounters[tag] ?? 0;
            tagCounters[tag] = idx + 1;

            const existingTypeMatch = attrStr.match(/data-block-type="([^"]*)"/);

            const currentBlockType: BlockType = existingTypeMatch
                ? (existingTypeMatch[1] as BlockType)
                : relatedTypes[0];

            const base = config[currentBlockType] ?? baseStyle;

            const override = Object.values(overrides).find(
                (o) => o.blockType === currentBlockType && o.blockIndex === idx
            );

            const style = mergeStyle(base, override?.style);

            const hasAny =
                style.color || style.background || style.fontSize || style.fontWeight || style.cssClass;

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

            const extraClasses = mergeClasses(
                wpColorClasses(style.color, style.background),
                style.cssClass ?? ""
            );

            const newClass = mergeClasses(existingClass, extraClasses);

            const inlineParts: string[] = [];
            if (style.color) inlineParts.push(`color:${style.color}`);
            if (style.background) inlineParts.push(`background-color:${style.background}`);
            if (style.fontSize) inlineParts.push(`font-size:${style.fontSize}`);
            if (style.fontWeight) inlineParts.push(`font-weight:${style.fontWeight}`);

            const newStyleProps = new Map<string, string>();

            if (existingStyle) {
                for (const decl of existingStyle.split(";").map((s: string) => s.trim()).filter(Boolean)) {
                    const [prop] = decl.split(":").map((s: string) => s.trim());
                    newStyleProps.set(prop, decl);
                }
            }

            for (const decl of inlineParts) {
                const [prop] = decl.split(":").map(s => s.trim());
                newStyleProps.set(prop, decl);
            }

            const newStyle = Array.from(newStyleProps.values()).join(";");

            return buildTag(tag, newClass, newStyle, dataAttrs, otherAttrs);
        });

        // 🔥 修正：list 不寫 comment
        const block = BLOCK_CONFIG[blockType];
        if (!block || block.skipCommentStyle) continue;

        const needs =
            baseStyle.color || baseStyle.background || baseStyle.fontSize;

        if (needs) {
            result = updateBlockComment(result, blockType, baseStyle);
        }
    }

    return result;
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

    return withData
        .replace(/\s*data-block-index="\d+"/g, "")
        .replace(/\s*data-block-type="[^"]*"/g, "")
        .replace(/\s+>/g, ">")
        .replace(/(<\w+)\s{2,}/g, "$1 ");
}

/* ============================= */
/* WP Comment */
/* ============================= */

function updateBlockComment(
    html: string,
    blockType: BlockType,
    style: BlockStyle
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

    const regex = new RegExp(
        `<!-- ${wpTag}(\\s+(\\{[\\s\\S]*?\\}))?(\\s*)-->`,
        "g"
    );

    return html.replace(regex, (match, _withJson, jsonPart) => {
        let attrs: Record<string, any> = {};

        if (jsonPart?.trim()) {
            try {
                attrs = JSON.parse(jsonPart.trim());
            } catch {
                return match;
            }
        }

        if (level !== undefined && attrs.level !== level) {
            return match;
        }

        if (style.color || style.background) {
            attrs.style = attrs.style || {};
            attrs.style.color = attrs.style.color || {};
            if (style.color) attrs.style.color.text = style.color;
            if (style.background) attrs.style.color.background = style.background;
        }

        if (style.fontSize) {
            attrs.style = attrs.style || {};
            attrs.style.typography = attrs.style.typography || {};
            attrs.style.typography.fontSize = style.fontSize;
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