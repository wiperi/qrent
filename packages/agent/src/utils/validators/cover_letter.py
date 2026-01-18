"""
Business-level validation for rental cover letter generation.

This module enforces hard constraints BEFORE calling the tool
`generate_rental_cover_letter`.
"""

from __future__ import annotations

from typing import Tuple, List, Any, Dict, Optional
from pydantic import ValidationError

from src.schemas.cover_letter import FullApplicationInput


# ========= Default fillers (only for OPTIONAL fields) =========
DEFAULTS: Dict[str, Any] = {
    # Optional fields: OK to default
    "rental_history_2yr": "N/A",
    "previous_address": None,
    "reference": None,
    "co_signer_needed": False,
    "move_in_date": None,
    "study_details": None,
    "employer_name": None,
}

DEFAULT_FINANCIALS: Dict[str, Any] = {
    # Financials are required as an object, but sub-fields can be defaulted
    "income_source": "N/A",
    "monthly_amount": None,  # recommend optional
    "proof_documents": "passport, visa, student ID, bank statements, proof of funds",
}

DEFAULT_LIFESTYLE_SUMMARY_EN = (
    "I am a quiet, clean, and respectful tenant. "
    "I do not smoke, drink alcohol, keep pets, or host parties."
)
DEFAULT_LIFESTYLE_SUMMARY_ZH = (
    "我生活作息安静规律，注重整洁，尊重邻里。"
    "不吸烟、不饮酒、不养宠物、不办聚会。"
)


def _is_blank(v: Any) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "")


def _normalize_bool(v: Any, default: Optional[bool] = None) -> Any:
    """Accept common bool-like strings."""
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        s = v.strip().lower()
        if s in {"true", "1", "yes", "y", "是"}:
            return True
        if s in {"false", "0", "no", "n", "否"}:
            return False
    return default if default is not None else v


def _normalize_int(v: Any) -> Any:
    """Accept int-like strings for weekly_rent."""
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str):
        s = v.strip()
        # remove common symbols like "$" or "AUD"
        s = s.replace("$", "").replace("aud", "").replace("AUD", "").strip()
        if s.isdigit():
            return int(s)
    return v


def _fill_defaults(args: dict) -> dict:
    """
    Fill missing/blank OPTIONAL fields with defaults.
    This mutates a shallow copy and returns it.
    """
    a = dict(args or {})

    # normalize bool-like fields
    if "co_signer_needed" in a:
        a["co_signer_needed"] = _normalize_bool(a["co_signer_needed"], default=False)

    # normalize weekly_rent if exists
    if "weekly_rent" in a:
        a["weekly_rent"] = _normalize_int(a["weekly_rent"])

    # fill optional top-level defaults
    for k, dv in DEFAULTS.items():
        if k not in a or _is_blank(a.get(k)):
            a[k] = dv

    # financials must exist as a dict
    fin = a.get("financials")
    if fin is None or not isinstance(fin, dict):
        fin = {}
        a["financials"] = fin

    # fill optional financial sub-fields
    for fk, fdv in DEFAULT_FINANCIALS.items():
        if fk not in fin or _is_blank(fin.get(fk)):
            fin[fk] = fdv

    # lifestyle_summary default (depends on language)
    if _is_blank(a.get("lifestyle_summary")):
        lang = (a.get("language") or "").strip().lower()
        a["lifestyle_summary"] = (
            DEFAULT_LIFESTYLE_SUMMARY_ZH if lang == "zh" else DEFAULT_LIFESTYLE_SUMMARY_EN
        )

    return a


def _business_rules(a: dict) -> List[str]:
    """
    Hard business constraints aligned with the 'golden template'.
    Return a list of user-facing error messages (Chinese).
    """
    errs: List[str] = []

    # Required by template
    if _is_blank(a.get("user_name")):
        errs.append("user_name 不能为空。")
    if _is_blank(a.get("contact_info")):
        errs.append("contact_info 不能为空（建议包含手机号或邮箱）。")
    if _is_blank(a.get("property_address")):
        errs.append("property_address 不能为空。")
    if _is_blank(a.get("current_address")):
        errs.append("current_address 不能为空（模板第二段需要当前住址）。")
    if _is_blank(a.get("lease_term")):
        errs.append("lease_term 不能为空（例如：12 months）。")

    # weekly_rent must be valid and positive
    wr = a.get("weekly_rent")
    if _is_blank(wr):
        errs.append("weekly_rent 不能为空（例如：750）。")
    else:
        try:
            if not isinstance(wr, int):
                raise ValueError
            if wr <= 0:
                errs.append("weekly_rent 必须为正整数。")
        except Exception:
            errs.append("weekly_rent 格式不正确，请填写整数（例如：750）。")

    # enum sanity checks (extra)
    ut = a.get("user_type")
    if ut not in {"student", "worker"}:
        errs.append("user_type 只能是 student 或 worker。")

    lang = a.get("language")
    if lang not in {"zh", "en"}:
        errs.append("language 只能是 zh 或 en。")

    # student must have study_details (business-level)
    if ut == "student" and _is_blank(a.get("study_details")):
        errs.append("当 user_type=student 时，study_details 必填（例如：UNSW Bachelor of ...）。")

    # worker: employer_name strongly recommended (not hard fail)
    if ut == "worker" and _is_blank(a.get("employer_name")):
        # 不作为 hard fail，但提示
        errs.append("提示：当 user_type=worker 时，建议填写 employer_name（公司名称），提高可信度。")

    # reference completeness if provided
    ref = a.get("reference")
    if ref is not None:
        if not isinstance(ref, dict):
            errs.append("reference 必须是对象（包含 ref_name/ref_contact/ref_type）。")
        else:
            if _is_blank(ref.get("ref_name")):
                errs.append("reference.ref_name 不能为空。")
            if _is_blank(ref.get("ref_contact")):
                errs.append("reference.ref_contact 不能为空。")
            if ref.get("ref_type") not in {"landlord", "employer", "academic"}:
                errs.append("reference.ref_type 只能是 landlord / employer / academic。")

    return errs


def validate_cover_letter_args(args: dict) -> Tuple[bool, str, dict]:
    """
    Validate arguments for rental cover letter generation.

    Returns:
        (ok, message, filled_args)
        - ok = True  -> arguments are valid, tool can be safely called
        - ok = False -> message contains a user-friendly explanation + copyable template
    """
    filled_args = _fill_defaults(args)

    # 1) business hard constraints first (template-aligned)
    rule_errors = _business_rules(filled_args)

    # 如果只有 “提示类” 信息，也允许通过（这里把提示和硬错误分开）
    hard_errors = [e for e in rule_errors if not e.startswith("提示：")]
    tips = [e for e in rule_errors if e.startswith("提示：")]

    if hard_errors:
        msg = "❗ 当前信息不足或不符合要求，暂时无法生成租房申请信（Cover Letter）。\n\n"
        msg += "请修正/补充以下内容：\n" + "\n".join(f"- {e}" for e in hard_errors) + "\n\n"
        msg += "你可以直接复制并填写以下模板（未填的可选项会自动补默认值）：\n\n"
        msg += (
            "user_name: \n"
            "contact_info: \n"
            "user_type: student  # 或 worker\n"
            "language: en  # 或 zh\n"
            "property_address: \n"
            "current_address: \n"
            "weekly_rent: 750\n"
            "lease_term: 12 months\n"
            "move_in_date:  # 可选\n"
            "lifestyle_summary:  # 可选，不填会自动补：不吸烟/不饮酒/无宠物/不办party/安静\n"
            "financials:\n"
            "  income_source: family support / full-time job / scholarship\n"
            "  monthly_amount:  # 可选\n"
            "  proof_documents: passport, visa, bank statements, proof of funds\n"
            "rental_history_2yr:  # 可选\n"
            "previous_address:  # 可选\n"
            "co_signer_needed: false\n"
            "study_details:  # student 必填，例如：UNSW Bachelor of ...\n"
            "employer_name:  # worker 建议填\n"
            "# reference (optional):\n"
            "#   ref_name: \n"
            "#   ref_contact: \n"
            "#   ref_type: landlord  # employer / academic\n"
        )
        return False, msg, filled_args

    # 2) schema validation (Pydantic)
    try:
        FullApplicationInput(**filled_args)
    except ValidationError as e:
        missing_fields: List[str] = []
        enum_errors: List[str] = []

        for err in e.errors():
            et = err.get("type")
            loc = ".".join(str(x) for x in err.get("loc", []))
            if et == "missing":
                missing_fields.append(loc)
            # pydantic v2 enum error type can vary; keep generic
            if et and ("literal" in et or "enum" in et):
                enum_errors.append(loc)

        missing_fields = sorted(set(missing_fields))
        enum_errors = sorted(set(enum_errors))

        msg = "❗ 参数未通过结构校验，暂时无法生成租房申请信。\n\n"
        if missing_fields:
            msg += "缺少字段：\n" + "\n".join(f"- {f}" for f in missing_fields) + "\n\n"
        if enum_errors:
            msg += "枚举/取值可能不正确（例如 user_type/language）：\n" + "\n".join(
                f"- {f}" for f in enum_errors
            ) + "\n\n"

        msg += "建议按上面的模板检查并补齐后再试。"
        return False, msg, filled_args

    # 3) pass with optional tips
    if tips:
        tip_msg = "✅ 信息已满足生成要求。\n\n" + "\n".join(f"- {t}" for t in tips)
        return True, tip_msg, filled_args

    return True, "", filled_args
