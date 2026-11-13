import { z } from 'zod';

const name = z.string().trim().min(1).max(100);
const short = z.string().trim().max(180).optional();
const detail = z.string().trim().max(280).optional();
const language = z.enum(['en', 'zh']);
const shared = { language, applicant: name, agent: short, property: short };

export const rentalLetterForm = z.discriminatedUnion('type', [
  z.object({
    ...shared,
    type: z.literal('cover'),
    study: detail,
    household: detail,
    terms: detail,
    localHistory: z.enum(['unstated', 'none', 'has']).optional(),
    history: detail,
    funding: detail,
    references: detail,
  }),
  z.object({
    ...shared,
    type: z.literal('parent'),
    parent: name,
    relationship: z.enum(['mother', 'father', 'parent']),
    expenses: detail,
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,8}(?:\.\d{1,2})?$/)
      .optional(),
    amountKind: z.enum(['fixed', 'cap']).optional(),
    frequency: z.enum(['weekly', 'monthly', 'one-off']).optional(),
    duration: detail,
    proof: detail,
    contact: short,
  }),
]);

export type RentalLetterForm = z.infer<typeof rentalLetterForm>;
export const coverProse = [
  'study',
  'household',
  'terms',
  'history',
  'funding',
  'references',
] as const;
export const parentProse = ['expenses', 'duration', 'proof'] as const;
export type LetterProse = Partial<
  Record<(typeof coverProse)[number] | (typeof parentProse)[number], string>
>;

export function letterProse(form: RentalLetterForm): LetterProse {
  if (form.type === 'parent')
    return { expenses: form.expenses, duration: form.duration, proof: form.proof };
  return {
    study: form.study,
    household: form.household,
    terms: form.terms,
    history: form.history,
    funding: form.funding,
    references: form.references,
  };
}

export function renderLetter(form: RentalLetterForm, prose: LetterProse = letterProse(form)) {
  const zh = form.language === 'zh';
  const agent = form.agent || (zh ? '房产经理' : 'Property Manager');
  const greeting = zh ? `您好，${agent}：` : `Dear ${agent},`;
  const thanks = zh ? '谢谢您的考虑。' : 'Thank you for your consideration.';
  const signOff = zh ? '此致' : 'Kind regards,';

  if (form.type === 'cover') {
    const property = form.property || (zh ? '[房源地址]' : '[property address]');
    const intro = zh
      ? `我是 ${form.applicant}，想申请租住 ${property}。`
      : `My name is ${form.applicant}, and I am writing to apply for the rental at ${property}.`;
    const history =
      form.localHistory === 'none'
        ? zh
          ? '我目前没有澳洲租房记录。'
          : 'I have no rental history in Australia yet.'
        : form.localHistory === 'has'
          ? zh
            ? '我有澳洲租房记录。'
            : 'I have previously rented in Australia.'
          : '';
    return [
      greeting,
      intro,
      [prose.study, prose.household, prose.terms].filter(Boolean).join(' '),
      [history, prose.history, prose.funding, prose.references].filter(Boolean).join(' '),
      thanks,
      signOff + '\n' + form.applicant,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  const role = {
    mother: ['mother', '母亲'],
    father: ['father', '父亲'],
    parent: ['parent', '家长'],
  }[form.relationship][zh ? 1 : 0];
  const address = form.property ? (zh ? `（${form.property}）` : ` at ${form.property}`) : '';
  const intro = zh
    ? `我是 ${form.applicant} 的${role} ${form.parent}。这封信说明我拟为这次租房申请${address}提供的资助。`
    : `My name is ${form.parent}, and I am ${form.applicant}’s ${role}. I am writing to outline the financial support I can offer for this rental application${address}.`;
  const frequency = form.frequency
    ? { weekly: [' per week', '每周'], monthly: [' per month', '每月'], 'one-off': ['', '一次性'] }[
        form.frequency
      ][zh ? 1 : 0]
    : '';
  const amount = form.amount
    ? zh
      ? `我可以${frequency}提供${form.amountKind === 'cap' ? '最多 ' : ' '}A$${form.amount}。`
      : `I can contribute ${form.amountKind === 'cap' ? 'up to ' : ''}A$${form.amount}${frequency}${form.frequency === 'one-off' ? ' as a one-off payment' : ''}.`
    : form.frequency
      ? zh
        ? `我可以${frequency}提供资助。`
        : `I can contribute${frequency}${form.frequency === 'one-off' ? ' as a one-off payment' : ''}.`
      : '';
  return [
    greeting,
    intro,
    [prose.expenses, amount, prose.duration].filter(Boolean).join(' '),
    prose.proof,
    thanks,
    [signOff, form.parent, form.contact].filter(Boolean).join('\n'),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// These examples illustrate the handbook's structure. The people and details are fictional.
export function exampleLetter(
  type: RentalLetterForm['type'],
  language: RentalLetterForm['language']
) {
  const zh = language === 'zh';
  return renderLetter(
    type === 'cover'
      ? {
          type,
          language,
          applicant: 'Alex Chen',
          property: '12 Example Street, Kensington',
          study: zh ? '我已收到 UNSW 的录取通知。' : 'I have received an offer from UNSW.',
          localHistory: 'none',
          history: zh ? '我曾在中国杭州租房。' : 'I previously rented in Hangzhou, China.',
          funding: zh ? '我的房租将由父母资助。' : 'My parents will help cover my rent.',
        }
      : {
          type,
          language,
          applicant: 'Alex Chen',
          parent: 'Lin Chen',
          relationship: 'mother',
          expenses: zh ? '我可以协助支付租金。' : 'I can help with rent.',
          amount: '450',
          amountKind: 'cap',
          frequency: 'weekly',
          duration: zh
            ? '资助仅限租期的前 12 周。'
            : 'This support is for the first 12 weeks of the tenancy only.',
        }
  );
}
