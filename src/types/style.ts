export type BlockType =
    | "heading_1" | "heading_2" | "heading_3" | "heading_4"
    | "paragraph" | "quote" | "code" | "callout"
    | "table" | "bulleted_list_item" | "numbered_list_item" | "divider"
    | "link" | "toggle";

export interface BlockStyle {
    color: string;
    fontWeight: string;
    fontSize: string;
    background: string;
    textDecoration: string;
    cssClass: string;
}

export type StyleConfig = Record<BlockType, BlockStyle>;

export const DEFAULT_STYLE: BlockStyle = {
    color: "",
    fontWeight: "",
    fontSize: "",
    background: "",
    textDecoration: "",
    cssClass: "",
};

export const BLOCK_LABELS: Record<BlockType, string> = {
    heading_1: "H1 大標題",
    heading_2: "H2 中標題",
    heading_3: "H3 小標題",
    heading_4: "H4 副標題",
    paragraph: "段落",
    quote: "引用",
    code: "程式碼",
    callout: "Callout",
    table: "表格",
    bulleted_list_item: "項目清單",
    numbered_list_item: "數字清單",
    divider: "分隔線",
    link: "連結",
    toggle: "折疊區塊",
};

// 每個區塊的獨立覆寫（index 是區塊在 HTML 中的順序）
export interface BlockOverride {
    blockIndex: number;
    blockType: BlockType;
    style: Partial<BlockStyle>;
}

export type BlockOverrideMap = Record<number, BlockOverride>;

export function buildDefaultStyleConfig(): StyleConfig {
    return Object.fromEntries(
        (Object.keys(BLOCK_LABELS) as BlockType[]).map((k) => [
            k,
            { ...DEFAULT_STYLE },
        ])
    ) as StyleConfig;
}