import { z } from 'zod';
import type { AssistantEvidence } from './contracts';
import { modelJson } from './model-json';

const response = z.object({
  answers: z
    .array(z.object({ id: z.string(), excerpt: z.string().trim().min(15).max(500) }))
    .max(5),
  unverified: z.boolean(),
});

export const guidanceInstructions = [
  'When it is time to answer, return JSON only in this shape: {"answers":[{"id":"G1","excerpt":"A complete, exact excerpt from that passage."}],"unverified":false}. The interface will display the selected excerpts as the answer and add the citations.',
  'Select only relevant text copied exactly from the Qrent guide passages, with the original language, conditions, jurisdiction and qualifiers. Prefer one to three concise excerpts that directly address different parts of the latest question. A historical example or someone’s personal situation is never a policy, price or limit.',
  'Keep the renter’s current situation and explicit follow-up changes in mind. If the passages are too general, call search_guides again with the specific terms and relevant context. If you cannot answer some or all of the question from the results, set unverified to true and omit the unsupported excerpts. Do not draft a free-text explanation, add example limits, reuse a previous answer as a source or include listing facts in the JSON.',
].join('\n');

export function groundedGuidance(raw: string, evidence: AssistantEvidence[], locale: 'zh' | 'en') {
  const guides = evidence.filter(source => source.kind === 'guide');
  const parsed = response.safeParse(modelJson(raw));
  const excerpts: string[] = [];
  const cited: typeof guides = [];
  if (parsed.success) {
    for (const { id, excerpt } of parsed.data.answers) {
      const source = guides.find(item => item.id === id && item.evidence !== 'historical-example');
      const exact = excerpt.replace(/\s+/g, ' ');
      if (!source || !source.text.replace(/\s+/g, ' ').includes(exact) || excerpts.includes(exact))
        continue;
      excerpts.push(exact);
      cited.push(source);
    }
  }

  const unknown =
    locale === 'zh'
      ? '我暂时没能从 Qrent 的资料里核实这部分。'
      : 'I couldn’t verify this from the Qrent guides.';
  const missing =
    !parsed.success || parsed.data.unverified || excerpts.length < parsed.data.answers.length;
  const answer = excerpts.map((excerpt, i) => excerpt + ' [' + cited[i].id + ']');
  if (!answer.length || missing) answer.push(unknown);
  return { answer: answer.join('\n\n'), evidence: [...new Set(cited)] };
}
