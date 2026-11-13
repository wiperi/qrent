import type { GuidePassage } from './contracts';
import {
  draftLanguage,
  isRentalDraft,
  practicalGuideTopic,
  reviewedRuleSection,
  stateNames,
  type RuleTopic,
} from './guide-topics';

type Locale = 'zh' | 'en';
type State = keyof typeof stateNames;
const unsupportedTerms =
  /学生(?:公寓|宿舍)|旅馆|酒店|短租合同|合租床位|寄宿|社会住房|\b(?:rooming house|student accommodation|boarding house|hotel|homestay|social housing|holiday let|short.stay)\b/i;
type CitedPassage = GuidePassage & { id: string };

const place: Record<State, Record<Locale, string>> = {
  NSW: { zh: '新州', en: 'New South Wales' },
  VIC: { zh: '维州', en: 'Victoria' },
  ACT: { zh: '首都领地', en: 'the ACT' },
  QLD: { zh: '昆州', en: 'Queensland' },
  WA: { zh: '西澳', en: 'Western Australia' },
  SA: { zh: '南澳', en: 'South Australia' },
  TAS: { zh: '塔州', en: 'Tasmania' },
  NT: { zh: '北领地', en: 'the Northern Territory' },
};

const statedRent =
  /(?:每周(?:租金)?|周租|每星期|weekly rent(?: is| of)?)\s*(?:A\$|AU\$|AUD\s*|\$)?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d.]|,\d)/i;
const weeklyAmount =
  /(?:A\$|AU\$|AUD\s*|\$)\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?![\d.]|,\d)\s*(?:\/周|每周|per week|a week|\/wk|\/week)|(?<![\d.,])(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:澳元|澳币|澳刀|刀|AUD)\s*(?:\/周|每周|per week|a week|\/wk|\/week)/i;

function quotedWeeklyRent(question: string) {
  const text = question.normalize('NFKC');
  const price = statedRent.exec(text)?.[1] ?? weeklyAmount.exec(text)?.slice(1).find(Boolean);
  if (!price) return undefined;
  const amount = Number(price.replaceAll(',', ''));
  return amount > 0 && amount <= 100000 ? amount : undefined;
}

function money(amount: number) {
  return 'A$' + amount.toLocaleString('en-AU', { maximumFractionDigits: 2 });
}

export function reviewedRentalAnswer({
  topic,
  jurisdictions,
  passages,
  locale,
  question,
}: {
  topic: RuleTopic;
  jurisdictions: State[];
  passages: CitedPassage[];
  locale: Locale;
  question: string;
}) {
  const zh = locale === 'zh';
  // The risk indicators in a payment request can be addressed before the state is known.
  if (topic === 'scam') {
    const source = passages.find(item => item.path.endsWith('#verify-agent-and-listing'));
    if (!source) return undefined;
    const cite = ' [' + source.id + ']';
    return zh
      ? '先别转账。对方拒绝核验或看房，又催你向个人账户付押金，值得停下来查证。用自己查到的电话联系中介办公室，核对广告、带看人和付款请求；直租则核对对方身份和出租权限。确认能实看或由可信的人代看，并拿到书面付款条款后，再核对本州的押金交存方式。' +
          cite
      : 'Hold off on the transfer. Verify the advertisement, the person showing it and the payment request by calling the agency on a number you found independently. For a private landlord, check their identity and authority to let the home. Arrange a viewing or a trusted proxy and verify the written terms and the state bond process before paying.' +
          cite;
  }

  if (unsupportedTerms.test(question))
    return zh
      ? '这类住宿可能使用单独的协议。先确认合同名称和所在州，我再按适用的住宿规则核对。'
      : 'This accommodation can have a different agreement. What type of contract did you sign, and which state is it in?';

  if (!jurisdictions.length)
    return zh
      ? '房子在哪个州或领地？告诉我所在城市或州，我可以按当地住宅租约的规则核对。'
      : 'Which state or territory is the property in? I can check the rules for the local residential tenancy once I know where it is.';

  const supported = jurisdictions.filter(
    state => state === 'NSW' || (topic === 'condition-deadline' && state === 'VIC')
  );
  const uncovered = jurisdictions.filter(state => !supported.includes(state));
  const missingSource = (states: State[]) => {
    const label = states.map(state => place[state][locale]).join(zh ? '、' : ', ');
    return zh
      ? label + '这条住宅租赁规则暂时没有已审校的出处可核对。请查当地租赁主管机构的现行指引。'
      : 'I do not have a reviewed source for this rule in ' +
          label +
          '. Check the current guidance from the local tenancy authority.';
  };
  if (!supported.length || (uncovered.length && topic !== 'condition-deadline'))
    return missingSource(uncovered);

  const source = passages.find(item =>
    item.path.endsWith('#' + reviewedRuleSection(topic).split('#')[1])
  );
  if (!source) return undefined;
  const cite = ' [' + source.id + ']';

  switch (topic) {
    case 'condition-deadline': {
      const terms = supported.map(state =>
        state === 'VIC'
          ? zh
            ? '维州：入住后 5 个工作日内，周末和公众假期不计。'
            : 'Victoria: within 5 business days of moving in, excluding weekends and public holidays.'
          : zh
            ? '新州：取得房屋占有权（通常是交钥匙）后 7 天内回交已完成的副本。'
            : 'NSW: return the completed copy within 7 days of being given possession.'
      );
      return (
        terms.join('\n\n') +
        cite +
        (uncovered.length ? '\n\n' + missingSource(uncovered) : '') +
        (zh
          ? '\n\n签好后交给中介或房东，自己保留副本、照片和发送记录。'
          : '\n\nKeep a copy, dated photos and evidence of delivery.')
      );
    }
    case 'upfront': {
      if (
        /holding fee|定金/i.test(question) &&
        !/押金|\bbond\b|预付|advance rent|rent in advance/i.test(question)
      )
        return zh
          ? '新州普通住宅租约的 holding fee 最多一周租金，申请获批后才可要求。签约后，这笔钱计入租金。请中介书面列清付款性质、金额和收据。' +
              cite
          : 'For an ordinary NSW residential tenancy, the holding fee can be up to one week’s rent and can only be requested after approval. If you sign the agreement it counts towards rent. Ask for written confirmation and a receipt.' +
              cite;
      const rent = quotedWeeklyRent(question);
      const bond = rent ? '（' + money(rent * 4) + '）' : '';
      const advance = rent ? '（' + money(rent * 2) + '）' : '';
      if (isRentalDraft(question) && /押金|\bbond\b/i.test(question)) {
        const enBond = rent ? ' (' + money(rent * 4) + ' at my weekly rent)' : '';
        return draftLanguage(question, locale) === 'zh'
          ? '您好，[中介姓名]：\n\n我想确认这套房的 bond 金额。按新州普通住宅租赁规定，bond 的上限是四周租金' +
              bond +
              '。麻烦核对一下这次的计算，并发一份把 bond 和预付租金分别列明的付款说明。谢谢。\n\n[你的姓名]\n\n规则依据' +
              cite
          : 'Hi [Agent’s name],\n\nCould you please confirm how the bond was calculated? For a standard NSW residential tenancy, I understand the bond is capped at four weeks of rent' +
              enBond +
              '. Could you review the amount and send an updated breakdown showing the bond and any advance rent separately?\n\nThanks for your help.\n\nKind regards,\n[Your name]\n\nSource' +
              cite;
      }
      return zh
        ? '按新州普通住宅租约，bond 最多是 4 周租金' +
            bond +
            '；房东或中介可要求的预付租金最多是 2 周' +
            advance +
            '。留学生适用同样的上限。' +
            cite +
            '\n\n可以请中介把 bond、预付租金和任何 holding fee 分列，并按上限重开付款说明；押金按正式交存流程办理并保留收据。'
        : 'For an ordinary NSW residential tenancy, the bond can be at most 4 weeks of rent' +
            (rent ? ' (' + money(rent * 4) + ')' : '') +
            ', and the agent can require at most 2 weeks of rent in advance' +
            (rent ? ' (' + money(rent * 2) + ')' : '') +
            '. The same limits apply to international students.' +
            cite +
            '\n\nAsk for a corrected breakdown of the bond, advance rent and any holding fee, and keep the bond lodgement receipt.';
    }
    case 'water':
      return zh
        ? '先请中介提供你这套房的独立水表读数、符合节水要求的依据和供水账单中与你用量对应的部分。新州住宅租赁里，满足条件时可收的是本套房的用水费；固定供水和污水服务费由房东承担。整栋楼的账单和合同里的一句话不足以核实你该付的金额。' +
            cite
        : 'Ask for the separate meter readings, water-efficiency evidence and the supplier bill or evidence for water used by your property. Under NSW rules the landlord pays fixed water and sewerage service charges. A whole-building bill does not establish your separately metered usage.' +
            cite;
    case 'pet':
      return zh
        ? '可以在入住后用新州官方宠物申请表申请。让租约上的租客都签字，交给房东或中介并保留送达证明。正式申请送达后，房东 21 天内没有书面回复，视为同意且无附加条件。公寓如有 strata 宠物程序，也要单独核对。' +
            cite
        : 'You can apply after moving in using the NSW pet application form. Have all tenants on the agreement sign and retain proof of delivery. If the landlord does not respond within 21 days after receiving a valid application, consent is taken to be granted without conditions. Check any separate strata process.' +
            cite;
    case 'ending':
      if (!/提前|刚(?:住|搬)|break|before (?:the )?end|early|penalt|罚|扣多少/i.test(question))
        return zh
          ? '新州普通住宅租约，固定期到期搬走通常至少提前 14 天书面通知；结束周期租约通常至少提前 21 天。先确认租约类型、约定的送达方式和要搬的日期。' +
              cite
          : 'For an ordinary NSW tenancy, a renter usually gives at least 14 days’ written notice to leave at the end of a fixed term, or 21 days to end a periodic agreement. Check your agreement and how the notice must be served.' +
              cite;
      return zh
        ? '新州固定期到期时的 14 天通知，和固定期内提前搬走是两种情况。普通住宅固定租约在 2020 年 3 月 23 日后签订、租期不超过 3 年且适用法定 break fee 时，按交还房屋时已过租期比例计算：不足 25% 为 4 周，25% 至不足 50% 为 3 周，50% 至不足 75% 为 2 周，75% 及以上为 1 周租金。' +
            cite +
            '\n\n先用租约起止日和实际交还日算已履行比例，再请中介书面确认金额和交钥匙日期。若刚住约三个月且签的是一年租约，尤其要核对是否已到 25%。'
        : 'The NSW 14-day notice at the end of a fixed term differs from leaving early. Where the statutory break fee applies to a fixed term of up to 3 years signed after 23 March 2020, it is 4, 3, 2 or 1 weeks of rent when less than 25%, 25–under 50%, 50–under 75%, or at least 75% of the term has elapsed, respectively.' +
            cite +
            '\n\nCheck the actual lease start, end and handover dates and ask the agent to confirm any fee in writing.';
    case 'rent-increase':
      return zh
        ? '新州普通住宅租约通常在首 12 个月内不能涨租，之后两次涨租至少间隔 12 个月。通常须提前至少 60 天书面通知新租金和生效日。请对照合同和最近一次涨租日期，旧租约和社会住房等情况另核官方说明。' +
            cite
        : 'For an ordinary NSW residential tenancy, rent generally cannot rise in the first 12 months and increases must be at least 12 months apart. Normally the landlord gives at least 60 days’ written notice stating the amount and date. Check the agreement and date of the last increase.' +
            cite;
    case 'sharing':
      return zh
        ? '在新州，把房间转租给别人前，先取得房东书面同意。把起止时间、住户人数和房租安排写清楚。共同签约的室友欠租可能影响整份租约，室友之间的分账约定和对房东的付款责任需要分别确认。查租约中签名和付款责任，涉及换人时同时核对租约与押金登记。' +
            cite
        : 'Get the landlord’s written consent before subletting a room in NSW. Set out the dates, occupancy and payment arrangements. Arrears can affect the whole shared agreement. Check who signed and what the agreement says about payment, and update the agreement and bond record if co-tenants change.' +
            cite;
    case 'repair-rent':
      return zh
        ? '在新州，紧急维修拖延时继续按约付租金。马上书面报修，附上时间、位置和照片；查看租约上的紧急维修联系人，保留沟通及回执。仍未处理时，可向 NSW Fair Trading 寻求协助。' +
            cite
        : 'Keep paying rent under the NSW agreement while you pursue the repair. Report it in writing now with the location, time and photos, use the lease’s urgent repair contact and keep records of your attempts. If the agent still does not act, seek help from NSW Fair Trading.' +
            cite;
  }
}

export function practicalRentalAnswer(
  question: string,
  locale: Locale,
  passages: CitedPassage[],
  previousQuestion?: string
) {
  const topic = practicalGuideTopic(question, previousQuestion);
  const zh = locale === 'zh';
  const link = (anchor: string) => {
    const source = passages.find(passage => passage.path.endsWith('#' + anchor));
    return source ? ' [' + source.id + ']' : '';
  };
  if (topic === 'inspection-status') {
    const workflow = link('search-workflow');
    const inspection = link('before-inspection');
    if (!workflow || !inspection) return;
    return zh
      ? '出发前用中介办公室的联系方式确认完整地址、看房场次、是否需要登记，以及房源是否还接受申请。' +
          inspection +
          '\n\nDeposit Taken 可能表示已经收款或正在推进租约。两个平台状态不一致时，当前是否仍可看房或申请要由中介确认。' +
          workflow
      : 'Before travelling, contact the listing agent and confirm the full address, whether the inspection is going ahead, how to register, and whether they are still taking applications.' +
          inspection +
          '\n\n“Deposit taken” can indicate a payment or a lease in progress. When the sites disagree, the agent needs to confirm the current status.' +
          workflow;
  }
  if (topic === 'appliance-inspection') {
    const rooms = link('room-checklist');
    const history = link('listing-history-and-booking');
    if (!rooms || !history) return;
    return zh
      ? '先把历史照片和平面图当作现场核对清单。它们无法证明设备现在还在，也无法确认模糊图上的尺寸。' +
          history +
          '\n\n现场看设备在哪、是否为本套房专用、是否能正常运行。请中介书面确认它是否随租。' +
          rooms
      : 'Use the old photos and plan to decide what to inspect. They cannot establish that the appliance is still there, and a blurry plan cannot confirm its size.' +
          history +
          '\n\nAt the viewing, check its location, whether it is shared and whether it works. Ask the agent to confirm in writing whether it is included in the tenancy.' +
          rooms;
  }
  if (topic === 'shared-appliance') {
    const rooms = link('room-checklist');
    if (!rooms) return;
    return zh
      ? '如果洗衣设备是公用的，现场确认机器能否使用、公用设备是否收费。请中介书面确认租约是否包含使用权和费用。' +
          rooms
      : 'If the laundry is shared, check that the machine works and ask whether there is a charge. Ask the agent to confirm access and any charges in writing.' +
          rooms;
  }
  if (topic === 'rental-reference') {
    const history = link('parent-letter-and-history');
    const documents = link('document-checklist');
    if (!history || !documents) return;
    return zh
      ? '如果你在海外租过房，可以请真实的前房东做推荐人。准备租住地址、起止时间和可核实的联系方式，先征得对方同意，再提醒对方留意中介的核实邮件。' +
          documents +
          '\n\n如果之前和家人同住，照实写居住经历，并问中介是否接受资金证明或父母资助说明。' +
          history
      : 'If you rented overseas, ask a former landlord who can confirm your tenancy. Include the genuine address and rental dates, ask permission before sharing their contact details, and let them know the agent may get in touch.' +
          documents +
          '\n\nIf you lived with family instead, describe that accurately and ask whether the agent will accept evidence of funds or a support letter.' +
          history;
  }
  if (topic === 'roommate-terms') {
    const terms = link('roommate-and-timing');
    const room = link('room-search');
    if (!terms || !room) return;
    return zh
      ? '可以直接问室友：哪些账单包含在周租里，额外账单怎么分？带访客或留宿要如何提前沟通？厨房和卫浴谁打扫，怎么轮班？把说定的安排写下来。' +
          terms +
          '\n\n签之前再核对谁有权出租这间房、你和谁签书面约定。' +
          room
      : 'Ask which bills are included and how any extras are split, how visitors or overnight guests are arranged, and who cleans the shared areas. Put the arrangements you agree on in writing.' +
          terms +
          '\n\nBefore signing, confirm who is authorised to let the room and who will sign the agreement with you.' +
          room;
  }
  if (topic === 'proxy-and-history') {
    const inspection = link('proxy-deliverables');
    const history = link('parent-letter-and-history');
    if (!inspection || !history) return;
    return zh
      ? '可以先问中介是否接受朋友代看、是否需要登记。请朋友拍每个房间和问题近照，核对采光、通风、噪音、水压与空调，把不能测试的地方标出来。' +
          inspection +
          '\n\n没有本地租房记录，可以如实说明国内租住或与家人同住的经历，再问中介接受哪些替代材料。可准备海外推荐信、真实存款或收入证明；由家人资助时，可附资助说明信。' +
          history
      : 'Ask the agent whether they accept a friend attending and how to register them. Ask your friend for a record of each room, photos of defects, checks of light, ventilation, noise, water and cooling, and a list of anything they could not test.' +
          inspection +
          '\n\nExplain your genuine overseas or family-home history and ask which substitutes the agent accepts. Options include an overseas reference, evidence of savings or income, or a support letter if family will fund the rent.' +
          history;
  }
  if (topic === 'inspection-checklist') {
    const cite = link('room-checklist');
    if (!cite) return;
    return (
      (zh
        ? '看房时优先检查照片看不出来的地方。\n\n' +
          '- 看墙角、窗框和柜内有没有霉斑、水渍或异味。开关窗户，确认通风。\n' +
          '- 开水龙头、冲马桶，看水压和排水，留意卫生间排气扇。\n' +
          '- 关窗听噪音。试门锁和空调，核对哪些房间有空调。\n' +
          '- 量床和桌子的空间，记下现场没法测试的项目，再请中介确认。'
        : 'Prioritise things the photos cannot show.\n\n' +
          '- Look and smell for mould or water marks around windows, walls and cupboards. Open a window to check ventilation.\n' +
          '- Run a tap, flush the toilet and check drainage and the bathroom fan.\n' +
          '- Close the windows to check noise, and check locks and which rooms have air conditioning.\n' +
          '- Measure space for your bed and desk. Note anything you could not test and ask the agent in writing.') +
      cite
    );
  }
  if (topic === 'application-evidence') {
    const cite = link('submit-and-follow-up');
    if (!cite) return;
    return zh
      ? '可以先问中介接受哪种付款能力证明，例如银行出具的余额证明，或保留姓名、日期和余额并遮掉日常交易明细的存款证明。自雇申请人也可以问是否接受会计师出具的收入摘要。' +
          cite +
          '\n\n也可以附上真实的租金支付记录或经同意的前房东推荐人。申请被拒时，可以问中介是否有材料需要补充。'
      : 'Ask the agent which evidence of ability to pay they accept. Offer a bank balance letter or a savings statement showing your name, date and balance with daily transactions redacted. If you’re self-employed, ask whether they accept an accountant’s income summary.' +
          cite +
          '\n\nAdd a rent ledger or a former landlord who has agreed to be a referee, if available. If an application was rejected, ask whether any documents were missing.';
  }
  if (topic === 'new-mould') {
    const condition = link('condition-report-checklist');
    const exit = link('exit-and-bond');
    if (!condition || !exit) return;
    return zh
      ? '现在拍清楚霉斑的位置、近照和全景，保留日期。写进入住报告，并发邮件给中介说明你刚拿钥匙就发现，附照片并要求检查原因。报告已经交了，也可以补发邮件并留好回执。' +
          condition +
          '\n\n退租时可以用这些记录和同位置的照片对照。是否扣押金要看霉斑成因和证据；收到扣款要求时，请对方列明项目和依据。' +
          exit
      : 'Take dated close-up and wider photos now. Record the mould on the condition report and email the agent to say when you first found it. Ask them to investigate the cause. If the report has already been sent, follow up in writing and keep the record.' +
          condition +
          '\n\nUse those records to compare the condition at move-out. A deduction depends on the cause and evidence. If one is claimed, ask for an itemised explanation.' +
          exit;
  }
  if (topic === 'historical-housing') {
    const cite = link('housing-options');
    if (!cite) return;
    return zh
      ? '一个人睡一间可以筛 private/single room。想要独立卫浴就看 private ensuite；厨房和客厅通常仍共享。想独用厨房和卫浴，就看 studio。Twin 通常是两个人共享同一间卧室，订房前核对平面图和实际入住人数。' +
          cite +
          '\n\n旧攻略的价格只适合了解当时的例子。算现在的预算时，查校方或公寓运营方当前的周租、租期和是否包账单。'
      : 'Choose a private or single bedroom if you want to sleep alone. A private ensuite adds your own bathroom and often shares a kitchen. A studio has its own kitchen and bathroom. A twin generally shares a bedroom. Verify the layout and occupancy before booking.' +
          cite +
          '\n\nUse old prices as historical examples. For a current budget check the university or operator’s published rent, term and inclusions.';
  }
  if (topic === 'available-date') {
    const cite = link('search-workflow');
    if (!cite) return;
    return zh
      ? 'Available Date 是广告上最早可起租的日期。现在就可以向中介询问能否接受你的起租日期，并说明怎么参加看房。若双方同意较早的租约开始日，租金按约从那天起算，即使你实际更晚入住。' +
          cite
      : 'Available Date is the earliest advertised lease start. Ask the agent now whether they will accept your preferred later start and how you can arrange a viewing. If you agree to an earlier lease start, rent is due from that agreed date even if you move in later.' +
          cite;
  }
}
