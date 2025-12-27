from langchain_core.tools import tool
from pydantic import ValidationError
from datetime import datetime
from src.schemas.cover_letter import FullApplicationInput


@tool("generate_rental_cover_letter", args_schema=FullApplicationInput)
def generate_rental_cover_letter(**kwargs) -> str:
    """
    Generate a professional rental cover letter based on user application details.
    The output strictly follows an Australian rental cover letter style:
    calm, factual, trustworthy, and landlord-friendly.
    """
    try:
        data = FullApplicationInput(**kwargs)
    except ValidationError as e:
        return (
            "Tool Execution Error: Invalid or incomplete input parameters.\n"
            f"Validation details: {e}"
        )

    # ===============================
    # Rental history & references
    # ===============================
    if data.reference:
        history_ref_en = (
            f"Prior to my current accommodation, I lived at {data.previous_address} "
            f"for {data.rental_history_2yr}. My previous {data.reference.ref_type} "
            f"({data.reference.ref_name}, contact: {data.reference.ref_contact}) "
            f"can confirm that I consistently paid rent on time and maintained the property well."
        )
        history_ref_zh = (
            f"在当前住所之前，我曾在 {data.previous_address} 居住 {data.rental_history_2yr}。"
            f"前任{data.reference.ref_type}（{data.reference.ref_name}，联系方式：{data.reference.ref_contact}）"
            f"可以证明我始终按时交租，并妥善维护房屋。"
        )
    else:
        history_ref_en = (
            f"My residential history over the past {data.rental_history_2yr} has been stable. "
            f"Although I do not have a local landlord reference, I am happy to provide "
            f"references from academic supervisors or employers if required."
        )
        history_ref_zh = (
            f"在过去 {data.rental_history_2yr} 内，我的居住情况一直较为稳定。"
            f"虽然目前没有本地房东推荐信，但可根据需要提供学术导师或雇主推荐。"
        )

    # ===============================
    # Identity & financial background
    # ===============================
    if data.user_type == "student":
        identity_en = (
            f"I am currently studying {data.study_details} as a full-time student. "
            f"My living expenses and rent are fully supported by {data.financials.income_source}, "
            f"with a stable monthly amount of {data.financials.monthly_amount}."
        )
        identity_zh = (
            f"我目前是 {data.study_details} 的全职学生。"
            f"我的生活开支及租金由 {data.financials.income_source} 提供稳定支持，"
            f"每月资助金额约为 {data.financials.monthly_amount}。"
        )

        if data.co_signer_needed:
            identity_en += (
                " In addition, I can provide a parent guarantee letter to further "
                "assure rental payment security."
            )
            identity_zh += " 此外，如有需要，我可以提供父母担保函以进一步增强支付保障。"

    else:  # worker
        employer = data.employer_name or "my current employer"
        identity_en = (
            f"I am currently employed full-time at {employer} as a "
            f"{data.financials.income_source}. "
            f"My monthly income is {data.financials.monthly_amount}, "
            f"which allows me to comfortably meet all rental obligations."
        )
        identity_zh = (
            f"我目前在 {employer} 全职工作，担任 {data.financials.income_source} 职位，"
            f"税前月收入约为 {data.financials.monthly_amount}，能够稳定承担租金支出。"
        )

    # ===============================
    # Final letter generation
    # ===============================
    if data.language == "zh":
        letter = f"""
尊敬的房东 / 中介您好，

我叫 {data.user_name}，目前{"就读于 " + data.study_details if data.user_type == "student" else "在职工作"}，正在寻找一个安静、舒适且长期稳定的居住环境，以支持我的学习和日常生活。

我对位于 {data.property_address} 的房源非常感兴趣，并希望以每周 {data.financials.weekly_rent} 澳元的价格签订 {data.lease_term} 的租约。

我目前居住在 {data.current_address}，该住所为短期安排，因此正在积极寻找长期租赁住房。{history_ref_zh}

作为个人租客，我非常重视整洁、有序以及对房屋的爱护。我不吸烟、不饮酒、不养宠物，生活作息安静规律，并始终尊重邻里与社区环境。

在经济方面，{identity_zh}, 如有需要，我可以提供护照、签证、学生证、银行流水及资金证明，以证明我具备按时、稳定支付租金的能力。

我相信该房源非常符合我的居住需求，也非常希望能进一步沟通并预约看房。如您需要任何补充信息，欢迎随时与我联系。

感谢您的时间与考虑，期待您的回复。

此致  
敬礼  

{data.user_name}  
联系方式：{data.contact_info}
"""
    else:
        letter = f"""
Dear Property Manager,

My name is {data.user_name}, and I am currently {"studying " + data.study_details if data.user_type == "student" else "working full-time"}.
I am seeking a quiet, comfortable, and stable living environment to support my daily life and long-term plans.

I am very interested in renting the property at {data.property_address} and would like to offer ${data.financials.weekly_rent} per week for a {data.lease_term} lease.

I am currently residing at {data.current_address}; however, this is a short-term arrangement, and I am actively seeking a long-term lease. {history_ref_en}

As an individual tenant, I place great importance on cleanliness, order, and respect for the property and surrounding environment. I do not smoke, drink alcohol, or keep pets, and I maintain a quiet and considerate lifestyle.

Regarding financial stability, {identity_en} I am happy to provide supporting documents such as passport, visa, student identification, bank statements, and proof of funds if required.

I believe this property would be an excellent match for my needs, and I would welcome the opportunity to arrange a viewing at your convenience. Please feel free to contact me should you need any additional information.

Thank you very much for your time and consideration.

Kind regards,

{data.user_name}  
{data.contact_info}
"""

    return letter.strip()
