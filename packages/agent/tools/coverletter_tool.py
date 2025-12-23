from langchain_core.tools import tool
from pydantic import BaseModel, Field, ValidationError
from datetime import datetime
from typing import Literal, Optional

class Financials(BaseModel):
    """财务和收入详情"""
    income_source: str = Field(description="主要收入来源（如：全职工作/父母资助/奖学金）")
    monthly_amount: str = Field(description="月收入或月度资助金额")
    proof_documents: str = Field(description="可提供的财务证明文件，如：Pay Slip, 银行存款证明, Parent Letter等")

class Reference(BaseModel):
    """租房推荐人信息"""
    ref_name: str = Field(description="推荐人姓名或机构")
    ref_contact: str = Field(description="推荐人联系方式或职位")
    ref_type: Literal["landlord", "employer", "academic"] = Field(description="推荐人类别：前房东/雇主/学术导师")

class FullApplicationInput(BaseModel):
    """生成完整租房申请信所需的所有详细信息"""
    
    # 基础信息
    user_name: str = Field(description="申请人姓名")
    dob: str = Field(description="出生日期")
    contact_info: str = Field(description="联系电话和邮箱")
    partner_status: bool = Field(description="是否有配偶/合租人 (True/False)")
    
    # 身份和就业
    user_type: Literal["worker", "student"] = Field(description="用户身份：worker(工作人员), student(留学生)")
    
    # Cover Letter 内容要点
    personal_qualities: str = Field(description="个人品质描述，强调：爱干净、安静、不办Party、不吸烟、No pets等")
    lifestyle: str = Field(description="生活习惯描述，如：作息规律、不打扰邻居")
    
    # 房产信息
    property_address: str = Field(description="目标房源的地址")
    language: Literal["zh", "en"] = Field(description="信件语言：zh(中文), en(英文)")
    
    # 核心竞争力（嵌套模型）
    financials: Financials # 财务证明
    
    # 租房历史与推荐人 (可选或填N/A)
    rental_history_2yr: str = Field(description="过去两年的居住历史（地址和时间），如无澳洲经历可填国内或N/A")
    reference: Optional[Reference] = Field(default=None, description="前房东或重要推荐人的信息")
    
    # 留学生独有信息 (如果 user_type 是 student)
    co_signer_needed: bool = Field(default=False, description="是否需要父母担保人（Parent Letter/Co-signer）")
    study_details: Optional[str] = Field(default=None, description="学校和专业名称，体现学习稳定性")

@tool("generate_rental_cover_letter", args_schema=FullApplicationInput)
def generate_rental_cover_letter(**kwargs) -> str:
    """
    根据用户提供的详细问卷信息，生成一套符合澳洲/海外标准的专业租房申请信（Cover Letter）。
    此工具根据用户的身份（学生/工作人员）和语言（中/英）动态生成内容，信件篇幅约为500字。
    """
    try:
        data = FullApplicationInput(**kwargs)
    except ValidationError as e:
        return f"Tool Execution Error: Required input parameters are incomplete or invalid. Please ensure all fields are provided before calling the tool. Validation details: {e}"

    date_str_zh = datetime.now().strftime("%Y年%m月%d日")
    date_str_en = datetime.now().strftime("%B %d, %Y")
    
    # --- 租房历史和推荐信的动态内容 ---
    if data.reference:
        history_ref_zh = (
            f"我乐意提供前任房东或{data.reference.ref_type} ({data.reference.ref_name}, 联系方式: {data.reference.ref_contact}) 的推荐信。"
            f"我的租房历史 ({data.rental_history_2yr}) 证明了我是一位可靠的租客。"
        )
        history_ref_en = (
            f"I have prepared references from my previous {data.reference.ref_type} ({data.reference.ref_name}, Contact: {data.reference.ref_contact})."
            f"My rental history ({data.rental_history_2yr}) confirms my track record as a dependable tenant."
        )
    else:
        history_ref_zh = (
            f"我的居住历史 ({data.rental_history_2yr}) 稳定。虽然没有本地房东推荐信，但我已准备好提供学术导师或雇主的推荐信，"
            f"以及收入证明、信用记录等您在筛选过程中所需的任何其他文件，以弥补这一不足。"
        )
        history_ref_en = (
            f"My residential history is stable ({data.rental_history_2yr}). Although I lack local landlord references, "
            f"I can provide recommendations from academic supervisors or employers, along with income proof and credit reports "
            f"to assure you of my reliability."
        )

    # --- 身份和财务的定制化内容 ---

    # 留学生版本
    if data.user_type == "student":
        # 中文学生身份
        identity_zh = (
            f"我目前是 {data.study_details} 的全职学生，学习任务稳定，生活重心明确。我的生活开支和租金由 {data.financials.income_source} 提供稳定支持，"
            f"月度资助金额约为 {data.financials.monthly_amount}。"
        )
        # 英文学生身份
        identity_en = (
            f"I am a dedicated full-time student pursuing studies in {data.study_details}. My living expenses and rent are securely "
            f"supported by {data.financials.income_source}, with a verifiable monthly amount of {data.financials.monthly_amount}."
        )
        
        # 担保函
        if data.co_signer_needed:
            co_signer_zh = "鉴于我是留学生，我将额外提供**父母担保函 (Parent Letter)**，由父母保证全额支付租金和生活费用，确保财务零风险。"
            co_signer_en = "As an international student, I will provide a **Parent Guarantee Letter (Co-Signer Agreement)** to legally ensure the stability of the rental payments, minimizing any financial risk."
            identity_zh += f"\n{co_signer_zh}"
            identity_en += f"\n{co_signer_en}"

    # 工作人员版本
    elif data.user_type == "worker":
        # 中文工作者身份
        employer_name = data.employer_name if data.employer_name else "[请在此处补充公司名称]"
        job_title = data.financials.income_source
        
        identity_zh = (
            f"我是一名稳定的全职工作人员，目前在 **{employer_name}** 担任 **{job_title}** 职位。"
            f"我的税前月收入为 {data.financials.monthly_amount}，工作稳定，保证租金准时支付。"
        )
        identity_en = (
            f"I am a stable employed professional, holding the position of **{job_title}** at **{employer_name}**."
            f"My verifiable monthly income is {data.financials.monthly_amount}, which ensures rent payments will be reliable and punctual."
        )

    # --- 最终信件生成 ---

    PLACEHOLDERS_ZH = {
        "Address_Placeholder": "[请在此处补充房东/中介地址]",
        "City_Placeholder": "[请在此处补充城市，州/省 邮政编码]",
        "MoveIn_Placeholder": "[请在此处补充期望的入住日期]",
        "LeaseTerm_Placeholder": "[请在此处补充期望的租期，如：12个月]",
        "Viewing_Placeholder": "[请在此处补充方便看房的时间段]",
        "Name_Placeholder": "[请在此处补充房东/中介姓名]",
    }
    PLACEHOLDERS_EN = {
        "Address_Placeholder": "[Landlord/Agent Address]",
        "City_Placeholder": "[City, State Postcode]",
        "MoveIn_Placeholder": "[Desired Move-in Date]",
        "LeaseTerm_Placeholder": "[e.g., 12 months]",
        "Viewing_Placeholder": "[Available Date and Time]",
        "Name_Placeholder": "[Landlord/Agent Name]",
    }

    if data.language == "zh":
        P = PLACEHOLDERS_ZH
        template = f"""
{date_str_zh}
{P["Name_Placeholder"]}
{P["Address_Placeholder"]}
{P["City_Placeholder"]}

主题：正式租房申请：{data.property_address} - 申请人：{data.user_name}

尊敬的{P["Name_Placeholder"]}，

我写信是为了正式提交对贵方位于 **{data.property_address}** 房源的租房申请。该房源的位置、条件和租金预算完全符合我的长期居住规划，我非常期待能成为贵房产的长期稳定租客。我期望的入住日期是 **{P["MoveIn_Placeholder"]}**，租期为 **{P["LeaseTerm_Placeholder"]}**。

**1. 个人稳定性和经济实力承诺**

我的个人生活和财务状态都非常稳定。我的身份是：**{"全职学生" if data.user_type == "student" else "在职专业人士"}**。

{identity_zh}

为证明我的支付能力，我已准备好详细的证明文件，包括：{data.financials.proof_documents}。我的财务能力是我的核心竞争力，旨在消除您对租金收取的任何顾虑。

**2. 对房屋的维护与生活习惯承诺**

我极其注重整洁和对房屋的维护，承诺将像对待自己的家一样爱护您的房产。

**个人品质与行为**：我是一位 {data.personal_qualities} 的租客，我的生活习惯是 {data.lifestyle}。我作息规律、安静、绝不会打扰邻里。我郑重承诺：不吸烟、不办任何派对、不使用非法药物。
**维护责任**：我理解房屋维护的重要性，并保证会及时、主动地报告任何需要维修的问题。

**3. 租房历史和推荐人**

{history_ref_zh}

我已将所有要求文件（包括：身份证明、财务证明、{data.reference.ref_type if data.reference else "其他"}推荐信等）准备妥当，将在您要求时立即提交完整的申请包。

我随时可以安排看房，理想时间是 **{P["Viewing_Placeholder"]}**，但我可以灵活配合您的时间。

非常感谢您审阅这份详细的申请。我深信我的稳定性和责任心将使我成为您理想的、长期的租客。

此致，

{data.user_name}
联系方式：{data.contact_info}
"""
    else: 
        P = PLACEHOLDERS_EN
        template = f"""
{date_str_en}
{P["Name_Placeholder"]}
{P["Address_Placeholder"]}
{P["City_Placeholder"]}

Subject: Formal and Comprehensive Rental Application for the Property at {data.property_address} – Applicant: {data.user_name}

Dear {P["Name_Placeholder"]},

I am writing to submit my formal and comprehensive application for the tenancy of the unit located at **{data.property_address}**, which I discovered on [Source]. The location, condition, and monthly rate are an exceptional fit for my long-term plans, and I am highly motivated to secure this tenancy. My anticipated move-in date is {P["MoveIn_Placeholder"]}, for a lease term of {P["LeaseTerm_Placeholder"]}.

**1. Personal Stability and Financial Reliability**

I am a responsible and well-established individual. My current status is: **{"Full-time Student" if data.user_type == "student" else "Employed Professional"}**.

{identity_en}

To substantiate my strong financial capability, I have attached detailed documentation, including: {data.financials.proof_documents}. This evidence demonstrates that I possess the necessary and sufficient funds to cover all rent and bond obligations reliably and on time.

**2. Commitment to Property Maintenance and Lifestyle**

I take immense pride in maintaining a clean, quiet, and well-organized living space, and I will treat your property with the utmost care.

**Hygiene and Conduct:** I am meticulous about cleanliness, ensuring no maintenance issues arise from neglect. I am a {data.personal_qualities} tenant, and my lifestyle is {data.lifestyle}. I strictly adhere to rules regarding non-smoking, no parties, no illegal substances, and No Pets.
**Respect:** My lifestyle is predictable and respectful. I am committed to not causing any noise disturbance to neighbours and promise to report any required maintenance promptly.

**3. Rental History and References**

{history_ref_en}

I have prepared a complete supporting package, including: my Photo ID, comprehensive financial documentation, and supporting {data.reference.ref_type if data.reference else "other"} reference letters, ready for immediate submission.

I am available for a property inspection at your earliest convenience, preferably on {P["Viewing_Placeholder"]}, and I am flexible to accommodate your schedule.

Thank you very much for your time and careful consideration of my comprehensive application package. I am confident that I would be an ideal, reliable, and long-term tenant for your valuable property.

Sincerely,

{data.user_name}
Contact: {data.contact_info}
"""

    return template.strip()