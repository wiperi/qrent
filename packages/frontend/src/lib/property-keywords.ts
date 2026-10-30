export function displayKeywords(locale: string, english: string, localized = ''): string[] {
  // The historical descriptionCn field holds the existing Chinese keyword list.
  const value = locale === 'zh' && /[\u3400-\u9fff]/.test(localized) ? localized : english;
  let words: string[];
  try {
    const parsed = JSON.parse(value);
    words = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : value.split(/[,，、\n]/);
  } catch {
    words = value.split(/[,，、\n]/);
  }
  return [
    ...new Set(
      words.map(word => word.replace(/^[\s\[\]"'“”]+|[\s\[\]"'“”]+$/g, '')).filter(Boolean)
    ),
  ].slice(0, 10);
}
