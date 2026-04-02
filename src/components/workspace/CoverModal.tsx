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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const [info, setInfo] = useState<CoverInfoState>(() => ({
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
  }));

  // Reset state when modal opens with new brief data
  const lastBriefKey = JSON.stringify({
    institutionName: brief.institutionName,
    courseName: brief.courseName,
    studentName: brief.studentName,
    advisorName: brief.advisorName,
    city: brief.city,
    year: brief.year,
    className: brief.className,
    turma: brief.turma,
    studentNumber: brief.studentNumber,
    facultyName: brief.facultyName,
    departmentName: brief.departmentName,
    semester: brief.semester,
  });

  const [initializedKey, setInitializedKey] = useState(lastBriefKey);

  if (initializedKey !== lastBriefKey) {
    setInfo({
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
    });
    setInitializedKey(lastBriefKey);
  }

  const filteredTemplates = getTemplatesForLevel(educationLevel);

  const handleApplyTemplate = () => {
    onSelect(selected);
    onClose();
  };

  const handleSaveInfo = () => {
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

  const updateField = <K extends keyof CoverInfoState>(
    field: K,
    value: CoverInfoState[K]
  ) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col w-full p-0 sm:w-[28rem] sm:top-[72px] sm:bottom-0 sm:h-auto sm:border-l sm:rounded-tl-2xl"
      >
        <SheetHeader className="px-4 pt-4 pb-2 sm:pt-6">
          <SheetTitle>Editar capa</SheetTitle>
          <SheetDescription>
            Altera o estilo e os dados que aparecem na capa do trabalho.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Tabs defaultValue="estilo" className="py-2">
            <TabsList className="w-full">
              <TabsTrigger value="estilo" className="flex-1 text-xs">
                Estilo
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 text-xs">
                Dados da capa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estilo" className="mt-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                {filteredTemplates.map((tpl) => (
                  <button
                    type="button"
                    key={tpl.id}
                    onClick={() => setSelected(tpl.id)}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition-all",
                      selected === tpl.id
                        ? "border-primary border-2"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className="flex h-16 items-center justify-center bg-muted/50">
                      <div className="flex w-[70%] flex-col items-center gap-1">
                        <div className="h-[3px] w-full rounded bg-foreground/15" />
                        <div className="h-[5px] w-[60%] rounded bg-primary/30" />
                        <div className="h-[3px] w-full rounded bg-foreground/15" />
                      </div>
                    </div>
                    <div className="border-t border-border/60 bg-background px-2 py-1.5">
                      <p className="text-[11px] font-medium text-foreground">
                        {tpl.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="info" className="mt-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cover-institution" className="text-xs">
                    {educationLevel === "SECONDARY" ? "Escola" : "Instituição"}
                  </Label>
                  <Input
                    id="cover-institution"
                    value={info.institutionName}
                    onChange={(e) => updateField("institutionName", e.target.value)}
                    placeholder={
                      educationLevel === "SECONDARY"
                        ? "Ex.: Escola Secundária Josina Machel"
                        : "Ex.: Universidade Eduardo Mondlane"
                    }
                    className="text-xs"
                  />
                </div>

                {educationLevel !== "SECONDARY" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="cover-course" className="text-xs">
                      {educationLevel === "TECHNICAL" ? "Curso" : "Curso"}
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
                  <>
                    <div className="grid grid-cols-2 gap-3">
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
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
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
                      {educationLevel === "SECONDARY" ? "Professor" : "Orientador"}
                    </Label>
                    <Input
                      id="cover-advisor"
                      value={info.advisorName}
                      onChange={(e) => updateField("advisorName", e.target.value)}
                      placeholder={
                        educationLevel === "SECONDARY"
                          ? "Ex.: Prof. Bento"
                          : "Ex.: Prof. Doutor João"
                      }
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                  {(!educationLevel || educationLevel === "SECONDARY") && (
                    <div className={educationLevel === "SECONDARY" ? "col-span-2" : ""}>
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
                  )}
                </div>

                {educationLevel !== "SECONDARY" && (
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
                )}

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
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const activeTab = document.querySelector('[data-state="active"]');
              if (activeTab?.textContent?.trim() === "Estilo") {
                handleApplyTemplate();
              } else {
                handleSaveInfo();
              }
            }}
            className="flex-1 rounded-2xl"
          >
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}