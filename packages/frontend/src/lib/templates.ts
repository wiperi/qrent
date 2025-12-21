export interface CoverLetterData {
  // Identity
  name: string;
  dob: string;
  contact: string;
  hasRoommate: boolean; // true = 有配偶/合租人
  identity: 'student' | 'worker';
  schoolOrCompany: string; // 学校与专业 / 公司名称

  // Target
  targetAddress: string;
  language: 'Chinese' | 'English';

  // Qualities & Habits
  qualities: string;
  habits: string;

  // Financials
  incomeSource: string;
  monthlyIncome: string;
  financialDocs: string;
  needsGuarantor: boolean;

  // History & References
  history: string;
  referenceName: string;
  referenceContact: string;
  referenceRole: string;
}

export const DEFAULT_COVER_LETTER_DATA: CoverLetterData = {
  name: 'Your Name',
  dob: '2000-01-01',
  contact: '+61 400 000 000 / yourname@email.com',
  hasRoommate: false,
  identity: 'student',
  schoolOrCompany: 'USYD, Master of Commerce',
  targetAddress: 'Unit 5, 123 George St, Sydney',
  language: 'English',
  qualities: 'Clean, Quiet, Non-smoker, No pets',
  habits: 'Early sleeper, no parties',
  incomeSource: 'Parental support',
  monthlyIncome: '$3,000 per month',
  financialDocs: 'Bank Statement',
  needsGuarantor: false,
  history: '2023-2024: Student Village, Camperdown (Sydney)',
  referenceName: 'Former Landlord',
  referenceContact: 'landlord@example.com / +61 400 111 222',
  referenceRole: 'Previous landlord',
};

export const generateCoverLetterPrompt = (data: CoverLetterData) => {
  return `
请根据以下详细信息，为我撰写一封租房申请信 (Cover Letter)。
如果信息缺失，先只问 1 个最重要的补充问题，等待回答后再继续，不要一次抛出多个问题。

### 1. 申请人基本信息
- **姓名**: ${data.name}
- **出生日期**: ${data.dob}
- **联系方式**: ${data.contact}
- **合租情况**: ${data.hasRoommate ? '有配偶/合租人 (With spouse/roommate)' : '单人申请 (Single applicant)'}
- **用户身份**: ${data.identity === 'student' ? '留学生 (International Student)' : '工作人员 (Professional)'}
- **学校/公司**: ${data.schoolOrCompany}

### 2. 目标房源
- **地址**: ${data.targetAddress || 'the listed property'}
- **信件语言**: ${data.language} (请用此语言撰写)

### 3. 个人背景与优势
- **个人品质**: ${data.qualities}
- **生活习惯**: ${data.habits}
- **居住历史**: ${data.history || 'N/A'}

### 4. 财务能力
- **收入来源**: ${data.incomeSource}
- **月收入/资助**: ${data.monthlyIncome}
- **财务证明**: ${data.financialDocs}
- **担保人需求**: ${data.needsGuarantor ? '需要父母担保 (Guarantor provided)' : '无需担保'}

### 5. 推荐人信息
- **姓名**: ${data.referenceName || 'N/A'}
- **职位/联系方式**: ${data.referenceContact || 'N/A'}
- **关系**: ${data.referenceRole || 'N/A'}

**写作要求**:
1. 语气真诚、专业，使用 ${data.language} 回答，不要混用其它语言。
2. 强调财务稳定性、按时交租的能力。
3. 突出良好的生活习惯，承诺会爱护房产。
4. 如果是留学生，强调有家庭资助且资金充足。
5. 用 Markdown 段落格式输出，避免无意义的前缀。
6. 如果确实需要额外信息，最多只提出一个问题，等待回答后再继续。
`;
};
