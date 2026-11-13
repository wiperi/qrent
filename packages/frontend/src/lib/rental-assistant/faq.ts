// Question variants reviewed against QA问答整理 文档.docx in packages/agent/docs.
// Source SHA-256 198586e43ac90adbdae29044896530a1c52032ed23e8e15260fc97057db0c0ce.
// The 66 source questions inform these routes. Answers come from the reviewed sections below.
const faq: { match: RegExp; sections: string[] }[] = [
  {
    match:
      /(?:国内|境外|海外).*(?:租房|提前租|看房|住处)|(?:rent|apply|inspect).*from (?:abroad|overseas)|(?:remote|proxy) inspection|代看|找人看房|(?:friend|someone).*(?:inspect|view|go for me)/i,
    sections: [
      'platforms-and-search#listing-history-and-booking',
      'inspection-checklist#proxy-deliverables',
    ],
  },
  {
    match: /open inspection|公开看房|(?:预约|登记)看房|(?:register|book).*(?:inspection|viewing)/i,
    sections: ['inspection-checklist#before-inspection'],
  },
  {
    match:
      /租房平台|比价房源|(?:reliable|trusted|rental).*(?:platforms?|sites?)|realestate.*domain|domain.*realestate/i,
    sections: ['platforms-and-search#search-workflow'],
  },
  {
    match: /available date|起租日|deposit taken/i,
    sections: ['platforms-and-search#search-workflow'],
  },
  {
    match:
      /历史照片|以前的照片|旧照片|历史广告|property history|(?:old|historical) (?:photos|listings)|floor ?plans?/i,
    sections: ['platforms-and-search#listing-history-and-booking'],
  },
  {
    match: /Flatmates|合租单间|\b(?:private|shared) (?:room|bedroom)\b/i,
    sections: ['platforms-and-search#room-search', 'budget-and-housing#housing-options'],
  },
  {
    match:
      /share house|学生公寓|合租好|整租.*分租|独立卧室|独立卫浴|shared (?:home|bedroom)|student accommodation/i,
    sections: ['budget-and-housing#housing-options', 'platforms-and-search#room-search'],
  },
  {
    match:
      /(?:租金|房租).*(?:按周|按月)|(?:按周|按月).*(?:租金|房租)|(?:weekly|monthly) (?:rent|budget).*\b(?:convert|equivalent|monthly|weekly)\b|预算.*预留/i,
    sections: ['budget-and-housing#budget-calculation'],
  },
  {
    match:
      /怎么找.*室友|异性合租|室友.*(?:作息|太吵|卫生|打扫)|怎么分.*(?:电费|水费)|\b(?:find|choose) .*housemates|split.*(?:utilities|bills)|noisy (?:roommate|housemate)/i,
    sections: ['budget-and-housing#roommate-and-timing', 'platforms-and-search#room-search'],
  },
  {
    match: /提前多久.*(?:找房|租房)|how (?:early|far in advance).*(?:look|search|rent)/i,
    sections: ['budget-and-housing#roommate-and-timing'],
  },
  {
    match:
      /(?:租房|申请).*(?:准备|需要).*(?:材料|文件)|申请材料|中介优先考虑|(?:rental|application) (?:documents?|paperwork)|what documents.*(?:apply|rent)/i,
    sections: ['application-documents#document-checklist'],
  },
  {
    match:
      /(?:无|没有|缺|不足).*(?:租房|信用).*(?:历史|史|记录)|(?:rent|credit|rental) history|担保人|guarantor|parent(?:al)?[- ]support|父母资助/i,
    sections: ['application-documents#parent-letter-and-history'],
  },
  {
    match: /自荐信|cover letter/i,
    sections: ['application-documents#cover-letter'],
  },
  {
    match:
      /(?:申请|递交).*(?:拒|跟进|回复|结果)|(?:rejected|follow up|hear back).*(?:application|agent)|application.*(?:rejected|follow up|response)/i,
    sections: ['application-documents#submit-and-follow-up'],
  },
  {
    match:
      /看房(?:时|要|清单|检查|注意)|验房.*清单|inspection (?:checklist|tips)|(?:check|look for) (?:at|during) an inspection/i,
    sections: ['inspection-checklist#room-checklist', 'inspection-checklist#before-inspection'],
  },
  {
    match:
      /涨租|加租|固定租约|周期租约|rent (?:increase|rise|hike)|raise (?:the |my )?rent|fixed.term.*periodic|periodic.*fixed.term/i,
    sections: [
      'contracts-and-bond#nsw-lease-type-and-increases',
      'contracts-and-bond#lease-checklist',
    ],
  },
  {
    match:
      /房东.*(?:进来|进屋|检查)|中介.*(?:进屋|例行检查)|例行检查|routine inspection|(?:landlord|agent).*(?:enter|access|inspect)/i,
    sections: ['moving-in#nsw-access'],
  },
  {
    match:
      /(?:养|带)(?:宠物|猫|狗)|\b(?:keep|bring|have).*\bpets?\b|pet (?:application|consent|permission)/i,
    sections: ['moving-in#nsw-pets', 'contracts-and-bond#lease-checklist'],
  },
  {
    match:
      /(?:朋友|访客).*(?:住|留宿)|(?:短租|转租|分租).*(?:可以|怎么|合法|申请)|(?:回国|假期).*(?:短租|转租)|室友.*(?:欠租|不交)|合租.*(?:同一个|共同|签约|合同)|\b(?:guests?|sublet|subletting|co-tenan[tc]s?|housemate.*arrears)\b/i,
    sections: ['contracts-and-bond#nsw-shared-tenancy', 'budget-and-housing#roommate-and-timing'],
  },
  {
    match:
      /提前(?:退租|解约|多久通知)|(?:通知|告知).*搬|房东.*(?:卖房|终止合同)|(?:签证|退学).*(?:租约|合同)|notice (?:period|to end|to leave)|break.*lease|landlord.*sell/i,
    sections: ['repairs-and-moving-out#nsw-ending-notice', 'repairs-and-moving-out#exit-and-bond'],
  },
  {
    match:
      /(?:押金|定金|中介费).*(?:多少|怎么交|上限|最多)|(?:还要交|收|hidden fee).*(?:中介费|其他费|hidden fee)|(?:bond|holding fee).*(?:cap|limit|how much)|(?:how much|maximum).*(?:bond|holding fee)/i,
    sections: ['contracts-and-bond#nsw-upfront-payments', 'contracts-and-bond#bond-lodgement'],
  },
  {
    match:
      /(?:押金|bond).*(?:私下|转账|凭证|链接|rbo|rtba)|(?:私下|转账|怎么交).*押金|\b(?:lodge|lodgement)\b.*\bbond\b|rental bonds online/i,
    sections: [
      'contracts-and-bond#bond-lodgement',
      'platforms-and-search#verify-agent-and-listing',
    ],
  },
  {
    match:
      /(?:租约|合同).*(?:注意|没写|检查)|不签合同|before signing|lease checklist|review (?:the |a )?(?:lease|tenancy agreement)/i,
    sections: ['contracts-and-bond#lease-checklist'],
  },
  {
    match:
      /(?:condition report|入住报告|房屋状况报告).*(?:退|扣|refund|back|deduct|bond)|(?:退|扣|bond|refund).*(?:condition report|入住报告|房屋状况报告)/i,
    sections: ['repairs-and-moving-out#exit-and-bond', 'moving-in#condition-report-checklist'],
  },
  {
    match:
      /(?:condition report|入住报告|房屋状况报告).*(?:几天|期限|什么时候|when|deadline|how (?:long|soon))|(?:几天|when|deadline).*(?:condition report|入住报告)/i,
    sections: ['moving-in#state-report-deadlines'],
  },
  {
    match: /condition report|入住报告|入住.*(?:拍照|检查)|房屋状况报告/i,
    sections: ['moving-in#condition-report-checklist'],
  },
  {
    match:
      /漏水|报修|坏电器|拒交房租|停付租金|维修|withhold rent|stop paying rent|water leak|\brepairs?\b/i,
    sections: ['repairs-and-moving-out#repair-records'],
  },
  {
    match:
      /(?:包含|包不包).*(?:水电|水费|电费|网费)|(?:水电|水费|电费|水表|网费).*(?:开|账单|包含|收费|谁付)|\b(?:utilities|water bills?)\b.*(?:include|connect|pay)|\b(?:pay|connect)\b.*(?:utilities|water bills?)/i,
    sections: ['moving-in#utilities-and-water'],
  },
  {
    match:
      /退租|搬走|搬出|走人.*还钥匙|退押金|退还押金|扣押金|押金.*(?:能退|多久.*退|退回来)|bond (?:back|refund|deduction)|break.*lease|mov(?:e|ing) out/i,
    sections: ['repairs-and-moving-out#exit-and-bond'],
  },
  {
    match: /租房.*纠纷|纠纷.*找谁|维权|找谁投诉|tenancy dispute|fair trading|\b(?:NCAT|VCAT)\b/i,
    sections: ['repairs-and-moving-out#dispute-help'],
  },
  {
    match:
      /骗局|被骗|诈骗|钓鱼|黑中介|(?:确认|查).*(?:中介|房东).*(?:身份|合法|资质)|\bscam\b|verify.*(?:agent|landlord)/i,
    sections: [
      'platforms-and-search#verify-agent-and-listing',
      'contracts-and-bond#bond-lodgement',
    ],
  },
];

export function faqSections(query: string) {
  return [
    ...new Set(faq.filter(entry => entry.match.test(query)).flatMap(entry => entry.sections)),
  ];
}
