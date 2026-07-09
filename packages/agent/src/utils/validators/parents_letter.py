"""
Business-level validation for parent letter generation.

This module enforces hard constraints BEFORE calling the tool
`generate_parent_letter`.
"""

from __future__ import annotations

from typing import Tuple, List, Any, Dict, Optional
from pydantic import ValidationError

from src.schemas.parents_letter import ParentLetterInput


# ========= Default fillers (only for OPTIONAL fields) =========
DEFAULTS: Dict[str, Any] = {
    "title": None,
    "salutation": None,
    "parent_location": None,
    "applicant_identity": None,
    "move_in_date": None,
    "statement_notes": None,
    "letter_date": None,
    "signature_name": None,
}

DEFAULT_SUPPORT: Dict[str, Any] = {
    "support_type": "full",
    "rent_support": None,
    "living_support": None,
    "funds_source": "my stable personal income and long-term savings",
    "cover_bond": True,
    "proof_documents": "bank statements, proof of income, and/or asset documentation",
    "prepay_option": False,
}


def _is_blank(v: Any) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "")


def _normalize_int(v: Any) -> Any:
    """Accept int-like strings for weekly_rent."""
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str):
        s = v.strip()
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

    # normalize weekly_rent if exists
    if "weekly_rent" in a:
        a["weekly_rent"] = _normalize_int(a["weekly_rent"])

    # fill optional top-level defaults
    for k, dv in DEFAULTS.items():
        if k not in a or _is_blank(a.get(k)):
            a[k] = dv

    # support must exist as a dict
    sup = a.get("support")
    if sup is None or not isinstance(sup, dict):
        sup = {}
        a["support"] = sup

    # fill optional support sub-fields
    for sk, sdv in DEFAULT_SUPPORT.items():
        if sk not in sup or _is_blank(sup.get(sk)):
            sup[sk] = sdv

    return a


def _business_rules(a: dict) -> List[str]:
    """
    Hard business constraints aligned with the parent letter requirements.
    Return a list of user-facing messages (Chinese).
    """
    errs: List[str] = []

    # required top-level fields
    if _is_blank(a.get("language")):
        errs.append("language 不能为空（zh 或 en）。")

    if _is_blank(a.get("parent_full_name")):
        errs.append("parent_full_name 不能为空（父母/担保人全名）。")
    if _is_blank(a.get("parent_relationship")):
        errs.append("parent_relationship 不能为空（如 father / mother / guardian）。")
    if _is_blank(a.get("parent_contact")):
        errs.append("parent_contact 不能为空（建议邮箱或电话）。")
    if _is_blank(a.get("parent_address")):
        errs.append("parent_address 不能为空（父母居住地址）。")

    if _is_blank(a.get("applicant_full_name")):
        errs.append("applicant_full_name 不能为空（申请者全名）。")
    if _is_blank(a.get("property_address")):
        errs.append("property_address 不能为空。")
    if _is_blank(a.get("lease_term")):
        errs.append("lease_term 不能为空（例如：12 months）。")

    # weekly_rent must be valid and positive
    wr = a.get("weekly_rent")
    if _is_blank(wr):
        errs.append("weekly_rent 不能为空（例如：520）。")
    else:
        try:
            if not isinstance(wr, int):
                raise ValueError
            if wr <= 0:
                errs.append("weekly_rent 必须为正整数。")
        except Exception:
            errs.append("weekly_rent 格式不正确，请填写整数（例如：520）。")

    # enums sanity checks
    lang = a.get("language")
    if lang not in {"zh", "en"}:
        errs.append("language 只能是 zh 或 en。")

    # support rules
    sup = a.get("support")
    if sup is None or not isinstance(sup, dict):
        errs.append("support 必须是对象（包含 support_type 等字段）。")
        return errs

    st = sup.get("support_type")
    if st not in {"full", "partial"}:
        errs.append("support.support_type 只能是 full 或 partial。")

    # recommendation: partial support should include at least one amount
    if st == "partial":
        if _is_blank(sup.get("rent_support")) and _is_blank(sup.get("living_support")):
            errs.append("当 support_type=partial 时，建议至少填写 rent_support 或 living_support（金额），以增强可信度。")

    # tips (non-blocking)
    if _is_blank(sup.get("proof_documents")):
        errs.append("提示：建议填写 support.proof_documents（银行流水/收入证明/资产证明等）。")
    if _is_blank(sup.get("funds_source")):
        errs.append("提示：建议填写 support.funds_source（资金来源，如收入/储蓄/资产）。")

    return errs


def validate_parent_letter_args(args: dict) -> Tuple[bool, str, dict]:
    """
    Validate arguments for parent letter generation.

    Returns:
        (ok, message, filled_args)
        - ok = True  -> arguments are valid, tool can be safely called
        - ok = False -> message contains a user-friendly explanation + copyable template
    """
    filled_args = _fill_defaults(args)

    # 1) business hard constraints first
    rule_errors = _business_rules(filled_args)

    # split hard errors vs tips/recommendations
    hard_errors = [e for e in rule_errors if not e.startswith("提示：") and not e.startswith("当 support_type=partial")]
    tips = [e for e in rule_errors if e.startswith("提示：") or e.startswith("当 support_type=partial")]

    if hard_errors:
        msg = "❗ 当前信息不足或不符合要求，暂时无法生成父母资金支持/担保信（Parent Letter）。\n\n"
        msg += "请修正/补充以下内容：\n" + "\n".join(f"- {e}" for e in hard_errors) + "\n\n"
        msg += "你可以直接复制并填写以下模板（未填的可选项会自动补默认值）：\n\n"
        msg += (
            "language: en  # 或 zh\n"
            "parent_full_name: \n"
            "parent_relationship: father  # 或 mother / guardian\n"
            "parent_contact: \n"
            "parent_address: \n"
            "parent_location:  # 可选\n"
            "\n"
            "applicant_full_name: \n"
            "applicant_identity:  # 可选，如 full-time student at UNSW\n"
            "\n"
            "property_address: \n"
            "weekly_rent: 520\n"
            "lease_term: 12 months\n"
            "move_in_date:  # 可选\n"
            "\n"
            "title:  # 可选\n"
            "salutation:  # 可选\n"
            "statement_notes:  # 可选\n"
            "letter_date:  # 可选，不填自动填今天\n"
            "signature_name:  # 可选\n"
            "\n"
            "support:\n"
            "  support_type: full  # 或 partial\n"
            "  rent_support: AUD 520 per week  # 可选\n"
            "  living_support: AUD 1500 per month  # 可选\n"
            "  funds_source: stable income and savings  # 可选但建议\n"
            "  cover_bond: true\n"
            "  proof_documents: bank statements, proof of income, asset documentation  # 可选但建议\n"
            "  prepay_option: false\n"
        )
        return False, msg, filled_args

    # 2) schema validation (Pydantic)
    try:
        ParentLetterInput(**filled_args)
    except ValidationError as e:
        missing_fields: List[str] = []
        enum_errors: List[str] = []

        for err in e.errors():
            et = err.get("type")
            loc = ".".join(str(x) for x in err.get("loc", []))
            if et == "missing":
                missing_fields.append(loc)
            if et and ("literal" in et or "enum" in et):
                enum_errors.append(loc)

        missing_fields = sorted(set(missing_fields))
        enum_errors = sorted(set(enum_errors))

        msg = "❗ 参数未通过结构校验，暂时无法生成父母资金支持/担保信。\n\n"
        if missing_fields:
            msg += "缺少字段：\n" + "\n".join(f"- {f}" for f in missing_fields) + "\n\n"
        if enum_errors:
            msg += "枚举/取值可能不正确（例如 language / support.support_type）：\n" + "\n".join(
                f"- {f}" for f in enum_errors
            ) + "\n\n"

        msg += "建议按上面的模板检查并补齐后再试。"
        return False, msg, filled_args

    # 3) pass with tips
    if tips:
        tip_msg = "✅ 信息已满足生成要求。\n\n" + "\n".join(f"- {t}" for t in tips)
        return True, tip_msg, filled_args

    return True, "", filled_args
