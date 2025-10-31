# models/property.py - Pydantic schema for property records
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class PropertyModel(BaseModel):
    """Represents validated property data scraped from websites."""

    id: Optional[str] = None
    url: str = Field(..., description="Listing URL")
    title: str = Field(..., min_length=1, description="Listing title")
    address: str = Field(..., description="Full formatted address")
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    parking: Optional[int] = Field(None, ge=0)
    property_type: Optional[str] = None
    price: int = Field(..., gt=0, description="Weekly rent in AUD")
    bond: Optional[int] = Field(None, ge=0)
    available_date: Optional[datetime] = None
    scraped_at: datetime = Field(default_factory=datetime.now)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    description: Optional[str] = None
    features: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: int) -> int:
        if value < 100 or value > 5000:
            raise ValueError(f"Unexpected price range: {value}")
        return value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        if not value.startswith("http"):
            raise ValueError(f"Invalid URL format: {value}")
        return value
