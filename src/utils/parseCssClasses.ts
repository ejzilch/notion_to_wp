/**
 * 從 CSS 字串解析出所有頂層 class 名稱
 * 例如 .tiffeny-QA summary::before → tiffeny-QA
 *      .my-button:hover            → my-button
 *      .tiffeny-notice p strong    → tiffeny-notice
 * 只取第一個 class，去重後回傳
 */
export function parseCssClasses(css: string): string[] {
    const classSet = new Set<string>();

    // 比對所有選擇器區塊（{ 前面的部分）
    const selectorRegex = /([^{}]+)\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = selectorRegex.exec(css)) !== null) {
        const selectorGroup = match[1];

        // 可能是逗號分隔的多個選擇器
        const selectors = selectorGroup.split(",");

        for (const selector of selectors) {
            const trimmed = selector.trim();

            // 找第一個 .classname
            const classMatch = trimmed.match(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/);
            if (classMatch) {
                classSet.add(classMatch[1]);
            }
        }
    }

    return Array.from(classSet).sort();
}