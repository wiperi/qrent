export function modelJson(text: string): unknown {
  try {
    return JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, ''));
  } catch {
    return undefined;
  }
}
