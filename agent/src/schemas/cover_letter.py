from pydantic import BaseModel, Field
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
    financials: Financials

    # 租房历史与推荐人
    rental_history_2yr: str = Field(description="过去两年的居住历史（地址和时间），如无澳洲经历可填国内或N/A")
    reference: Optional[Reference] = Field(default=None, description="前房东或重要推荐人的信息")

    # 留学生独有
    co_signer_needed: bool = Field(default=False, description="是否需要父母担保人（Parent Letter/Co-signer）")
    study_details: Optional[str] = Field(default=None, description="学校和专业名称，体现学习稳定性")

    # 工作人员独有
    employer_name: Optional[str] = Field(default=None, description="公司名称（若为worker建议填写）")
