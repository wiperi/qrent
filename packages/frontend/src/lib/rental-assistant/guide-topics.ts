const report = /\bcondition report\b|入住(?:检查)?报告|房屋状况报告/i;
const timing = /几天|多久|期限|什么时候|何时|多长时间|\b(?:how long|how soon|when|deadline|due)\b/i;
const upfront =
  /预付(?:.{0,10}租金)?|起租费用|\badvance rent\b|\brent in advance\b|\bupfront (?:rent|payments?|costs?)\b|(?:押金|定金|\bbond\b|holding fee).{0,32}(?:上限|最多|多少|几周|过高|收多少|cap|limit|how much|[2-9]\s*(?:周|weeks?))|(?:多少|最多|上限|how much|maximum|[2-9]\s*(?:周|weeks?)).{0,32}(?:押金|\bbond\b|holding fee)|\b(?:two|three|four|five|six|seven|eight|nine|ten) weeks?['’]? (?:of |as a )?bond\b/i;
const water = /冷水|水费|水表|水账单|用水费|\b(?:cold water|water (?:bill|usage|charge|meter))\b/i;
const pet =
  /(?:养|带)(?:宠物|猫|狗)|(?:宠物|猫|狗).{0,28}(?:申请|同意|不回)|\b(?:keep|bring|have|allow).*\b(?:pets?|dogs?|cats?)\b|\bpet (?:application|consent|permission)\b/i;
const sharing =
  /转租|室友.{0,14}(?:欠租|不交租|不交房租)|\b(?:sublet|subletting|co-tenant.*arrears)\b/i;
const scam =
  /骗局|被骗|诈骗|钓鱼|黑中介|不让(?:看房|实看).{0,55}(?:押金|打钱|转账)|(?:私下|个人账户).{0,25}(?:押金|转账)|\b(?:scam|scammer)\b|(?:bank[- ]transfer|wire|personal account|pay).{0,26}\bbond\b.{0,26}(?:tonight|now|before)|(?:won.t|refus\w*)[^.!?]{0,26}\b(?:inspect|view)\b[^.!?]{0,80}\b(?:bond|transfer|deposit)\b/i;
const ending =
  /提前(?:退租|解约)|(?:通知|告知).*搬|房东.*(?:卖房|终止合同)|(?:签证|退学).*(?:租约|合同)|(?:[0-9]+\s*天|多少天|多久).{0,10}通知.{0,12}(?:走|搬|退|离开)|现在.{0,8}(?:搬|退).{0,35}通知|\bnotice (?:period|to end|to leave)\b|\bbreak(?:ing)? (?:my |the |a )?(?:lease|tenancy)\b|\blandlord.*sell\b/i;
const rentIncrease = /涨租|加租|\brent (?:increase|rise|hike)|\braise (?:the |my )?rent\b/i;
const repairs = /维修|报修|不修|漏水|坏了|发霉|\b(?:repairs?|fix|leak(?:s|ing)?)\b/i;
const repairRent =
  /(?:停付|停交|拒交|不交|不付).{0,8}(?:房租|租金)|\b(?:withhold|stop paying) (?:the |my )?rent\b/i;
const inspection =
  /(?:去|现场|实地|第一次).{0,8}看房|看房(?:时|要|清单|检查|注意)|验房.*清单|\b(?:inspection checklist|inspection tips)\b|(?:check|look for) (?:at|during) an inspection/i;
const applicationEvidence =
  /自雇|个体户|自由职业|没有工资单|\b(?:self[- ]employed|without payslips|no payslips)\b/i;
const bankingRecords =
  /银行(?:账单|流水|交易记录)|\b(?:banking history|bank (?:statements?|transaction history))\b/i;
const rentalApplication = /申请|中介|\b(?:apply|application|agent|rejected)\b/i;
const draftRequest =
  /(?:写|生成|起草|润色|改写).{0,28}(?:一封|邮件|申请信|自荐信|资助信|回复|(?:cover|parent) letter)|\b(?:draft|write|generate|compose|rewrite|polish)\b[^.!?\n]{0,80}\b(?:e-?mail|letter|message|note|reply)\b/i;
const newMould =
  /(?:霉斑|发霉|霉菌|\bmou?ld\b).{0,55}(?:拿到钥匙|入住|刚搬|刚住|moved in|got the keys)|(?:拿到钥匙|入住|刚搬|刚住|moved in|got the keys).{0,55}(?:霉斑|发霉|霉菌|\bmou?ld\b)/i;
const overseasProxy =
  /代看|找人看房|朋友.{0,9}(?:看房|代看)|\b(?:proxy|remote) inspection\b|\b(?:friend|someone)\b.{0,36}\b(?:inspect|view|go for me)\b/i;
const noLocalHistory =
  /(?:没有|无|缺).{0,16}租房(?:历史|史|记录)|\b(?:no|without|lack).{0,25}(?:rental|tenancy) history\b/i;
const availableDate = /available date|可起租日|广告.*起租/i;
const housing =
  /\b(?:scape|iglu|twin room|student accommodation)\b|学生公寓|(?:一个人|自己)睡一间|校内宿舍|校外宿舍/i;
const inspectionStatus =
  /deposit taken|已收定金|已收押金|房源状态.{0,15}(?:不一致|不同)|inspection.{0,28}(?:cancelled|still on)/i;
const appliance = /洗衣机|烘干机|洗碗机|\b(?:washing machine|washer|dryer|dishwasher)\b/i;
const oldListing =
  /历史照片|旧照片|历史广告|平面图|\b(?:older? photos|listing history|floor plans?)\b/i;
const roommate = /Flatmates|室友|\b(?:housemates?|roommates?|share house)\b/i;
const sharedTerms = /账单|水电|访客|清洁|轮流|\b(?:bills?|visitors?|guests?|cleaning|chores)\b/i;
const concreteGuestLimit =
  /(?:访客|客人).{0,20}(?:最多|几小时|上限|时限)|\b(?:maximum|how (?:many hours|long)|time limit)\b.{0,45}\b(?:guests?|visitors?)\b/i;
const reference =
  /海外(?:推荐|证明)|前房东|推荐信|推荐人|\b(?:overseas reference|former landlord|rental references?|referees?)\b/i;
const sharedAppliance = /公用|共用|共享|\b(?:shared|communal)\b/i;

export type RuleTopic =
  | 'condition-deadline'
  | 'upfront'
  | 'water'
  | 'pet'
  | 'scam'
  | 'ending'
  | 'rent-increase'
  | 'repair-rent'
  | 'sharing';

const ruleSections: Record<RuleTopic, string> = {
  'condition-deadline': 'moving-in#state-report-deadlines',
  upfront: 'contracts-and-bond#nsw-upfront-payments',
  water: 'moving-in#utilities-and-water',
  pet: 'moving-in#nsw-pets',
  scam: 'platforms-and-search#verify-agent-and-listing',
  ending: 'repairs-and-moving-out#nsw-ending-notice',
  'rent-increase': 'contracts-and-bond#nsw-lease-type-and-increases',
  'repair-rent': 'repairs-and-moving-out#repair-records',
  sharing: 'contracts-and-bond#nsw-shared-tenancy',
};

export function rentalRuleTopic(question: string): RuleTopic | undefined {
  if (report.test(question) && timing.test(question)) return 'condition-deadline';
  if (repairRent.test(question) && repairs.test(question)) return 'repair-rent';
  if (scam.test(question)) return 'scam';
  if (upfront.test(question)) return 'upfront';
  if (water.test(question)) return 'water';
  if (pet.test(question)) return 'pet';
  if (
    ending.test(question) ||
    (/固定(?:期|租约)|fixed.term/i.test(question) &&
      timing.test(question) &&
      /搬|退|leave|end|notice/i.test(question))
  )
    return 'ending';
  if (rentIncrease.test(question)) return 'rent-increase';
  if (sharing.test(question)) return 'sharing';
}

export function reviewedRuleSection(topic: RuleTopic) {
  return ruleSections[topic];
}

function needsApplicationEvidence(question: string) {
  return (
    applicationEvidence.test(question) ||
    (bankingRecords.test(question) && rentalApplication.test(question))
  );
}

export function practicalGuideSections(question: string) {
  if (inspectionStatus.test(question))
    return ['platforms-and-search#search-workflow', 'inspection-checklist#before-inspection'];
  if (appliance.test(question))
    return oldListing.test(question)
      ? ['inspection-checklist#room-checklist', 'platforms-and-search#listing-history-and-booking']
      : ['inspection-checklist#room-checklist'];
  if (roommate.test(question) && sharedTerms.test(question))
    return ['budget-and-housing#roommate-and-timing', 'platforms-and-search#room-search'];
  if (overseasProxy.test(question) && noLocalHistory.test(question))
    return [
      'inspection-checklist#proxy-deliverables',
      'application-documents#parent-letter-and-history',
    ];
  if (reference.test(question))
    return [
      'application-documents#parent-letter-and-history',
      'application-documents#document-checklist',
    ];
  if (newMould.test(question))
    return ['moving-in#condition-report-checklist', 'repairs-and-moving-out#exit-and-bond'];
  if (needsApplicationEvidence(question))
    return [
      'application-documents#submit-and-follow-up',
      'application-documents#document-checklist',
    ];
  if (inspection.test(question))
    return ['inspection-checklist#room-checklist', 'inspection-checklist#before-inspection'];
  if (housing.test(question))
    return ['budget-and-housing#housing-options', 'budget-and-housing#roommate-and-timing'];
  if (availableDate.test(question)) return ['platforms-and-search#search-workflow'];
  return [];
}

export const stateNames = {
  NSW: /\bNSW\b|New South Wales|新南威尔士|新州|悉尼|\bSydney\b/i,
  VIC: /\bVIC\b|\bVictoria\b|维州|维多利亚|墨尔本|\bMelbourne\b/i,
  ACT: /\bACT\b|Canberra|堪培拉/i,
  QLD: /\bQLD\b|Queensland|昆州|昆士兰|布里斯班|Brisbane/i,
  WA: /\bWA\b|Western Australia|西澳|珀斯|Perth/i,
  SA: /\bSA\b|South Australia|南澳|阿德莱德|Adelaide/i,
  TAS: /\bTAS\b|Tasmania|塔州|塔斯马尼亚|Hobart|霍巴特/i,
  NT: /\bNT\b|Northern Territory|北领地|Darwin|达尔文/i,
};

export function namedStates(text: string) {
  return (Object.keys(stateNames) as (keyof typeof stateNames)[]).filter(state =>
    stateNames[state].test(text)
  );
}

export function isGuideFollowUp(question: string) {
  return /^(?:and\b|what (?:if|about)\b|how about\b|那|如果|换成)|\b(?:instead|the same lease)\b|(?:呢|换到)[？?。!！]?$/i.test(
    question.trim()
  );
}

export function isRentalDraft(question: string) {
  return draftRequest.test(question);
}

export function draftLanguage(question: string, fallback: 'zh' | 'en') {
  if (
    /(?:用|一封|一份)英文|英文(?:邮件|申请信|自荐信|回复|\s*cover letter)|\bin English\b/i.test(
      question
    )
  )
    return 'en';
  if (
    /(?:用|一封|一份)中文|中文(?:邮件|申请信|自荐信|回复)|\bin (?:simplified )?Chinese\b/i.test(
      question
    )
  )
    return 'zh';
  return fallback;
}

export function practicalGuideTopic(question: string, previousQuestion?: string) {
  if (
    inspectionStatus.test(question) &&
    /看房|出发|状态|\b(?:inspection|travelling|viewing|available)\b/i.test(question)
  )
    return 'inspection-status';
  if (oldListing.test(question) && appliance.test(question)) return 'appliance-inspection';
  if (
    sharedAppliance.test(question) &&
    (appliance.test(question) || (previousQuestion && appliance.test(previousQuestion)))
  )
    return 'shared-appliance';
  if (roommate.test(question) && sharedTerms.test(question) && !concreteGuestLimit.test(question))
    return 'roommate-terms';
  if (overseasProxy.test(question) && noLocalHistory.test(question)) return 'proxy-and-history';
  if (reference.test(question)) return 'rental-reference';
  if (newMould.test(question)) return 'new-mould';
  if (needsApplicationEvidence(question)) return 'application-evidence';
  if (inspection.test(question)) return 'inspection-checklist';
  if (
    housing.test(question) &&
    /旧(?:攻略|文|价格)|老攻略|historical|old (?:guide|prices?)/i.test(question)
  )
    return 'historical-housing';
  if (
    availableDate.test(question) &&
    /(?:到|更晚|迟到|之后|必须|晚一点)|\b(?:arriv\w*|land|later|move in)\b/i.test(question)
  )
    return 'available-date';
}
