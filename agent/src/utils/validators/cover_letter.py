"""
Business-level validation for rental cover letter generation.

This module enforces hard constraints BEFORE calling the tool
`generate_rental_cover_letter`.
"""

from typing import Tuple, List
from pydantic import ValidationError

from src.schemas.cover_letter import FullApplicationInput


def validate_cover_letter_args(args: dict) -> Tuple[bool, str]:
    """
    Validate arguments for rental cover letter generation.

    Returns:
        (ok, message)
        - ok = True  -> arguments are valid, tool can be safely called
        - ok = False -> message contains a user-friendly explanation and a copyable template
    """
    try:
        FullApplicationInput(**args)
        return True, ""
    except ValidationError as e:
        missing_fields: List[str] = []

        for err in e.errors():
            # Pydantic missing-field error
            if err.get("type") == "missing":
                loc = ".".join(str(x) for x in err.get("loc", []))
                missing_fields.append(loc)

        missing_fields = sorted(set(missing_fields))

        message = (
            "❗ 当前信息不足或不符合要求，暂时无法生成租房申请信（Cover Letter）。\n\n"
        )

        if missing_fields:
            message += (
                "请补充以下【必填字段】：\n"
                + "\n".join(f"- {f}" for f in missing_fields)
                + "\n\n"
            )
        else:
            message += (
                "请检查字段类型或枚举值是否正确（如 user_type / language）。\n\n"
            )

        message += (
            "你可以直接复制并填写以下模板：\n\n"
            "user_name: \n"
            "dob: \n"
            "contact_info: \n"
            "partner_status: false\n"
            "user_type: student  # 或 worker\n"
            "property_address: \n"
            "language: en  # 或 zh\n"
            "personal_qualities: \n"
            "lifestyle: \n"
            "financials:\n"
            "  income_source: \n"
            "  monthly_amount: \n"
            "  proof_documents: \n"
            "rental_history_2yr: \n"
            "co_signer_needed: false\n"
            "study_details: \n"
            "# reference (optional):\n"
            "#   ref_name: \n"
            "#   ref_contact: \n"
            "#   ref_type: landlord  # employer / academic\n"
        )

        return False, message
