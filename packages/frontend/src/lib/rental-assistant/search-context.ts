import { z } from 'zod';
import { areaName, RENTAL_SCHOOLS } from '../rental-schools';
import { explicitRentCeiling, listingInput } from './listings';

const weeklyRent = z.number().min(0.01).max(100_000);
const bedroomCount = z.number().int().min(1).max(20);

export const searchContextInput = listingInput.extend({
  bedroomOptions: z
    .array(bedroomCount)
    .min(1)
    .max(3)
    .nullish()
    .describe('Exact bedroom alternatives to compare, for example [2, 3]. Use null to clear.'),
  perPersonRent: weeklyRent
    .nullish()
    .describe('Maximum AUD per person per week. Use maxRent for the whole-property cap.'),
  perPersonMinRent: weeklyRent
    .nullish()
    .describe('Minimum AUD per person per week when the user specifies a per-person rent range.'),
  occupants: bedroomCount
    .nullish()
    .describe('Number of people explicitly sharing the rent. Leave unset to use one per bedroom.'),
});

export type SearchContext = z.infer<typeof searchContextInput>;

const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const han = '一二三四五六七八九十';
const count = '[1-9]|1[0-9]|20|' + words.join('|') + '|[' + han + '两]';
const amount = '(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d{1,2}))?(?!\\d|[.,]\\d)';
const money = '(?:A?\\$\\s*|AUD\\s*)?' + amount + '\\s*(?:澳(?:元|币)|刀|AUD)?';
const person = '(?:每人|人均|(?:一个|一)人|单人|/人|per\\s+person|(?:/|a\\s+)person|each)';
const week = '(?:每周|一周|周租|周预算|per\\s+week|a\\s+week|/w(?:ee)?k|/周)';
const perPersonPatterns = [
  new RegExp(
    person +
      '\\s*(?:(?:的|是|预算|改到|改成|调到|降到|提高到|最多|最高|不超过|租金|房租|' +
      week +
      ')\\s*){0,5}' +
      money,
    'i'
  ),
  new RegExp(money + '\\s*' + week + '?\\s*' + person + '(?![a-z])', 'i'),
  new RegExp('(?:budget|rent)\\s*(?:of|is|:)?\\s*' + person + '\\s*' + money, 'i'),
];
const totalPattern = new RegExp(
  '(?:整套(?:房)?(?:的)?|全套|总(?:预算|周租|房租)|合计|总共|一共|\\btotal\\b|\\bin total\\b)' +
    '\\s*(?:(?:预算|上限|最多|不超过|为|是|每周|周租|房租|rent|budget|of|is|up to|under|:)\\s*){0,6}' +
    money,
  'i'
);
const wholeBudgetPattern = new RegExp(
  '(?:预算|周租|\\bbudget\\b)\\s*(?:(?:改到|改成|调到|降到|提高到|上限|最多|不超过|每周|一周|为|是|of|is|up to|under|:)\\s*){0,5}' +
    money,
  'i'
);
const rentRangePattern = new RegExp(
  '(?:预算|周租|租金|\\bbudget\\b|\\brent\\b)\\s*(?:(?:在|介于|为|是|of|is|between|from|:)\\s*){0,4}' +
    money +
    '\\s*(?:到|至|和|[-–~]|\\bto\\b|\\band\\b)\\s*' +
    money,
  'i'
);
const commutePattern =
  /(?:通勤|公交|公共交通|地铁|火车)\s*(?:(?:改成|改到|调到|降到|缩到|提高到|控制在|限制为)\s*)?(?:最多|不超过|上限)?\s*(\d{1,3})\s*分钟|\b(?:within|under|max(?:imum)?)\s*(\d{1,3})\s*(?:min(?:ute)?s?\b)/i;

function countValue(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value === '两') return 2;
  const english = words.indexOf(value.toLowerCase());
  return english >= 0 ? english + 1 : han.indexOf(value) + 1;
}

function rentAmount(match: RegExpExecArray | null, index = 1) {
  if (!match) return undefined;
  const value = Number(
    match[index].replaceAll(',', '') + (match[index + 1] ? '.' + match[index + 1] : '')
  );
  return weeklyRent.safeParse(value).success ? value : undefined;
}

function bedroomsIn(question: string) {
  const singular = new RegExp(
    '(?<![a-z0-9])(' +
      count +
      ')\\s*(?:-?\\s*(?:bedrooms?|beds?|br)\\b|b(?:\\d+b)?\\b|卧室?|居|房(?!间))',
    'gi'
  );
  const pair = new RegExp(
    '(?<![a-z0-9])(' +
      count +
      ')\\s*(?:或|和|到|至|/|、|[-–]|\\band\\b|\\bor\\b|\\bto\\b)\\s*(' +
      count +
      ')\\s*(?:-?\\s*(?:bedrooms?|beds?|br)\\b|b(?:\\d+b)?\\b|卧室?|居|房(?!间))',
    'gi'
  );
  const preferred = question
    .split(/只看|只要|改成|换成|\bonly\b|\binstead\s+(?:look for|find)\b/i)
    .at(-1)!;
  const numbers = (text: string) =>
    [
      ...new Set([
        ...[...text.matchAll(pair)].flatMap(match => [countValue(match[1]), countValue(match[2])]),
        ...[...text.matchAll(singular)].map(match => countValue(match[1])),
      ]),
    ].slice(0, 3);
  const latest = numbers(preferred);
  return latest.length ? latest : numbers(question);
}

function occupantsIn(question: string) {
  const pattern = new RegExp(
    '(?:我们(?:是|有)?|一共|总共|实际|只有)\\s*(' +
      count +
      ')\\s*(?:个)?人(?=$|[^人])' +
      '|(?<!\\d)(' +
      count +
      ')\\s*(?:个)?人\\s*(?:一起|合租|合住|分摊|平摊|入住|住)' +
      '|\\b(' +
      count +
      ')\\s+(?:of\\s+us|people|tenants|occupants|adults)\\b' +
      '|\\b(?:split|shared)\\s+(?:between|among|by)\\s+(' +
      count +
      ')\\b',
    'gi'
  );
  const sizes = new Set(
    [...question.matchAll(pattern)].map(match =>
      countValue(match[1] ?? match[2] ?? match[3] ?? match[4])
    )
  );
  if (sizes.size === 1) return [...sizes][0];
  if (/自己住|独居|\b(?:live|living) alone\b/i.test(question)) return 1;
}

const campusNames = {
  UNSW: /\bUNSW\b|新南威尔士大学|新南(?:附近|校区)|\buniversity of new south wales\b/i,
  USYD: /\bUSYD\b|悉尼大学|悉大|\buniversity of sydney\b/i,
  UTS: /\bUTS\b|悉尼科技大学|\buniversity of technology sydney\b/i,
};
const catalog = [...new Set(RENTAL_SCHOOLS.flatMap(school => school.areas))]
  .map(area => area.replaceAll('-', ' '))
  .sort((a, b) => b.length - a.length);

export function searchChanges(value: string): SearchContext {
  const question = value.replace(/，(?!\d{3}(?!\d))/g, ' ').normalize('NFKC');
  const lower = question.toLowerCase().replaceAll('-', ' ');
  const schools = (Object.keys(campusNames) as (keyof typeof campusNames)[]).filter(school =>
    campusNames[school].test(question)
  );
  const suburbs = catalog
    .flatMap(area => {
      const match = new RegExp(
        '\\b' + (area === 'sydney city' ? 'sydney (?:city|cbd)' : area) + '\\b'
      ).exec(lower);
      return match ? [{ area, at: match.index }] : [];
    })
    .sort((a, b) => a.at - b.at)
    .slice(0, 3)
    .map(item => areaName(item.area));
  const rooms = bedroomsIn(question);
  const occupants = occupantsIn(question);
  const commuteMatch = commutePattern.exec(question);
  const commute = Number(commuteMatch?.[1] ?? commuteMatch?.[2]);
  const result: SearchContext = {};
  if (schools.length === 1) result.school = schools[0];
  if (suburbs.length) result.suburbs = suburbs;
  else if (
    /区域不限|不限(?:区域|区名)|取消区名|\b(?:any suburb|all areas|clear (?:the )?suburbs?)\b/i.test(
      question
    )
  )
    result.suburbs = [];
  if (rooms.length) {
    result.bedrooms = rooms.length === 1 ? rooms[0] : null;
    result.bedroomOptions = rooms.length > 1 ? rooms : null;
  }
  if (occupants) result.occupants = occupants;
  if (commute > 0 && commute <= 180) result.maxCommute = commute;
  if (
    /不(?:限|考虑)通勤|取消通勤|\b(?:no|remove|drop)\s+(?:the\s+)?commute (?:limit|cap)\b/i.test(
      question
    )
  )
    result.maxCommute = null;
  if (/不限(?:房型|卧室|房间)|\bany\s+(?:bedroom count|number of bedrooms)\b/i.test(question)) {
    result.bedrooms = null;
    result.bedroomOptions = null;
  }
  if (
    /预算不限|不限(?:周租|预算)|取消(?:预算|租金)上限|\b(?:no|remove|drop)\s+(?:the\s+)?(?:rent|budget) (?:limit|cap)\b/i.test(
      question
    )
  ) {
    result.maxRent = null;
    result.perPersonRent = null;
    result.perPersonMinRent = null;
    return result;
  }

  const monthly = /每月|月租|月预算|\bmonthly\b|\b(?:per|a) month\b|\/(?:mo|month)\b|\/月/i.test(
    question
  );
  const yearly = /每年|年租|年预算|\b(?:annual|yearly)\b|\b(?:per|a) year\b|\/year\b|\/年/i.test(
    question
  );
  if (/每晚|\b(?:per|a) night\b|\/night\b/i.test(question) || (monthly && yearly)) return result;
  const toWeekly = (value: number) => value * (monthly ? 12 / 52 : yearly ? 1 / 52 : 1);
  const budget =
    monthly || yearly
      ? question.replace(
          /每月|每年|月租|年租|月预算|年预算|\b(?:monthly|annual|yearly)\b|\b(?:per|a) (?:month|year)\b|\/(?:mo|month|year)\b|\/[月年]/gi,
          ' '
        )
      : question;
  const perPersonRange = new RegExp(
    person +
      '\\s*(?:(?:的|是|预算|在|介于|between|' +
      week +
      ')\\s*){0,6}' +
      money +
      '\\s*(?:到|至|和|[-–~]|\\bto\\b|\\band\\b)\\s*' +
      money,
    'i'
  ).exec(budget);
  const perPersonFloor = rentAmount(perPersonRange);
  const perPerson =
    rentAmount(perPersonRange, 3) ??
    perPersonPatterns.map(pattern => rentAmount(pattern.exec(budget))).find(Boolean);
  const total = rentAmount(totalPattern.exec(budget));
  const range = rentRangePattern.exec(budget);
  const lowerRent = rentAmount(range);
  const upperRent = rentAmount(range, 3);
  const validRange = lowerRent !== undefined && upperRent !== undefined && lowerRent <= upperRent;
  if (validRange && perPerson === undefined) result.minRent = Math.ceil(toWeekly(lowerRent));
  const simpleBudget = rentAmount(wholeBudgetPattern.exec(budget));
  if (perPerson !== undefined) {
    result.perPersonRent = Math.max(0.01, Math.floor(toWeekly(perPerson) * 100 + 1e-7) / 100);
    result.perPersonMinRent = perPersonFloor
      ? Math.ceil(toWeekly(perPersonFloor) * 100 - 1e-7) / 100
      : null;
    result.maxRent = total === undefined ? null : Math.max(1, Math.floor(toWeekly(total)));
    result.minRent = null;
  } else {
    const cap =
      total ?? (validRange ? upperRent : undefined) ?? explicitRentCeiling(budget) ?? simpleBudget;
    if (cap !== undefined) {
      result.maxRent = Math.max(1, Math.floor(toWeekly(cap)));
      result.perPersonRent = null;
      result.minRent ??= null;
    }
  }
  return result;
}

export function listingScenarios(context: SearchContext) {
  const choices = context.bedroomOptions?.length
    ? [...new Set(context.bedroomOptions)]
    : [context.bedrooms];
  return choices.flatMap(bedrooms => {
    const {
      school,
      suburbs,
      minRent,
      maxRent,
      maxCommute,
      perPersonRent,
      perPersonMinRent,
      occupants,
    } = context;
    const people = occupants ?? bedrooms;
    if ((perPersonRent || perPersonMinRent) && !people) return [];
    const split =
      perPersonRent && people
        ? { perPersonRent, occupants: people, assumed: occupants == null }
        : undefined;
    const sharedCap = split && Math.floor(split.perPersonRent * split.occupants + 1e-7);
    const sharedFloor =
      split && perPersonMinRent && Math.ceil(perPersonMinRent * split.occupants - 1e-7);
    const effectiveFloor = sharedFloor ? Math.max(minRent ?? 0, sharedFloor) : minRent;
    const effectiveCap =
      sharedCap === undefined ? maxRent : Math.min(maxRent ?? Infinity, sharedCap);
    return [
      {
        input: {
          school,
          suburbs,
          minRent: effectiveFloor,
          maxRent: effectiveCap,
          bedrooms,
          maxCommute,
        },
        split,
      },
    ];
  });
}
