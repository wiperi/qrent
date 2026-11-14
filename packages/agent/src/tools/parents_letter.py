from __future__ import annotations

from datetime import datetime
from langchain_core.tools import tool
from pydantic import ValidationError

from src.schemas.parents_letter import ParentLetterInput


@tool("generate_parent_letter", args_schema=ParentLetterInput)
def generate_parent_letter(**kwargs) -> str:
    """
    Generate a parent financial support / parental guarantee letter
    for Australian rental applications.

    Style: calm, factual, trustworthy, landlord-friendly.
    """
    try:
        data = ParentLetterInput(**kwargs)
    except ValidationError as e:
        return (
            "Tool Execution Error: Invalid or incomplete input parameters.\n"
            f"Validation details: {e}"
        )

    # date
    today = datetime.now().strftime("%d / %m / %Y")
    date_str = (data.letter_date or today).strip()
    sign_name = (data.signature_name or data.parent_full_name).strip()

    # title & salutation defaults
    title_en_default = "Letter of Financial Support and Parental Guarantee"
    title_zh_default = "父母资金支持与担保说明信（Parent Support Letter）"

    salutation_en_default = "To Whom It May Concern,"
    salutation_zh_default = "致相关负责人："

    title = (data.title or (title_zh_default if data.language == "zh" else title_en_default)).strip()
    salutation = (data.salutation or (salutation_zh_default if data.language == "zh" else salutation_en_default)).strip()

    # support lines
    rent_line_en = f"Rent: {data.support.rent_support}" if data.support.rent_support else f"Rent: AUD {data.weekly_rent} per week"
    living_line_en = f"Living expenses: {data.support.living_support}" if data.support.living_support else "Living expenses: AUD [amount] per month"

    rent_line_zh = f"房租：{data.support.rent_support}" if data.support.rent_support else f"房租：每周 AUD {data.weekly_rent}"
    living_line_zh = f"生活费：{data.support.living_support}" if data.support.living_support else "生活费：每月 AUD [金额]"

    # bond / prepay
    if data.language == "en":
        bond_en = "including the rental bond (bond)" if data.support.cover_bond else "excluding the rental bond (bond)"
        prepay_en = (
            " If required, I am also willing to prepay rent for several months to further demonstrate my commitment."
            if data.support.prepay_option
            else ""
        )
        support_scope_en = "full financial support" if data.support.support_type == "full" else "partial financial support"

        applicant_id = f" ({data.applicant_identity})" if data.applicant_identity else ""
        parent_loc = f" I am currently based in {data.parent_location}." if data.parent_location else ""
        move_in = f" with a preferred move-in date of {data.move_in_date}" if data.move_in_date else ""

        funds_source = (data.support.funds_source or "my stable personal income and long-term savings").strip()
        proof_docs = (data.support.proof_documents or "bank statements, proof of income, and/or asset documentation").strip()
        notes = f"\n\nAdditional note: {data.statement_notes.strip()}" if data.statement_notes else ""

        letter = f"""
{title}

{salutation}

My name is {data.parent_full_name}, and I am the {data.parent_relationship} of {data.applicant_full_name}{applicant_id}.{parent_loc}
I am writing to formally confirm my {support_scope_en} and parental guarantee in support of {data.applicant_full_name}'s rental application for the property located at {data.property_address}.

I understand that renting a residential property in Australia involves financial and contractual responsibilities. I confirm that I am willing and able to support my child throughout the entire lease period ({data.lease_term}){move_in}, and to ensure all obligations under the lease agreement are met in a timely manner, {bond_en}.

I hereby confirm that I will cover the following expenses during the tenancy period:
- {rent_line_en}
- {living_line_en}

The funds used to support my child come from {funds_source}. I have sufficient financial resources to meet these obligations and can provide supporting documents such as {proof_docs} upon request.

Should {data.applicant_full_name} be unable to meet any financial or contractual obligations under the lease agreement, I am willing to assume financial responsibility and settle any outstanding payments promptly.{prepay_en}{notes}

Yours sincerely,

{sign_name}
Parent / Guarantor of {data.applicant_full_name}
Contact: {data.parent_contact}
Address: {data.parent_address}
Date: {date_str}
""".strip()

        return letter

    # Chinese
    bond_zh = "包括租赁押金（bond）在内" if data.support.cover_bond else "不含租赁押金（bond）"
    prepay_zh = "如有需要，本人亦愿意预付数月租金，以进一步体现我的支持意愿与经济稳定性。" if data.support.prepay_option else ""
    support_scope_zh = "全额" if data.support.support_type == "full" else "部分"

    applicant_id_zh = f"（{data.applicant_identity}）" if data.applicant_identity else ""
    parent_loc_zh = f"我目前居住在 {data.parent_location}。" if data.parent_location else ""
    move_in_zh = f"，预计入住日期为 {data.move_in_date}" if data.move_in_date else ""

    funds_source_zh = (data.support.funds_source or "本人稳定收入及长期储蓄/资产").strip()
    proof_docs_zh = (data.support.proof_documents or "银行流水、收入证明及/或资产证明等").strip()
    notes_zh = f"\n\n补充说明：{data.statement_notes.strip()}" if data.statement_notes else ""

    letter_zh = f"""
{title}

{salutation}

本人 {data.parent_full_name}，系 {data.applicant_full_name}{applicant_id_zh} 的{data.parent_relationship}。{parent_loc_zh}
现就 {data.applicant_full_name} 申请租赁位于 {data.property_address} 的房源事宜，特此出具本《资金支持与担保说明信》，以确认本人将为其提供{support_scope_zh}经济支持并承担相应担保责任。

本人充分理解在澳大利亚租赁房屋所涉及的经济与合同责任。本人确认在整个租期（{data.lease_term}）内{move_in_zh}，将为 {data.applicant_full_name} 提供稳定资金支持，确保其能够按时履行租赁合同义务，{bond_zh}。

本人确认将承担以下费用（包括但不限于）：
- {rent_line_zh}
- {living_line_zh}

上述资金来源于{funds_source_zh}。如有需要，本人可提供{proof_docs_zh}等材料作为佐证。

如在租赁期间 {data.applicant_full_name} 因任何原因无法履行其租赁合同中的经济或合同义务，本人愿意承担相应经济责任并及时结清相关费用。{prepay_zh}{notes_zh}

此致
敬礼

{sign_name}
（{data.applicant_full_name} 的家长/担保人）
联系方式：{data.parent_contact}
地址：{data.parent_address}
日期：{date_str}
""".strip()

    return letter_zh
