import { generateText } from 'ai';
import { z } from 'zod';
import type { RentalLetterType } from './contracts';
import { draftLanguage, isRentalDraft } from './guide-topics';
import { modelJson } from './model-json';
import type { connectModel } from './model';

type Locale = 'zh' | 'en';
const parentLetter = /父母资助信|家长资助信|父母支持信|\bparent(?:al)?(?:[- ]support)? letter\b/i;
const coverLetter = /租房申请信|自荐信|\b(?:cover|rental application) letter\b/i;
const revision =
  /^(?:那)?(?:请|帮我|再|能不能|可以)?\s*(?:短一点|简短|精简|正式一点|语气|改|换|删|去掉|保留|加上|补充|用英文|用中文)|\b(?:make (?:it|the letter)|shorter|revise (?:it|the letter)|same letter|translate it)\b/i;
const letterDetails =
  /(?:我是|我叫|我在.{0,16}租过|我拿到|已拿到|我爸|我妈|我父母|我是申请人|我是.{0,16}的(?:母亲|父亲)|资助|offer|租房史|租房记录|\b(?:I am|I have|I received|my (?:mother|father|parents|name|offer)|AUD|A\$)\b)/i;
const differentTask =
  /(?:另一个问题|重新找|帮我找房|换个话题)|\b(?:different question|new search|find me a rental)\b/i;
const australian = '(?:澳洲|澳大利亚|澳州|本地|当地)';
const noAustralianHistory = new RegExp(
  '(?:没有|还没(?:有)?|未曾有|尚无|无|缺少)\\s*(?:任何|过)?\\s*' +
    australian +
    '(?:的)?(?:本地)?租(?:房|住)(?:历史|史|经历|记录)|(?:从没|没在|未在|还没在)' +
    australian +
    '(?:租过|租房|租住)|\\b(?:no|without|lack|never had|do not have|don.t have)\\b[^.!?]{0,20}\\b(?:(?:Australian|local) (?:rental|tenancy) history|(?:rental|tenancy) history (?:in Australia|here))\\b|\\b(?:never rented|haven.t rented|have not rented) (?:in Australia|locally)\\b',
  'i'
);
const historyMention =
  /租房(?:历史|史|记录|经历)|租过|\b(?:rented|rental history|tenancy history)\b/i;
const omitHistory =
  /(?:不要|别|不必|不用|删掉|去掉).{0,12}(?:租房(?:历史|史|记录|经历)|租过)|\b(?:omit|remove|leave out|don.t mention|do not mention).{0,28}(?:rental|tenancy) history/i;
const includeHistory =
  /(?:加回|加上|恢复|可以写).{0,20}(?:租房(?:历史|史|记录|经历)|租过)|\b(?:add|restore|include).{0,30}(?:rental|tenancy) history/i;
const noHistory =
  /没有|从没|没在|未在|尚无|\b(?:no|never|without|haven.t|have not|do not|don.t)\b/i;
const advancesOrGuarantees =
  /提前(?:支付|付|交)|预付|无限期|担保人|承担.{0,12}(?:所有|全部)|\b(?:guarantee|guarantor|liabilit\w*|indefinit\w*|in advance|upfront)\b/i;

export function rentalLetterContext(questions: string[], requested?: RentalLetterType) {
  const latest = questions.at(-1) ?? '';
  const kind = (question: string): RentalLetterType | undefined =>
    isRentalDraft(question)
      ? parentLetter.test(question)
        ? 'parent'
        : coverLetter.test(question)
          ? 'cover'
          : undefined
      : undefined;
  const start = questions.findLastIndex(question => Boolean(kind(question)));
  const previous = start >= 0 ? kind(questions[start]) : undefined;
  const type =
    requested ??
    kind(latest) ??
    (!differentTask.test(latest) &&
    (revision.test(latest) || (start === questions.length - 2 && letterDetails.test(latest)))
      ? previous
      : undefined);
  if (!type) return undefined;
  const boundary = questions.slice(0, -1).findLastIndex(question => {
    const earlierKind = kind(question);
    return differentTask.test(question) || (earlierKind && earlierKind !== type);
  });
  const relevant = questions
    .slice(boundary + 1)
    .filter(
      (question, i, all) =>
        i === all.length - 1 ||
        kind(question) === type ||
        letterDetails.test(question) ||
        revision.test(question)
    );
  return { type, questions: relevant };
}

const fact = z.object({
  value: z.string().trim().min(1).max(330),
  quote: z.string().trim().min(2).max(350),
});
const fields = {
  applicant: fact.optional(),
  agent: fact.optional(),
  property: fact.optional(),
  study: fact.optional(),
  history: fact.optional(),
  funding: fact.optional(),
  terms: fact.optional(),
  parent: fact.optional(),
  relationship: fact.optional(),
  support: fact.optional(),
  contact: fact.optional(),
};
const facts = z.object({ fields: z.object(fields) });
type Field = keyof typeof fields;

function normalized(text: string) {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function numbers(text: string): string[] {
  return (
    normalized(text)
      .replace(/(?<=\d),(?=\d)/g, '')
      .match(/\d+(?:\.\d+)?/g) ?? []
  );
}

const supportQualifiers = [
  {
    source: /最多|至多|不超过|上限|\b(?:up to|at most|no more than|maximum)\b/i,
    value: /最多|至多|不超过|上限|\b(?:up to|at most|no more than|maximum|cap(?:ped)?)\b/i,
  },
  {
    source: /仅限|只(?:资助|付|支持|支付|承担)|\b(?:only|limited to)\b/i,
    value: /仅|只|\b(?:only|for the (?:first|initial)|limited to)\b/i,
  },
  { source: /前\s*\d|\bfirst\s+\d/i, value: /前\s*\d|\b(?:first|initial)\s+\d/i },
  {
    source: /每周|\/周|\b(?:per week|a week|weekly)\b|\/wk/i,
    value: /每周|\/周|\b(?:per week|a week|weekly)\b|\/wk/i,
  },
  {
    source: /每月|\/月|\b(?:per month|a month|monthly)\b/i,
    value: /每月|\/月|\b(?:per month|a month|monthly)\b/i,
  },
  { source: /澳元|澳币|A\$|AU\$|\bAUD\b/i, value: /澳元|澳币|A\$|AU\$|\bAUD\b/i },
  {
    source: /前\s*\d+\s*周|\bfirst\s+\d+\s+weeks?\b/i,
    value: /前\s*\d+\s*周|\b(?:first|initial)\s+\d+\s+weeks?\b/i,
  },
];

const unsupportedExtras =
  /不吸烟|不养宠物|无宠物|干净整洁|作息规律|财务稳定|经济条件良好|\b(?:non[- ]smoker|no pets|pet[- ]free|financially stable|financially secure|strong financial|quiet and tidy|clean and tidy|reliable tenant|responsible tenant)\b/i;
const numericSupport =
  /(?:A\$|AU\$|AUD|澳元|澳币|刀|每周|每月|最多|至多|前\s*\d|\b(?:per week|per month|first|up to|maximum)\b)/i;
const supportChange =
  /^(?:改|换|只改|金额改|资助改|额度改|上限改|期限改)|\b(?:change|raise|lower|increase|reduce|replace)\b/i;
const fundingCap =
  /(?:每周|每月)\s*(?:最多|至多|上限(?:是|为)?|不超过)?\s*(?:(?:A\$|AU\$|AUD)\s*(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*澳(?:元|币))|\b(?:up to|at most|maximum(?: of)?|no more than)\s*(?:A\$|AU\$|AUD)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(per week|per month|weekly|monthly|\/week|\/month)/i;
const supportPeriod =
  /(?:前|最初)\s*(\d+)\s*(周|个月|月)|\b(?:first|initial)\s+(\d+)\s+(weeks?|months?)\b/i;

function limitedSupport(questions: string[], locale: Locale) {
  const amount = questions.findLast(question => fundingCap.test(question));
  const value = amount?.match(fundingCap);
  const period = questions.findLast(question => supportPeriod.test(question))?.match(supportPeriod);
  if (!amount || !value || !period || !supportQualifiers[0].source.test(amount)) return undefined;
  const price = value[1] ?? value[2] ?? value[3];
  const length = Number(period[1] ?? period[3]);
  const month = /月|month/i.test(value[0]);
  const periodInMonths = /月|month/i.test(period[0]);
  return locale === 'zh'
    ? '我拟在前 ' +
        length +
        (periodInMonths ? ' 个月' : ' 周') +
        '提供资助，每' +
        (month ? '月' : '周') +
        '最多 A$' +
        price +
        '。'
    : 'I can contribute up to A$' +
        price +
        ' per ' +
        (month ? 'month' : 'week') +
        ' for the first ' +
        length +
        ' ' +
        (periodInMonths ? (length === 1 ? 'month' : 'months') : length === 1 ? 'week' : 'weeks') +
        '.';
}

const extractionPrompt = `Extract the facts for the requested rental letter. Return JSON only with this shape: {"fields":{"study":{"value":"I have received an offer from UNSW.","quote":"我有 UNSW offer"}}}.
Each quote must be an exact, contiguous excerpt of what the user actually stated, including all limits, dates, amounts, negation and jurisdiction. Pick the latest stated fact per field. Omit facts that the user removed, hypothetical examples, and missing fields. Never expand a factual claim or infer a positive trait or a promise. Use digits for amounts and durations when the user used digits.
Use short first-person sentences in study, history (positive rental experience only), funding, terms (user-stated start date or lease length only), and support (only what the parent states they will contribute, with original frequency, cap and duration). A lack of Australian rental history is scoped to Australia. Do not add any history assertion to another field.
The other field values are names or labels only: applicant, agent, property (the mentioned address or property type), parent, relationship, contact (the user's stated contact). Leave unused fields out. A parent funding statement never creates a guarantor commitment. Preserve the requested language for sentence fields.`;

export async function generateRentalLetter({
  model,
  type,
  questions,
  signal,
  redact,
}: {
  model: Awaited<ReturnType<typeof connectModel>>['model'];
  type: RentalLetterType;
  questions: string[];
  signal: AbortSignal;
  redact: (text: string) => string;
}) {
  const language = questions.reduce<Locale>(
    (current, question) => draftLanguage(question, current),
    'en'
  );
  const zh = language === 'zh';
  const result = await generateText({
    model,
    system: extractionPrompt,
    prompt: JSON.stringify({ type, language, userMessages: questions }),
    maxOutputTokens: 800,
    maxRetries: 0,
    abortSignal: signal,
  });
  const parsed = facts.safeParse(modelJson(redact(result.text)));
  const extracted = parsed.success ? parsed.data.fields : {};
  const historyInstruction = questions.findLast(
    question => omitHistory.test(question) || includeHistory.test(question)
  );
  const historyOmitted = Boolean(historyInstruction && omitHistory.test(historyInstruction));
  const statedSupport = questions.filter(
    question => numbers(question).length && numericSupport.test(question)
  );
  const supportRevision = statedSupport.findLast(question => supportChange.test(question));
  function get(field: Field) {
    const entry = extracted[field];
    if (!entry) return '';
    const quote = normalized(entry.quote);
    const value = normalized(entry.value);
    const origin = questions.findLastIndex(question => normalized(question).includes(quote));
    if (origin < 0) return '';
    if (unsupportedExtras.test(value) && !unsupportedExtras.test(quote)) return '';
    if (
      advancesOrGuarantees.test(value) &&
      (type === 'parent' || !advancesOrGuarantees.test(quote))
    )
      return '';
    if (field !== 'history' && historyMention.test(value)) return '';
    if (field === 'history' && (historyOmitted || noHistory.test(value))) return '';
    const sourceNumbers = numbers(quote);
    const valueNumbers = numbers(value);
    if (valueNumbers.some(number => !sourceNumbers.includes(number))) return '';
    if (field === 'support' || field === 'funding' || field === 'terms') {
      if (sourceNumbers.some(number => !valueNumbers.includes(number))) return '';
      if (supportQualifiers.some(pair => pair.source.test(quote) && !pair.value.test(value)))
        return '';
    }
    if (
      field === 'support' &&
      supportRevision &&
      normalized(questions[origin]) !== normalized(supportRevision)
    )
      return '';
    return value;
  }

  const agent = get('agent') || (zh ? '[中介姓名]' : '[Agent’s name]');
  const applicant = get('applicant') || (zh ? '[申请人姓名]' : '[Applicant’s name]');
  const property = get('property') || (zh ? '[房源地址]' : '[property address]');
  const localHistoryStatement = questions.findLast(
    question =>
      historyMention.test(question) &&
      /澳洲|澳大利亚|澳州|本地|当地|\b(?:Australia|Australian|local|here)\b/i.test(question)
  );
  const noLocal = Boolean(
    localHistoryStatement && noAustralianHistory.test(localHistoryStatement) && !historyOmitted
  );
  const history = [
    noLocal && (zh ? '我目前没有澳洲租房记录。' : 'I have no rental history in Australia yet.'),
    get('history'),
  ];
  const greeting = zh ? '您好，' + agent + '：' : 'Dear ' + agent + ',';
  const close = zh ? '谢谢您的考虑。' : 'Thank you for your consideration.';
  const signOff = zh ? '此致' : 'Kind regards,';

  if (type === 'cover') {
    const intro = zh
      ? '我想申请租住这套房源（' + property + '）。'
      : 'I am writing to apply for this rental (' + property + ').';
    return {
      answer: [
        greeting,
        intro,
        [get('study'), get('terms'), ...history, get('funding')].filter(Boolean).join(' '),
        close,
        signOff + '\n' + (get('applicant') || (zh ? '[你的姓名]' : '[Your name]')),
      ]
        .filter(Boolean)
        .join('\n\n'),
      modelId: result.response.modelId,
    };
  }

  const relationship =
    get('relationship') || (zh ? '[与申请人的关系]' : '[relationship to the applicant]');
  const parent = get('parent') || (zh ? '[资助人姓名]' : '[Parent’s name]');
  const intro = zh
    ? '我是' + applicant + '的' + relationship + '。这封信说明我拟为这次租房申请提供的资助。'
    : 'I am ' +
      applicant +
      '’s ' +
      relationship +
      '. I am writing regarding the financial support I can offer for this rental application.';
  const support =
    get('support') ||
    limitedSupport(questions, language) ||
    (zh
      ? '我拟提供的资助为[金额及频率]，资助期限为[期限]。'
      : 'My proposed contribution is [amount and frequency] for [support period].');
  return {
    answer: [greeting, intro, support, close, signOff + '\n' + parent, get('contact')]
      .filter(Boolean)
      .join('\n\n'),
    modelId: result.response.modelId,
  };
}
