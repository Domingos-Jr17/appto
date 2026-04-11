"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcademicEducationLevel } from "@/types/editor";

type CoverFieldKey =
  | "institutionName"
  | "courseName"
  | "studentName"
  | "advisorName"
  | "city"
  | "className"
  | "turma"
  | "studentNumber"
  | "facultyName"
  | "departmentName"
  | "semester"
  | "subjectName";

interface CoverFieldsProps {
  educationLevel: AcademicEducationLevel;
  institutionName?: string;
  courseName?: string;
  studentName?: string;
  advisorName?: string;
  city?: string;
  className?: string;
  turma?: string;
  studentNumber?: string;
  facultyName?: string;
  departmentName?: string;
  semester?: string;
  subjectName?: string;
  onFieldChange: <K extends CoverFieldKey>(field: K, value: string | undefined) => void;
}

export function CoverFields({
  educationLevel,
  institutionName,
  courseName,
  studentName,
  advisorName,
  city,
  className,
  turma,
  studentNumber,
  facultyName,
  departmentName,
  semester,
  subjectName: _subjectName,
  onFieldChange,
}: CoverFieldsProps) {
  const t = useTranslations("workCreation.coverFields");
  if (educationLevel === "SECONDARY") {
    return (
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="cover-school">{t("secondary.school")}</Label>
          <Input
            id="cover-school"
            value={institutionName}
            onChange={(e) => onFieldChange("institutionName", e.target.value)}
            placeholder={t("secondary.schoolPlaceholder")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-student">{t("secondary.student")}</Label>
            <Input
              id="cover-student"
              value={studentName}
              onChange={(e) => onFieldChange("studentName", e.target.value)}
              placeholder={t("secondary.studentPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-advisor">{t("secondary.teacher")}</Label>
            <Input
              id="cover-advisor"
              value={advisorName}
              onChange={(e) => onFieldChange("advisorName", e.target.value)}
              placeholder={t("secondary.teacherPlaceholder")}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cover-class">
              {t("secondary.class")} <span className="text-[10px] text-muted-foreground">{t("secondary.classOptional")}</span>
            </Label>
            <Select value={className} onValueChange={(v) => onFieldChange("className", v)}>
              <SelectTrigger id="cover-class">
                <SelectValue placeholder={t("secondary.classSelect")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10ª">{t("secondary.class10")}</SelectItem>
                <SelectItem value="11ª">{t("secondary.class11")}</SelectItem>
                <SelectItem value="12ª">{t("secondary.class12")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-turma">
              {t("secondary.turma")} <span className="text-[10px] text-muted-foreground">{t("secondary.turmaOptional")}</span>
            </Label>
            <Input
              id="cover-turma"
              value={turma}
              onChange={(e) => onFieldChange("turma", e.target.value)}
              placeholder={t("secondary.turmaPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-number">
              {t("secondary.number")} <span className="text-[10px] text-muted-foreground">{t("secondary.numberOptional")}</span>
            </Label>
            <Input
              id="cover-number"
              value={studentNumber}
              onChange={(e) => onFieldChange("studentNumber", e.target.value)}
              placeholder={t("secondary.numberPlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-city">
            {t("secondary.city")} <span className="text-[10px] text-muted-foreground">{t("secondary.cityOptional")}</span>
          </Label>
          <Input
            id="cover-city"
            value={city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder={t("secondary.cityPlaceholder")}
          />
        </div>
      </div>
    );
  }

  if (educationLevel === "TECHNICAL") {
    return (
      <div className="space-y-2.5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-institute">{t("technical.institute")}</Label>
            <Input
              id="cover-institute"
              value={institutionName}
              onChange={(e) => onFieldChange("institutionName", e.target.value)}
              placeholder={t("technical.institutePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-course">{t("technical.course")}</Label>
            <Input
              id="cover-course"
              value={courseName}
              onChange={(e) => onFieldChange("courseName", e.target.value)}
              placeholder={t("technical.coursePlaceholder")}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-student">{t("technical.student")}</Label>
            <Input
              id="cover-student"
              value={studentName}
              onChange={(e) => onFieldChange("studentName", e.target.value)}
              placeholder={t("technical.studentPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-advisor">{t("technical.trainer")}</Label>
            <Input
              id="cover-advisor"
              value={advisorName}
              onChange={(e) => onFieldChange("advisorName", e.target.value)}
              placeholder={t("technical.trainerPlaceholder")}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-city">
              {t("technical.city")} <span className="text-[10px] text-muted-foreground">{t("technical.cityOptional")}</span>
            </Label>
            <Input
              id="cover-city"
              value={city}
              onChange={(e) => onFieldChange("city", e.target.value)}
              placeholder={t("technical.cityPlaceholder")}
            />
          </div>
        </div>
      </div>
    );
  }

  // HIGHER_EDUCATION
  return (
    <div className="space-y-2.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-institution">{t("higher.institution")}</Label>
          <Input
            id="cover-institution"
            value={institutionName}
            onChange={(e) => onFieldChange("institutionName", e.target.value)}
            placeholder={t("higher.institutionPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-course">{t("higher.course")}</Label>
          <Input
            id="cover-course"
            value={courseName}
            onChange={(e) => onFieldChange("courseName", e.target.value)}
            placeholder={t("higher.coursePlaceholder")}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-student">{t("higher.student")}</Label>
          <Input
            id="cover-student"
            value={studentName}
            onChange={(e) => onFieldChange("studentName", e.target.value)}
            placeholder={t("higher.studentPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-advisor">{t("higher.advisor")}</Label>
          <Input
            id="cover-advisor"
            value={advisorName}
            onChange={(e) => onFieldChange("advisorName", e.target.value)}
            placeholder={t("higher.advisorPlaceholder")}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-faculty">
            {t("higher.faculty")} <span className="text-[10px] text-muted-foreground">{t("higher.facultyOptional")}</span>
          </Label>
          <Input
            id="cover-faculty"
            value={facultyName}
            onChange={(e) => onFieldChange("facultyName", e.target.value)}
            placeholder={t("higher.facultyPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-department">
            {t("higher.department")} <span className="text-[10px] text-muted-foreground">{t("higher.departmentOptional")}</span>
          </Label>
          <Input
            id="cover-department"
            value={departmentName}
            onChange={(e) => onFieldChange("departmentName", e.target.value)}
            placeholder={t("higher.departmentPlaceholder")}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-semester">
            {t("higher.semester")} <span className="text-[10px] text-muted-foreground">{t("higher.semesterOptional")}</span>
          </Label>
          <Select value={semester} onValueChange={(v) => onFieldChange("semester", v)}>
            <SelectTrigger id="cover-semester">
              <SelectValue placeholder={t("higher.semesterSelect")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">{t("higher.semester1")}</SelectItem>
              <SelectItem value="II">{t("higher.semester2")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-city">
            {t("higher.city")} <span className="text-[10px] text-muted-foreground">{t("higher.cityOptional")}</span>
          </Label>
          <Input
            id="cover-city"
            value={city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder={t("higher.cityPlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}
