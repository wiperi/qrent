from typing import Dict, Any

def parse_user_survey(data: Dict[str, Any]) -> str:
    meta = data.get("meta", {})
    survey = data.get("survey", {})

    budget = survey.get("budget", {})
    property_ = survey.get("property", {})
    lifestyle = survey.get("lifestyle", {})

    uni = lifestyle.get("university", "未提供")
    commute = lifestyle.get("commute", "未提供")
    move_in = lifestyle.get("move_in", "未提供")
    lease = lifestyle.get("lease_months", "未提供")

    weekly_min = budget.get("weekly_min", "未提供")
    weekly_max = budget.get("weekly_max", "未提供")
    weekly_total = budget.get("weekly_total", "未提供")
    bills_included = "包含" if budget.get("bills_included") else "不包含"

    room_type = property_.get("type", "未提供")
    furnished = "有家具" if property_.get("furnished") else "无家具"
    co_rent = property_.get("co_rent", "未提供")
    accept_overpriced = property_.get("accept_overpriced", None)
    accept_small = property_.get("accept_small", None)

    flexibility = lifestyle.get("flexibility", [])

    description = f"""
用户租房需求如下（来自前端 JSON 数据）：

🎓 大学信息：
- 就读大学：{uni}

💰 预算设置：
- 最低预算：{weekly_min} AUD/周
- 最高预算：{weekly_max} AUD/周
- 当前预算：{weekly_total} AUD/周
- 是否包含水电网：{bills_included}

🏠 房源偏好：
- 房型：{room_type}
- 家具：{furnished}
- 是否愿意合租：{co_rent}
- 接受高价房？：{accept_overpriced}
- 接受小户型？：{accept_small}

🚶‍♂️ 生活与通勤：
- 可接受通勤时间：{commute} 分钟
- 入住日期：{move_in}
- 租期：{lease} 个月
- 灵活度：{flexibility}

请根据以上信息进行租房合规分析、需求优化建议，以及最终报告撰写。
"""
    return description.strip()