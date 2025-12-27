from pydantic import BaseModel, Field
from typing import Literal, Optional


class Financials(BaseModel):
    income_source: str = Field(description="主要收入来源（如：full-time job / family support / scholarship）")
    monthly_amount: Optional[str] = Field(default=None, description="月收入或月度资助金额（可选）")
    proof_documents: str = Field(description="可提供的财务证明文件，如：passport, visa, bank statements, proof of funds, parent letter等")
    weekly_rent: int = Field(description="报价（每周澳元）")


class Reference(BaseModel):
    ref_name: str = Field(description="推荐人姓名或机构")
    ref_contact: str = Field(description="推荐人联系方式")
    ref_type: Literal["landlord", "employer", "academic"] = Field(description="推荐人类别")


class FullApplicationInput(BaseModel):
    # 必需：模板核心
    user_name: str
    contact_info: str
    user_type: Literal["worker", "student"]
    language: Literal["zh", "en"]

    property_address: str
    
    lease_term: str = Field(description="租期，如：12 months")
    move_in_date: Optional[str] = Field(default=None, description="期望入住日期（可选）")

    current_address: str = Field(description="当前居住地址（用于说明短租过渡）")

    lifestyle_summary: str = Field(description="生活方式总结：安静、整洁、不吸烟不饮酒、无宠物等")

    financials: Financials

    # 可选：有则加分
    rental_history_2yr: Optional[str] = None
    previous_address: Optional[str] = None
    reference: Optional[Reference] = None

    # 身份相关（可选，但建议按 user_type 做强校验）
    study_details: Optional[str] = None
    employer_name: Optional[str] = None

    # 只在需要时
    co_signer_needed: bool = False
