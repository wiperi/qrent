from pydantic import BaseModel, Field
from typing import Literal, Optional


class ParentSupport(BaseModel):
    support_type: Literal["full", "partial"] = Field(
        description="资助类型：full / partial"
    )

    # amounts (free-text to keep flexible, e.g. 'AUD 520 per week')
    rent_support: Optional[str] = Field(
        default=None,
        description="租金支持金额（可选）。如：AUD 520 per week / AUD 2,250 per month"
    )
    living_support: Optional[str] = Field(
        default=None,
        description="生活费支持金额（可选）。如：AUD 1,500 per month"
    )

    funds_source: Optional[str] = Field(
        default=None,
        description="资金来源（可选）。如：stable income, savings, assets"
    )

    cover_bond: bool = Field(
        default=True,
        description="是否明确表示可承担押金（bond）"
    )

    proof_documents: Optional[str] = Field(
        default=None,
        description="可提供的证明文件（可选）。如：bank statements, proof of income, asset documentation"
    )

    prepay_option: bool = Field(
        default=False,
        description="是否表明可预付数月租金以增强可靠性（可选）"
    )


class ParentLetterInput(BaseModel):
    # required
    language: Literal["zh", "en"] = Field(description="输出语言：zh / en")

    parent_full_name: str = Field(description="父母/担保人全名")
    parent_relationship: str = Field(description="与申请人关系，如 father / mother / guardian")
    parent_contact: str = Field(description="联系方式（建议邮箱，可包含电话）")
    parent_address: str = Field(description="居住地址")

    applicant_full_name: str = Field(description="被担保人（申请者）全名")
    property_address: str = Field(description="房源地址")
    lease_term: str = Field(description="租期，如 12 months")

    weekly_rent: int = Field(description="报价（每周澳元）")

    # optional
    title: Optional[str] = Field(
        default=None,
        description='标题（可选）。如 "Letter of Financial Support" / "Parental Guarantee Letter"'
    )
    salutation: Optional[str] = Field(
        default=None,
        description='称呼（可选）。如 "To Whom It May Concern" / "Dear Sir/Madam"'
    )

    parent_location: Optional[str] = Field(default=None, description="所在地（可选，如 Hangzhou, China）")
    applicant_identity: Optional[str] = Field(
        default=None,
        description="申请者身份补充（可选），如 full-time student at UNSW / employed full-time"
    )
    move_in_date: Optional[str] = Field(default=None, description="入住日期（可选）")

    statement_notes: Optional[str] = Field(
        default=None,
        description="附加说明（可选），如可补充提供文件、愿意电话沟通等"
    )

    letter_date: Optional[str] = Field(
        default=None,
        description="落款日期（可选）。不填将自动使用今天日期"
    )
    signature_name: Optional[str] = Field(
        default=None,
        description="签名显示名（可选）。不填默认使用 parent_full_name"
    )

    support: ParentSupport = Field(description="资助/担保信息")
