import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CoverLetterData, DEFAULT_COVER_LETTER_DATA } from "@/lib/templates";
import { cn } from "@/lib/utils";

interface CoverLetterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoverLetterData) => void;
}

const FINANCIAL_DOC_OPTIONS = [
  "Pay Slip",
  "Bank Statement",
  "Parent Letter",
  "Scholarship Offer",
];

export function CoverLetterForm({ isOpen, onClose, onSubmit }: CoverLetterFormProps) {
  const [formData, setFormData] = useState<CoverLetterData>(DEFAULT_COVER_LETTER_DATA);

  const selectedDocs = useMemo(
    () =>
      formData.financialDocs
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [formData.financialDocs],
  );

  const handleChange = (field: keyof CoverLetterData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFinancialDoc = (doc: string) => {
    const nextDocs = selectedDocs.includes(doc)
      ? selectedDocs.filter((item) => item !== doc)
      : [...selectedDocs, doc];
    handleChange("financialDocs", nextDocs.join(", "));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const resetDefaults = () => setFormData(DEFAULT_COVER_LETTER_DATA);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>📝 生成 Cover Letter</DialogTitle>
          <DialogDescription>
            按照提示完善个人信息，AI 将基于表单生成一封中/英文租房申请信。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">基本身份 (Identity)</h3>
              <Button type="button" variant="ghost" size="sm" onClick={resetDefaults}>
                填充默认示例
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">申请人姓名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Alex Zhang"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">出生日期</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">联系电话 & 邮箱</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => handleChange("contact", e.target.value)}
                placeholder="+61 400 000 000 / alex@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>身份</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.identity}
                  onChange={(e) =>
                    handleChange("identity", e.target.value as "student" | "worker")
                  }
                >
                  <option value="student">留学生</option>
                  <option value="worker">工作人员</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>是否有配偶/合租人</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.hasRoommate ? "yes" : "no"}
                  onChange={(e) => handleChange("hasRoommate", e.target.value === "yes")}
                >
                  <option value="no">否 (单人)</option>
                  <option value="yes">是</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolOrCompany">
                {formData.identity === "student" ? "学校 & 专业" : "公司名称"}
              </Label>
              <Input
                id="schoolOrCompany"
                value={formData.schoolOrCompany}
                onChange={(e) => handleChange("schoolOrCompany", e.target.value)}
                placeholder={
                  formData.identity === "student"
                    ? "USYD, Master of Commerce"
                    : "Google Australia"
                }
                required
              />
            </div>
          </div>

          {/* 目标与偏好 */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-primary">目标与偏好 (Target & Preferences)</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetAddress">目标房源地址</Label>
                <Input
                  id="targetAddress"
                  value={formData.targetAddress}
                  onChange={(e) => handleChange("targetAddress", e.target.value)}
                  placeholder="Unit 5, 123 George St, Sydney"
                />
              </div>
              <div className="space-y-2">
                <Label>信件语言</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.language}
                  onChange={(e) =>
                    handleChange("language", e.target.value as "English" | "Chinese")
                  }
                >
                  <option value="English">English</option>
                  <option value="Chinese">中文</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="qualities">个人品质</Label>
                <textarea
                  id="qualities"
                  value={formData.qualities}
                  onChange={(e) => handleChange("qualities", e.target.value)}
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Clean, Quiet, Non-smoker, No pets"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="habits">生活习惯</Label>
                <textarea
                  id="habits"
                  value={formData.habits}
                  onChange={(e) => handleChange("habits", e.target.value)}
                  className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Early sleeper, no parties"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="history">过去两年的居住历史</Label>
              <textarea
                id="history"
                value={formData.history}
                onChange={(e) => handleChange("history", e.target.value)}
                className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="2023-2024: Student Village, Camperdown"
              />
            </div>
          </div>

          {/* 财务详情 */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold text-primary">财务详情 (Financials)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incomeSource">主要收入来源</Label>
                <select
                  id="incomeSource"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={formData.incomeSource}
                  onChange={(e) => handleChange("incomeSource", e.target.value)}
                >
                  <option value="Full-time job">全职工作</option>
                  <option value="Parental support">父母资助</option>
                  <option value="Scholarship">奖学金</option>
                  <option value="Other">其他</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyIncome">月收入/资助金额</Label>
                <Input
                  id="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={(e) => handleChange("monthlyIncome", e.target.value)}
                  placeholder="$3,000 / month"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>可提供的财务证明</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FINANCIAL_DOC_OPTIONS.map((doc) => (
                  <label
                    key={doc}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs",
                      selectedDocs.includes(doc) && "border-primary/70 bg-primary/5 text-primary",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={selectedDocs.includes(doc)}
                      onChange={() => toggleFinancialDoc(doc)}
                    />
                    {doc}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>是否需要父母担保</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={formData.needsGuarantor ? "yes" : "no"}
                onChange={(e) => handleChange("needsGuarantor", e.target.value === "yes")}
              >
                <option value="no">否</option>
                <option value="yes">是</option>
              </select>
            </div>
          </div>

          {/* 推荐人 */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold text-primary">历史与推荐 (History & References)</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>推荐人姓名</Label>
                <Input
                  value={formData.referenceName}
                  onChange={(e) => handleChange("referenceName", e.target.value)}
                  placeholder="房东/导师姓名"
                />
              </div>
              <div className="space-y-1">
                <Label>关系/角色</Label>
                <Input
                  value={formData.referenceRole}
                  onChange={(e) => handleChange("referenceRole", e.target.value)}
                  placeholder="Previous landlord"
                />
              </div>
              <div className="space-y-1">
                <Label>联系方式</Label>
                <Input
                  value={formData.referenceContact}
                  onChange={(e) => handleChange("referenceContact", e.target.value)}
                  placeholder="email / phone"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">生成申请信</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
