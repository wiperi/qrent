type Copy = { zh: string; en: string };
const copy = (zh: string, en: string): Copy => ({ zh, en });

type Field = {
  label: Copy;
  placeholder?: Copy;
  max?: number;
  required?: boolean;
  implicit?: boolean;
  long?: boolean;
  decimal?: boolean;
  options?: [value: string, label: Copy][];
};

export const letterFields: Record<string, Field> = {
  applicant: {
    label: copy('申请人姓名', 'Applicant’s name'),
    placeholder: copy('填写英文或中文姓名', 'Name as used in the application'),
    required: true,
    max: 100,
  },
  property: {
    label: copy('房源地址', 'Property address'),
    placeholder: copy('街道、门牌号、城区', 'Street number, street and suburb'),
    max: 180,
  },
  agent: {
    label: copy('中介姓名', 'Agent’s name'),
    placeholder: copy('留空时称呼房产经理', 'Defaults to Property Manager'),
    max: 180,
  },
  study: {
    label: copy('学习或工作', 'Study or work'),
    placeholder: copy('例如：已收到 UNSW 录取通知', 'e.g. I received an offer from UNSW'),
  },
  localHistory: {
    label: copy('澳洲租房记录', 'Australian rental history'),
    options: [
      ['', copy('不写入信件', 'Leave out of letter')],
      ['none', copy('没有澳洲租房记录', 'No Australian rental history')],
      ['has', copy('有澳洲租房记录', 'Have Australian rental history')],
    ],
  },
  terms: {
    label: copy('入住日期或租期', 'Move-in date or lease length'),
    placeholder: copy('例如：计划 2 月入住', 'e.g. Planning to move in February'),
  },
  history: {
    label: copy('想补充的租房经历', 'Rental history details'),
    placeholder: copy('例如：曾在中国杭州租住一年', 'e.g. I previously rented in Hangzhou, China'),
    long: true,
  },
  funding: {
    label: copy('租金来源', 'Rent funding'),
    placeholder: copy('例如：租金由父母资助', 'e.g. My parents will help cover rent'),
    long: true,
  },
  household: {
    label: copy('同住申请人', 'Co-applicants'),
    placeholder: copy('例如：我与一位同学共同申请', 'e.g. I am applying with a classmate'),
  },
  references: {
    label: copy('推荐人或证明材料', 'References or supporting documents'),
    placeholder: copy(
      '只填写你实际可以提供的材料',
      'Only list documents or references you can provide'
    ),
    long: true,
  },
  parent: {
    label: copy('资助人姓名', 'Parent’s name'),
    placeholder: copy('填写英文或中文姓名', 'Name as it should appear in the letter'),
    required: true,
    max: 100,
  },
  relationship: {
    label: copy('与申请人的关系', 'Relationship to applicant'),
    required: true,
    options: [
      ['', copy('请选择', 'Select a relationship')],
      ['mother', copy('母亲', 'Mother')],
      ['father', copy('父亲', 'Father')],
      ['parent', copy('家长', 'Parent')],
    ],
  },
  expenses: {
    label: copy('资助哪些费用', 'Expenses covered'),
    placeholder: copy('例如：协助支付租金', 'e.g. I can help with rent'),
    long: true,
  },
  amount: {
    label: copy('资助金额（AUD）', 'Contribution (AUD)'),
    placeholder: copy('450', '450'),
    decimal: true,
    max: 11,
  },
  amountKind: {
    label: copy('金额类型', 'Amount type'),
    implicit: true,
    options: [
      ['', copy('约定金额', 'Stated amount')],
      ['cap', copy('金额上限', 'Up to this amount')],
    ],
  },
  frequency: {
    label: copy('支付频率', 'Payment frequency'),
    options: [
      ['', copy('不指定', 'Unspecified')],
      ['weekly', copy('每周', 'Weekly')],
      ['monthly', copy('每月', 'Monthly')],
      ['one-off', copy('一次性', 'One-off')],
    ],
  },
  duration: {
    label: copy('资助期限', 'Support period'),
    placeholder: copy('例如：仅限租期的前 12 周', 'e.g. The first 12 weeks of the tenancy only'),
  },
  contact: {
    label: copy('资助人联系方式', 'Parent’s contact details'),
    placeholder: copy('例如：邮箱或电话', 'e.g. Email address or phone number'),
    max: 180,
  },
  proof: {
    label: copy('可提供的资助证明', 'Available proof of support'),
    placeholder: copy('只填写你实际可以提供的证明', 'Only list documents you can provide'),
    long: true,
  },
};
