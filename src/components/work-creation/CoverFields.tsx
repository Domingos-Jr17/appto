"use client";

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
  subjectName,
  onFieldChange,
}: CoverFieldsProps) {
  if (educationLevel === "SECONDARY") {
    return (
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="cover-school">Escola</Label>
          <Input
            id="cover-school"
            value={institutionName}
            onChange={(e) => onFieldChange("institutionName", e.target.value)}
            placeholder="Ex.: Escola Secundária Josina Machel"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-student">Aluno(a)</Label>
            <Input
              id="cover-student"
              value={studentName}
              onChange={(e) => onFieldChange("studentName", e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-advisor">Professor(a)</Label>
            <Input
              id="cover-advisor"
              value={advisorName}
              onChange={(e) => onFieldChange("advisorName", e.target.value)}
              placeholder="Nome do professor"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cover-class">
              Classe <span className="text-[10px] text-muted-foreground">(opcional)</span>
            </Label>
            <Select value={className} onValueChange={(v) => onFieldChange("className", v)}>
              <SelectTrigger id="cover-class">
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
            <Label htmlFor="cover-turma">
              Turma <span className="text-[10px] text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="cover-turma"
              value={turma}
              onChange={(e) => onFieldChange("turma", e.target.value)}
              placeholder="Ex.: A"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-number">
              Nº <span className="text-[10px] text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="cover-number"
              value={studentNumber}
              onChange={(e) => onFieldChange("studentNumber", e.target.value)}
              placeholder="Ex.: 15"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-city">
            Cidade <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="cover-city"
            value={city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder="Ex.: Maputo"
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
            <Label htmlFor="cover-institute">Instituto</Label>
            <Input
              id="cover-institute"
              value={institutionName}
              onChange={(e) => onFieldChange("institutionName", e.target.value)}
              placeholder="Ex.: ISTEG"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-course">Curso</Label>
            <Input
              id="cover-course"
              value={courseName}
              onChange={(e) => onFieldChange("courseName", e.target.value)}
              placeholder="Ex.: Informática"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-student">Estudante</Label>
            <Input
              id="cover-student"
              value={studentName}
              onChange={(e) => onFieldChange("studentName", e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cover-advisor">Formador(a)</Label>
            <Input
              id="cover-advisor"
              value={advisorName}
              onChange={(e) => onFieldChange("advisorName", e.target.value)}
              placeholder="Nome do formador"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cover-city">
              Cidade <span className="text-[10px] text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="cover-city"
              value={city}
              onChange={(e) => onFieldChange("city", e.target.value)}
              placeholder="Ex.: Maputo"
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
          <Label htmlFor="cover-institution">Instituição</Label>
          <Input
            id="cover-institution"
            value={institutionName}
            onChange={(e) => onFieldChange("institutionName", e.target.value)}
            placeholder="Nome da instituição"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-course">Curso</Label>
          <Input
            id="cover-course"
            value={courseName}
            onChange={(e) => onFieldChange("courseName", e.target.value)}
            placeholder="Nome do curso"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-student">Estudante</Label>
          <Input
            id="cover-student"
            value={studentName}
            onChange={(e) => onFieldChange("studentName", e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-advisor">Docente</Label>
          <Input
            id="cover-advisor"
            value={advisorName}
            onChange={(e) => onFieldChange("advisorName", e.target.value)}
            placeholder="Nome do orientador"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-faculty">
            Faculdade <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="cover-faculty"
            value={facultyName}
            onChange={(e) => onFieldChange("facultyName", e.target.value)}
            placeholder="Ex.: Faculdade de Economia"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-department">
            Departamento <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="cover-department"
            value={departmentName}
            onChange={(e) => onFieldChange("departmentName", e.target.value)}
            placeholder="Ex.: Departamento de Gestão"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cover-semester">
            Semestre <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </Label>
          <Select value={semester} onValueChange={(v) => onFieldChange("semester", v)}>
            <SelectTrigger id="cover-semester">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">I Semestre</SelectItem>
              <SelectItem value="II">II Semestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cover-city">
            Cidade <span className="text-[10px] text-muted-foreground">(opcional)</span>
          </Label>
          <Input
            id="cover-city"
            value={city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder="Ex.: Maputo"
          />
        </div>
      </div>
    </div>
  );
}
