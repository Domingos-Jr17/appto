"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getTemplatesForLevel } from "@/lib/cover-template-config";
import type { WorkBrief } from "@/types/workspace";
import type { AcademicEducationLevel } from "@/types/editor";

interface CoverModalProps {
  open: boolean;
  brief: WorkBrief;
  currentTemplate?: string;
  educationLevel?: AcademicEducationLevel;
  onSelect: (template: string) => void;
  onSaveBrief: (data: Partial<WorkBrief>) => void;
  onClose: () => void;
}

interface CoverInfoState {
  institutionName: string;
  courseName: string;
  studentName: string;
  advisorName: string;
  city: string;
  year: string;
  className?: string;
  turma?: string;
  studentNumber?: string;
  facultyName?: string;
  departmentName?: string;
  semester?: string;
}

function createInfoFromBrief(brief: WorkBrief): CoverInfoState {
  return {
    institutionName: brief.institutionName ?? "",
    courseName: brief.courseName ?? "",
    studentName: brief.studentName ?? "",
    advisorName: brief.advisorName ?? "",
    city: brief.city ?? "",
    year: brief.year ?? new Date().getFullYear().toString(),
    className: brief.className ?? "",
    turma: brief.turma ?? "",
    studentNumber: brief.studentNumber ?? "",
    facultyName: brief.facultyName ?? "",
    departmentName: brief.departmentName ?? "",
    semester: brief.semester ?? "",
  };
}

const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

export function CoverModal({
  open,
  brief,
  currentTemplate,
  educationLevel,
  onSelect,
  onSaveBrief,
  onClose,
}: CoverModalProps) {
  const t = useTranslations("workspace.cover.modal");
  const [selected, setSelected] = useState(
    currentTemplate ?? "UEM_STANDARD"
  );

  const [info, setInfo] = useState<CoverInfoState>(() => createInfoFromBrief(brief));
  const [showDetails, setShowDetails] = useState(false);

  const briefKey = JSON.stringify(brief);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
    } else {
      setInfo(createInfoFromBrief(brief));
      setShowDetails(false);
    }
  };

  const filteredTemplates = getTemplatesForLevel(educationLevel);

  const updateField = <K extends keyof CoverInfoState>(
    field: K,
    value: CoverInfoState[K]
  ) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSelect(selected);

    const updates: Partial<WorkBrief> = {
      institutionName: info.institutionName,
      courseName: info.courseName,
      studentName: info.studentName,
      advisorName: info.advisorName,
      city: info.city,
      year: info.year,
    };

    if (educationLevel === "SECONDARY" || educationLevel === "TECHNICAL") {
      updates.className = info.className;
      updates.turma = info.turma;
      updates.studentNumber = info.studentNumber;
    } else if (educationLevel === "HIGHER_EDUCATION") {
      updates.facultyName = info.facultyName;
      updates.departmentName = info.departmentName;
      updates.semester = info.semester;
    }

    onSaveBrief(updates);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        key={briefKey}
        side="right"
        className="flex w-full max-w-full flex-col overflow-x-hidden p-0 sm:w-[30rem] sm:top-[72px] sm:bottom-0 sm:h-auto sm:border-l sm:rounded-tl-2xl"
        >
        <SheetHeader className="px-4 pt-4 pb-2 sm:pt-6">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>
            {t("description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {/* Template */}
            <div className="space-y-1.5">
              <Label htmlFor="cover-template" className="text-xs">
              {t("templateLabel")}
              </Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="cover-template" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name} — {tpl.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mini preview */}
          <div className="mt-4 rounded-xl border border-border/40 bg-muted/10 p-4">
            <div className="rounded-lg border border-border/30 bg-background px-6 py-8 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {info.institutionName || t("institutionPlaceholder")}
              </p>
              <div className="my-3 h-px w-12 bg-primary/40 mx-auto" />
              <p className="text-xs font-medium text-foreground">
                {info.courseName || t("coursePlaceholder")}
              </p>
              <p className="mt-2 text-xs text-foreground/80">
                {info.studentName || t("studentPlaceholder")}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {info.advisorName ? `${t("advisorLabel")}: ${info.advisorName}` : t("advisorPlaceholder")}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
                <span>{info.city || t("cityPlaceholder")}</span>
                <span>·</span>
                <span>{info.year || t("yearPlaceholder")}</span>
              </div>
            </div>
          </div>

          {/* Essential fields — always visible */}
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cover-institution" className="text-xs">
                {educationLevel === "TECHNICAL" ? t("institutionLabelTechnical") : t("institutionLabel")}
              </Label>
              <Input
                id="cover-institution"
                value={info.institutionName}
                onChange={(e) => updateField("institutionName", e.target.value)}
                placeholder={
                  educationLevel === "SECONDARY"
                    ? t("institutionPlaceholderSecondary")
                    : educationLevel === "TECHNICAL"
                    ? t("institutionPlaceholderTechnical")
                    : t("institutionPlaceholderHigher")
                }
                className="text-xs"
              />
            </div>

            {educationLevel !== "SECONDARY" && (
              <div className="space-y-1.5">
                <Label htmlFor="cover-course" className="text-xs">
                  {t("courseLabel")}
                </Label>
                <Input
                  id="cover-course"
                  value={info.courseName}
                  onChange={(e) => updateField("courseName", e.target.value)}
                  placeholder={t("coursePlaceholder")}
                  className="text-xs"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cover-student" className="text-xs">
                  {educationLevel === "SECONDARY" ? t("studentLabelSecondary") : t("studentLabel")}
                </Label>
                <Input
                  id="cover-student"
                  value={info.studentName}
                  onChange={(e) =>
                    updateField("studentName", e.target.value)
                  }
                  placeholder={t("studentPlaceholder")}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-advisor" className="text-xs">
                  {educationLevel === "SECONDARY"
                    ? t("advisorLabelSecondary")
                    : educationLevel === "TECHNICAL"
                      ? t("advisorLabelTechnical")
                      : t("advisorLabel")}
                </Label>
                <Input
                  id="cover-advisor"
                  value={info.advisorName}
                  onChange={(e) => updateField("advisorName", e.target.value)}
                  placeholder={
                    educationLevel === "SECONDARY"
                      ? t("advisorPlaceholderSecondary")
                      : educationLevel === "TECHNICAL"
                      ? t("advisorPlaceholderTechnical")
                      : t("advisorPlaceholder")
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cover-city" className="text-xs">
                  {t("cityLabel")}
                </Label>
                <Input
                  id="cover-city"
                  value={info.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder={t("cityPlaceholder")}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-year" className="text-xs">
                  {t("yearLabel")}
                </Label>
                <Input
                  id="cover-year"
                  value={info.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  placeholder={new Date().getFullYear().toString()}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Collapsible: Additional details */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            aria-expanded={showDetails}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
          >
            <span>
              {showDetails
                ? t("hideDetails")
                : t("showDetails")}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                showDetails && "rotate-180"
              )}
            />
          </button>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={TRANSITION}
              className="space-y-3 overflow-hidden"
            >
              {educationLevel === "HIGHER_EDUCATION" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-faculty" className="text-xs">
                      {t("facultyLabel")}
                    </Label>
                    <Input
                      id="cover-faculty"
                      value={info.facultyName}
                      onChange={(e) => updateField("facultyName", e.target.value)}
                      placeholder={t("facultyPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-department" className="text-xs">
                      {t("departmentLabel")}
                    </Label>
                    <Input
                      id="cover-department"
                      value={info.departmentName}
                      onChange={(e) => updateField("departmentName", e.target.value)}
                      placeholder={t("departmentPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {educationLevel === "SECONDARY" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-class" className="text-xs">
                      {t("classLabel")}
                    </Label>
                    <Select
                      value={info.className}
                      onValueChange={(v) => updateField("className", v)}
                    >
                      <SelectTrigger id="cover-class" className="text-xs">
                        <SelectValue placeholder={t("classSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10ª">{t("class10")}</SelectItem>
                        <SelectItem value="11ª">{t("class11")}</SelectItem>
                        <SelectItem value="12ª">{t("class12")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-turma" className="text-xs">
                      {t("turmaLabel")}
                    </Label>
                    <Input
                      id="cover-turma"
                      value={info.turma}
                      onChange={(e) => updateField("turma", e.target.value)}
                      placeholder={t("turmaPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-student-number" className="text-xs">
                      {t("studentNumberLabel")}
                    </Label>
                    <Input
                      id="cover-student-number"
                      value={info.studentNumber}
                      onChange={(e) => updateField("studentNumber", e.target.value)}
                      placeholder={t("studentNumberPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {educationLevel === "TECHNICAL" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-class" className="text-xs">
                      {t("classLabel")}
                    </Label>
                    <Select
                      value={info.className}
                      onValueChange={(v) => updateField("className", v)}
                    >
                      <SelectTrigger id="cover-class" className="text-xs">
                        <SelectValue placeholder={t("classSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10ª">{t("class10")}</SelectItem>
                        <SelectItem value="11ª">{t("class11")}</SelectItem>
                        <SelectItem value="12ª">{t("class12")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-turma" className="text-xs">
                      {t("turmaLabel")}
                    </Label>
                    <Input
                      id="cover-turma"
                      value={info.turma}
                      onChange={(e) => updateField("turma", e.target.value)}
                      placeholder={t("turmaPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-student-number" className="text-xs">
                      {t("studentNumberLabel")}
                    </Label>
                    <Input
                      id="cover-student-number"
                      value={info.studentNumber}
                      onChange={(e) => updateField("studentNumber", e.target.value)}
                      placeholder={t("studentNumberPlaceholder")}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {educationLevel === "HIGHER_EDUCATION" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cover-semester" className="text-xs">
                    {t("semesterLabel")}
                  </Label>
                  <Select
                    value={info.semester}
                    onValueChange={(v) => updateField("semester", v)}
                  >
                    <SelectTrigger id="cover-semester" className="text-xs">
                      <SelectValue placeholder={t("classSelect")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">{t("semester1")}</SelectItem>
                      <SelectItem value="II">{t("semester2")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <SheetFooter className="px-4 pb-4">
          <Button
            onClick={handleSave}
            className="w-full rounded-2xl"
          >
            {t("saveButton")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
