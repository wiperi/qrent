/** The reviewed exports repeat the page title/date/author before section I. */
export function mainGuideBody(markdown: string): string {
  const parts = markdown.split('\n\n');
  const start = parts.findIndex(part => /^#{2,3}\s+\*{0,2}(?:一[、.．]|I\.|1\.)/.test(part));
  const redundantHeader = (part: string) =>
    /^#{1,3}\s|^---$/.test(part) ||
    /^(?:发布日期|预计阅读时长|作者|标签|Publication date|Published|Estimated reading time|Reading time|Author|Tags)\s*[:：]/i.test(
      part.replaceAll('**', '')
    );
  return start > 0 && parts.slice(0, start).every(redundantHeader)
    ? parts.slice(start).join('\n\n')
    : markdown;
}
