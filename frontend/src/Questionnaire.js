import React, { useMemo, useState } from "react";
import './Questionnaire.css';

function RadioGroup({ name, options, value, onChange }) {
  return (
    <div className="radio-group">
      {options.map((o) => (
        <label key={o.value} className="radio-option">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="radio-custom" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function Questionnaire({ onSubmit }) {
  const TOTAL_STEPS = 6;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    budgetMin: "",
    budgetMax: "",
    billsIncluded: undefined,
    furnished: undefined,
    weeklyTotal: "",
    propertyType: undefined,
    coRent: undefined,
    commute: undefined,
    moveIn: "",
    leaseMonths: undefined,
    acceptOverpriced: undefined,
    acceptSmall: undefined,
  });

  const numberOrEmpty = (v) => (v === "" ? "" : v.replace(/[^0-9.]/g, ""));
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return data.budgetMin !== "" && data.budgetMax !== "";
      case 1: return !!data.propertyType && (data.propertyType === "2 Bedroom" || data.propertyType === "3+ Bedroom" || data.propertyType === "合租房间" || data.propertyType === "不确定" || data.coRent !== undefined);
      case 2: return !!data.commute;
      case 3: return !!data.moveIn && !!data.leaseMonths;
      case 4: return data.acceptOverpriced !== undefined && data.acceptSmall !== undefined;
      default: return true;
    }
  }, [step, data]);

  const leaseOptions = Array.from({ length: 20 }).map((_, i) => ({ value: String(i + 1), label: `${i + 1} 个月` }));

  const submit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    if (onSubmit) onSubmit(data);
  };

  return (
    <div className="questionnaire-container">
      {/* Header */}
      <div className="questionnaire-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>
        <div className="step-indicator">第 {step + 1} 步，共 {TOTAL_STEPS} 步</div>
      </div>

      {/* Body */}
      <div className="questionnaire-body">
        {step === 0 && (
          <div className="question-step">
            <h3>您的预算范围是多少？</h3>
            <div className="budget-range">
              <div className="range-inputs">
                <div className="input-group">
                  <label>最低预算（每周）</label>
                  <div className="currency-input">
                    <span className="currency-symbol">$</span>
                    <input
                      inputMode="decimal"
                      placeholder="300"
                      value={data.budgetMin}
                      onChange={(e) => setData((d) => ({ ...d, budgetMin: numberOrEmpty(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>最高预算（每周）</label>
                  <div className="currency-input">
                    <span className="currency-symbol">$</span>
                    <input
                      inputMode="decimal"
                      placeholder="500"
                      value={data.budgetMax}
                      onChange={(e) => setData((d) => ({ ...d, budgetMax: numberOrEmpty(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="question-group">
              <h4>该预算是否包含 Bills（水电网）？</h4>
              <RadioGroup
                name="bills"
                options={[
                  { value: "true", label: "包含" },
                  { value: "false", label: "不包含" },
                  { value: "unknown", label: "不确定" },
                ]}
                value={String(data.billsIncluded)}
                onChange={(v) => setData((d) => ({ ...d, billsIncluded: v === "true" ? true : v === "false" ? false : "unknown" }))}
              />
            </div>

            <div className="question-group">
              <h4>该预算是否包含家具？</h4>
              <RadioGroup
                name="furnished"
                options={[
                  { value: "true", label: "包含" },
                  { value: "false", label: "不包含" },
                  { value: "unknown", label: "不确定" },
                ]}
                value={String(data.furnished)}
                onChange={(v) => setData((d) => ({ ...d, furnished: v === "true" ? true : v === "false" ? false : "unknown" }))}
              />
            </div>

            <div className="question-group">
              <h4>总开销预期（每周，包括生活费）</h4>
              <div className="currency-input single-input">
                <span className="currency-symbol">$</span>
                <input
                  inputMode="decimal"
                  placeholder="800"
                  value={data.weeklyTotal}
                  onChange={(e) => setData((d) => ({ ...d, weeklyTotal: numberOrEmpty(e.target.value) }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="question-step">
            <h3>您的目标房型是什么？</h3>
            <div className="question-group">
              <h4>房型偏好</h4>
              <RadioGroup
                name="ptype"
                options={[
                  { value: "Studio", label: "Studio" },
                  { value: "1 Bedroom", label: "1 Bedroom" },
                  { value: "2 Bedroom", label: "2 Bedroom" },
                  { value: "3+ Bedroom", label: "3+ Bedroom" },
                  { value: "合租房间", label: "合租房间" },
                  { value: "不确定", label: "不确定" },
                ]}
                value={data.propertyType}
                onChange={(v) => setData((d) => ({ ...d, propertyType: v }))}
              />
            </div>

            {(data.propertyType === "Studio" || data.propertyType === "1 Bedroom") && (
              <div className="question-group">
                <h4>如果是 Studio 或 1 Bedroom，是否考虑合租？</h4>
                <RadioGroup
                  name="corent"
                  options={[
                    { value: "yes", label: "愿意考虑" },
                    { value: "no", label: "不考虑" },
                    { value: "maybe", label: "视情况而定" },
                  ]}
                  value={data.coRent}
                  onChange={(v) => setData((d) => ({ ...d, coRent: v }))}
                />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="question-step">
            <h3>通勤时间要求</h3>
            <div className="question-group">
              <h4>您能够接受的通勤时长上限是？</h4>
              <RadioGroup
                name="commute"
                options={[
                  { value: "15", label: "15分钟以内" },
                  { value: "30", label: "30分钟以内" },
                  { value: "45", label: "45分钟以内" },
                  { value: "60", label: "1小时以内" },
                  { value: ">60", label: "1小时以上" },
                  { value: "none", label: "没有要求" },
                ]}
                value={data.commute}
                onChange={(v) => setData((d) => ({ ...d, commute: v }))}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="question-step">
            <h3>入住时间与租期</h3>
            <div className="question-group">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="input-group">
                  <label>最早可入住日期</label>
                  <input type="date" className="text-input" value={data.moveIn} onChange={(e) => setData((d) => ({ ...d, moveIn: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>期望租期（月）</label>
                  <select className="text-input" value={data.leaseMonths ?? ""} onChange={(e) => setData((d) => ({ ...d, leaseMonths: e.target.value || undefined }))}>
                    <option value="">请选择</option>
                    {leaseOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="question-step">
            <h3>接受度评估</h3>
            <div className="question-group">
              <h4>能否接受高溢价房源？</h4>
              <RadioGroup
                name="overpriced"
                options={[
                  { value: "yes", label: "可以接受" },
                  { value: "no", label: "不能接受" },
                  { value: "depends", label: "视房源质量而定" },
                ]}
                value={data.acceptOverpriced}
                onChange={(v) => setData((d) => ({ ...d, acceptOverpriced: v }))}
              />
            </div>
            <div className="question-group">
              <h4>能否接受房间较小的房源？</h4>
              <RadioGroup
                name="small"
                options={[
                  { value: "yes", label: "可以接受" },
                  { value: "no", label: "不能接受" },
                  { value: "depends", label: "视具体情况而定" },
                ]}
                value={data.acceptSmall}
                onChange={(v) => setData((d) => ({ ...d, acceptSmall: v }))}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="question-step">
            <h3>信息确认</h3>
            <div className="question-group">
              <ul style={{ lineHeight: 1.9, paddingLeft: 16, margin: 0 }}>
                <li>预算范围：${data.budgetMin || "未填写"} - ${data.budgetMax || "未填写"}/周</li>
                <li>是否包含 Bills：{data.billsIncluded === true ? "包含" : data.billsIncluded === false ? "不包含" : "未选择"}</li>
                <li>是否包含家具：{data.furnished === true ? "包含" : data.furnished === false ? "不包含" : "未选择"}</li>
                <li>总开销预期：${data.weeklyTotal || "未填写"}/周</li>
                <li>目标房型：{data.propertyType || "未选择"}</li>
                <li>合租倾向：{data.coRent === "yes" ? "愿意考虑" : data.coRent === "no" ? "不考虑" : data.coRent === "maybe" ? "视情况而定" : "-"}</li>
                <li>通勤时间上限：{
                  data.commute === "15" ? "15分钟以内" :
                  data.commute === "30" ? "30分钟以内" :
                  data.commute === "45" ? "45分钟以内" :
                  data.commute === "60" ? "1小时以内" :
                  data.commute === ">60" ? "1小时以上" :
                  data.commute === "none" ? "没有要求" : "未选择"
                }</li>
                <li>最早入住日期：{data.moveIn || "未填写"}</li>
                <li>期望租期：{data.leaseMonths ? `${data.leaseMonths} 个月` : "未选择"}</li>
                <li>接受高溢价：{data.acceptOverpriced === "yes" ? "可以接受" : data.acceptOverpriced === "no" ? "不能接受" : data.acceptOverpriced === "depends" ? "视房源质量而定" : "未选择"}</li>
                <li>接受小房间：{data.acceptSmall === "yes" ? "可以接受" : data.acceptSmall === "no" ? "不能接受" : data.acceptSmall === "depends" ? "视具体情况而定" : "未选择"}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="questionnaire-footer">
        <button className="btn btn-secondary" onClick={prev} disabled={step === 0}>上一步</button>
        {step < TOTAL_STEPS - 1 ? (
          <button className="btn btn-primary" onClick={next} disabled={!canNext}>下一步</button>
        ) : (
          <button className="btn btn-submit" onClick={submit} disabled={submitting}>{submitting ? "提交中…" : "开始找房"}</button>
        )}
      </div>
    </div>
  );
}
