"""Pydantic schemas for the Parent Letter tool.

These models define and validate the structured inputs used by the
`generate_parent_letter` LangChain tool (and any pre-tool validators).
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class ParentSupport(BaseModel):
    support_type: Literal["full", "partial"] = Field(
        description="Support type: full or partial."
    )
    rent_support: Optional[str] = Field(
        default=None,
        description="Optional rent support statement, e.g., 'AUD 520 per week'.",
    )
    living_support: Optional[str] = Field(
        default=None,
        description="Optional living expenses support statement, e.g., 'AUD 1500 per month'.",
    )
    funds_source: Optional[str] = Field(
        default=None,
        description="Source of funds, e.g., stable income and savings.",
    )
    cover_bond: bool = Field(
        default=True,
        description="Whether the guarantor covers the rental bond (bond).",
    )
    proof_documents: Optional[str] = Field(
        default=None,
        description="Proof documents that can be provided upon request.",
    )
    prepay_option: bool = Field(
        default=False,
        description="Whether the guarantor is willing to prepay several months of rent.",
    )


class ParentLetterInput(BaseModel):
    language: Literal["zh", "en"] = Field(description="Letter language.")

    parent_full_name: str = Field(description="Parent/guardian full legal name.")
    parent_relationship: str = Field(description="Relationship to applicant (e.g. father/mother/guardian).")
    parent_contact: str = Field(description="Parent/guardian contact details (email/phone).")
    parent_address: str = Field(description="Parent/guardian residential address.")
    parent_location: Optional[str] = Field(
        default=None,
        description="Optional location/city/country where the parent/guardian is based.",
    )

    applicant_full_name: str = Field(description="Applicant full legal name.")
    applicant_identity: Optional[str] = Field(
        default=None,
        description="Optional applicant identity (e.g. full-time student at UNSW).",
    )

    property_address: str = Field(description="Target rental property address.")
    weekly_rent: int = Field(description="Weekly rent in AUD.")
    lease_term: str = Field(description="Lease term, e.g., '12 months'.")
    move_in_date: Optional[str] = Field(default=None, description="Preferred move-in date (optional).")

    title: Optional[str] = Field(default=None, description="Optional letter title.")
    salutation: Optional[str] = Field(default=None, description="Optional salutation.")
    statement_notes: Optional[str] = Field(default=None, description="Optional additional notes.")
    letter_date: Optional[str] = Field(default=None, description="Optional letter date.")
    signature_name: Optional[str] = Field(default=None, description="Optional signature name.")

    support: ParentSupport = Field(description="Support details.")
