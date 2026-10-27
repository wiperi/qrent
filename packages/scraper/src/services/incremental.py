"""Conservative, unit-aware reuse across source listings."""
import re
from datetime import datetime, timedelta


def address_key(prop, include_postcode=True):
    address = prop.address_line1.lower().strip()
    suburb = prop.suburb.lower().strip()
    postcode = str(prop.postcode).strip()
    state = prop.state.upper().strip()
    if not address or not suburb or not state or (include_postcode and not re.fullmatch(r"\d{4}", postcode)):
        return None
    for word, short in {"street": "st", "road": "rd", "avenue": "ave", "parade": "pde"}.items():
        address = re.sub(r"\b" + word + r"\b", short, address)
    address = re.sub(r"[.,]", "", address)
    address = re.sub(r"\s+", " ", address).strip()
    return (address, suburb, state, postcode) if include_postcode else (address, suburb, state)


def complete_postcodes(properties, references):
    known = {}
    for ref in references:
        key = address_key(ref, include_postcode=False)
        if key and re.fullmatch(r"\d{4}", str(ref.postcode)):
            known.setdefault(key, set()).add(str(ref.postcode))
    completed = 0
    for target in properties:
        options = known.get(address_key(target, include_postcode=False), set())
        if not target.postcode and len(options) == 1:
            target.postcode = next(iter(options))
            target.address_line2 = f"{target.suburb.lower().replace(' ', '-')}-{target.state.lower()}-{target.postcode}"
            completed += 1
    return completed


def reuse_details(properties, references, max_age_days=7, allow_same_source=False):
    candidates = {}
    now = datetime.now()
    for ref in references:
        key = address_key(ref)
        if (key and ref.description_en and ref.thumbnail_url and ref.available_date
                and timedelta(0) <= now - ref.scraped_at <= timedelta(days=max_age_days)):
            candidates.setdefault(key, []).append(ref)
    reused = 0
    for target in properties:
        if target.description_en:
            continue
        for ref in candidates.get(address_key(target), []):
            same_source = ref.source == target.source
            if ((same_source and (not allow_same_source or ref.house_id != target.house_id))
                    or ref.price_per_week != target.price_per_week
                    or ref.bedroom_count != target.bedroom_count):
                continue
            for name in ("description_en", "description_cn", "keywords", "average_score",
                         "thumbnail_url", "available_date"):
                if not getattr(target, name):
                    setattr(target, name, getattr(ref, name))
            if not target.scores:
                target.scores = list(ref.scores)
            target.commute_times.update({k: v for k, v in ref.commute_times.items()
                                         if k not in target.commute_times})
            reused += 1
            break
    return reused
