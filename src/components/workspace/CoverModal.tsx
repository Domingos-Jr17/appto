"use client";

import { useState } from "react";
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
    year: brief.year ?? "",
    className: brief.className ?? "",
    turma: brief.turma ?? "",
    studentNumber: brief.studentNumber ?? "",
    facultyName: brief.facultyName ?? "",
    departmentName: brief.departmentName ?? "",
    semester: brief.semester ?? "",
  };
}

export function CoverModal({
  open,
  brief,
  currentTemplate,
  educationLevel,
  onSelect,
  onSaveBrief,
  onClose,
}: CoverModalProps) {
  const [selected, setSelected] = useState(
    currentTemplate ?? "UEM_STANDARD"
  );

  const [info, setInfo] = useState<CoverInfoState>(() => createInfoFromBrief(brief));

  const briefKey = JSON.stringify(brief);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
    } else {
      setInfo(createInfoFromBrief(brief));
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

    if (educationLevel === "SECONDARY") {
      updates.className = info.className;
      updates.turma = info.turma;
      updates.studentNumber = info.studentNumber;
    } else if (educationLevel === "HIGHER_EDUCATION") {
      updates.facultyName = info.facultyName;
      updates.departmentName = info.departmentName;
      updates.studentNumber = info.studentNumber;
      updates.semester = info.semester;
    } else if (educationLevel === "TECHNICAL") {
      updates.studentNumber = info.studentNumber;
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
          <SheetTitle>Editar capa</SheetTitle>
          <SheetDescription>
            Altera o estilo e os dados que aparecem na capa do trabalho.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-template" className="text-xs">
              Estilo da capa
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
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <div className="rounded-lg border border-border/30 bg-background px-6 py-8 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {info.institutionName || "Nome da instituição"}
              </p>
              <div className="my-3 h-px w-12 bg-primary/40 mx-auto" />
              <p className="text-xs font-medium text-foreground">
                {info.courseName || "Curso"}
              </p>
              <p className="mt-2 text-xs text-foreground/80">
                {info.studentName || "Nome do estudante"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {info.advisorName ? `Orientador: ${info.advisorName}` : "Orientador"}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-muted-foreground/60">
                <span>{info.city || "Cidade"}</span>
                <span>·</span>
                <span>{info.year || "Ano"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cover-institution" className="text-xs">
                {educationLevel === "TECHNICAL" ? "Instituto" : "Instituição"}
              </Label>
              <Input
                id="cover-institution"
                value={info.institutionName}
                onChange={(e) => updateField("institutionName", e.target.value)}
                placeholder={
                  educationLevel === "SECONDARY"
                    ? "Ex.: Escola Secundária Josina Machel"
                    : educationLevel === "TECHNICAL"
                    ? "Ex.: ISTEG"
                    : "Ex.: Universidade Eduardo Mondlane"
                }
                className="text-xs"
              />
            </div>

            {educationLevel !== "SECONDARY" && (
              <div className="space-y-1.5">
                <Label htmlFor="cover-course" className="text-xs">
                  Curso
                </Label>
                <Input
                  id="cover-course"
                  value={info.courseName}
                  onChange={(e) => updateField("courseName", e.target.value)}
                  placeholder="Ex.: Gestão Bancária"
                  className="text-xs"
                />
              </div>
            )}

            {educationLevel === "HIGHER_EDUCATION" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cover-faculty" className="text-xs">
                    Faculdade
                  </Label>
                  <Input
                    id="cover-faculty"
                    value={info.facultyName}
                    onChange={(e) => updateField("facultyName", e.target.value)}
                    placeholder="Ex.: Facultad de Economia"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cover-department" className="text-xs">
                    Departamento
                  </Label>
                  <Input
                    id="cover-department"
                    value={info.departmentName}
                    onChange={(e) => updateField("departmentName", e.target.value)}
                    placeholder="Ex.: Departamento de Gestão"
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cover-student" className="text-xs">
                  {educationLevel === "SECONDARY" ? "Aluno" : "Estudante"}
                </Label>
                <Input
                  id="cover-student"
                  value={info.studentName}
                  onChange={(e) =>
                    updateField("studentName", e.target.value)
                  }
                  placeholder="Ex.: Maria João"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cover-advisor" className="text-xs">
                  {educationLevel === "SECONDARY" ? "Professor" : educationLevel === "TECHNICAL" ? "Formador" : "Docente"}
                </Label>
                <Input
                  id="cover-advisor"
                  value={info.advisorName}
                  onChange={(e) => updateField("advisorName", e.target.value)}
                  placeholder={
                    educationLevel === "SECONDARY"
                      ? "Ex.: Prof. Bento"
                      : educationLevel === "TECHNICAL"
                      ? "Ex.: Form. João"
                      : "Ex.: Prof. Doutor João"
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {educationLevel === "SECONDARY" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-class" className="text-xs">
                      Classe
                    </Label>
                    <Select
                      value={info.className}
                      onValueChange={(v) => updateField("className", v)}
                    >
                      <SelectTrigger id="cover-class" className="text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10ª">10ª Classe</SelectItem>
                        <SelectItem value="11ª">11ª Classe</SelectItem>
                        <SelectItem value="12ª">12ª Classe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-turma" className="text-xs">
                      Turma
                    </Label>
                    <Input
                      id="cover-turma"
                      value={info.turma}
                      onChange={(e) => updateField("turma", e.target.value)}
                      placeholder="Ex.: A"
                      className="text-xs"
                    />
                  </div>
                </>
              )}

              {educationLevel === "TECHNICAL" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cover-student-number" className="text-xs">
                    Nº de Estudante
                  </Label>
                  <Input
                    id="cover-student-number"
                    value={info.studentNumber}
                    onChange={(e) => updateField("studentNumber", e.target.value)}
                    placeholder="Ex.: 2024/001"
                    className="text-xs"
                  />
                </div>
              )}

              {educationLevel === "HIGHER_EDUCATION" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-student-number" className="text-xs">
                      Nº de Estudante
                    </Label>
                    <Input
                      id="cover-student-number"
                      value={info.studentNumber}
                      onChange={(e) => updateField("studentNumber", e.target.value)}
                      placeholder="Ex.: 2024/001"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-semester" className="text-xs">
                      Semestre
                    </Label>
                    <Select
                      value={info.semester}
                      onValueChange={(v) => updateField("semester", v)}
                    >
                      <SelectTrigger id="cover-semester" className="text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="I">I Semestre</SelectItem>
                        <SelectItem value="II">II Semestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover-city" className="text-xs">
                Cidade
              </Label>
              <Input
                id="cover-city"
                value={info.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="Ex.: Maputo"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover-year" className="text-xs">
                Ano
              </Label>
              <Input
                id="cover-year"
                value={info.year}
                onChange={(e) => updateField("year", e.target.value)}
                placeholder="Ex.: 2026"
                className="text-xs"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="px-4 pb-4">
          <Button
            onClick={handleSave}
            className="w-full rounded-2xl"
          >
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
