"use client";

import { useEffect, useState } from "react";
import { Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AcademicEducationLevel, CitationStyle, ProjectBrief } from "@/types/editor";

type BriefFormState = {
  institutionName: string;
  courseName: string;
  subjectName: string;
  advisorName: string;
  studentName: string;
  city: string;
  academicYear: string;
  educationLevel: AcademicEducationLevel;
  objective: string;
  methodology: string;
  citationStyle: CitationStyle;
};

interface EditWorkBriefDialogProps {
  brief: ProjectBrief | null | undefined;
  onSave: (payload: {
    institutionName?: string;
    courseName?: string;
    subjectName?: string;
    advisorName?: string;
    studentName?: string;
    city?: string;
    academicYear?: number;
    educationLevel?: AcademicEducationLevel;
    objective?: string;
    methodology?: string;
    citationStyle?: CitationStyle;
  }) => Promise<void>;
}

const DEFAULT_FORM: BriefFormState = {
  institutionName: "",
  courseName: "",
  subjectName: "",
  advisorName: "",
  studentName: "",
  city: "",
  academicYear: new Date().getFullYear().toString(),
  educationLevel: "HIGHER_EDUCATION",
  objective: "",
  methodology: "",
  citationStyle: "ABNT",
};

export function EditWorkBriefDialog({ brief, onSave }: EditWorkBriefDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<BriefFormState>(DEFAULT_FORM);

  useEffect(() => {
    setForm({
      institutionName: brief?.institutionName || "",
      courseName: brief?.courseName || "",
      subjectName: brief?.subjectName || "",
      advisorName: brief?.advisorName || "",
      studentName: brief?.studentName || "",
      city: brief?.city || "",
      academicYear: brief?.academicYear?.toString() || new Date().getFullYear().toString(),
      educationLevel: brief?.educationLevel || "HIGHER_EDUCATION",
      objective: brief?.objective || "",
      methodology: brief?.methodology || "",
      citationStyle: brief?.citationStyle || "ABNT",
    });
  }, [brief, open]);

  const updateField = <K extends keyof BriefFormState>(key: K, value: BriefFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await onSave({
        institutionName: form.institutionName || undefined,
        courseName: form.courseName || undefined,
        subjectName: form.subjectName || undefined,
        advisorName: form.advisorName || undefined,
        studentName: form.studentName || undefined,
        city: form.city || undefined,
        academicYear: Number.parseInt(form.academicYear, 10) || undefined,
        educationLevel: form.educationLevel,
        objective: form.objective || undefined,
        methodology: form.methodology || undefined,
        citationStyle: form.citationStyle,
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl px-4">
          <PencilLine className="mr-2 h-4 w-4" />
          Editar capa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Editar briefing e capa</DialogTitle>
          <DialogDescription>
            Actualiza os dados académicos que influenciam a capa, a estrutura e a coerência do trabalho.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brief-institution">Instituição</Label>
            <Input id="brief-institution" value={form.institutionName} onChange={(event) => updateField("institutionName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-course">Curso</Label>
            <Input id="brief-course" value={form.courseName} onChange={(event) => updateField("courseName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-subject">Disciplina</Label>
            <Input id="brief-subject" value={form.subjectName} onChange={(event) => updateField("subjectName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-year">Ano lectivo</Label>
            <Input id="brief-year" value={form.academicYear} onChange={(event) => updateField("academicYear", event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-advisor">Professor ou orientador</Label>
            <Input id="brief-advisor" value={form.advisorName} onChange={(event) => updateField("advisorName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-student">Nome do estudante</Label>
            <Input id="brief-student" value={form.studentName} onChange={(event) => updateField("studentName", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-city">Cidade</Label>
            <Input id="brief-city" value={form.city} onChange={(event) => updateField("city", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-level">Nível académico</Label>
            <Select value={form.educationLevel} onValueChange={(value) => updateField("educationLevel", value as AcademicEducationLevel)}>
              <SelectTrigger id="brief-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SECONDARY">Secundário</SelectItem>
                <SelectItem value="TECHNICAL">Técnico Profissional</SelectItem>
                <SelectItem value="HIGHER_EDUCATION">Ensino Superior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brief-objective">Objetivo</Label>
            <Textarea id="brief-objective" rows={3} value={form.objective} onChange={(event) => updateField("objective", event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brief-methodology">Metodologia</Label>
            <Textarea id="brief-methodology" rows={3} value={form.methodology} onChange={(event) => updateField("methodology", event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="brief-citation">Norma de citação</Label>
            <Select value={form.citationStyle} onValueChange={(value) => updateField("citationStyle", value as CitationStyle)}>
              <SelectTrigger id="brief-citation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABNT">ABNT</SelectItem>
                <SelectItem value="APA">APA</SelectItem>
                <SelectItem value="Vancouver">Vancouver</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar capa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
