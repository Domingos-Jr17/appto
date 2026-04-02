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
import type { WorkFormState } from "@/hooks/use-work-creation";

interface EducationFieldsProps {
  educationLevel: AcademicEducationLevel;
  form: WorkFormState;
  onUpdate: <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => void;
}

export function EducationFields({ educationLevel, form, onUpdate }: EducationFieldsProps) {
  if (educationLevel === "SECONDARY") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="institution">Escola</Label>
            <Input
              id="institution"
              value={form.institutionName}
              onChange={(e) => onUpdate("institutionName", e.target.value)}
              placeholder="Ex.: Escola Secundária Josina Machel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Disciplina</Label>
            <Input
              id="subject"
              value={form.subjectName}
              onChange={(e) => onUpdate("subjectName", e.target.value)}
              placeholder="Ex.: História"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="className">Classe</Label>
            <Select
              value={form.className}
              onValueChange={(v) => onUpdate("className", v)}
            >
              <SelectTrigger id="className">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10ª">10ª Classe</SelectItem>
                <SelectItem value="11ª">11ª Classe</SelectItem>
                <SelectItem value="12ª">12ª Classe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="turma">Turma</Label>
            <Input
              id="turma"
              value={form.turma}
              onChange={(e) => onUpdate("turma", e.target.value)}
              placeholder="Ex.: A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentNumber">Nº</Label>
            <Input
              id="studentNumber"
              value={form.studentNumber}
              onChange={(e) => onUpdate("studentNumber", e.target.value)}
              placeholder="Ex.: 15"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="student">Nome do aluno(a)</Label>
            <Input
              id="student"
              value={form.studentName}
              onChange={(e) => onUpdate("studentName", e.target.value)}
              placeholder="Ex.: Maria João António"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advisor">Professor(a)</Label>
            <Input
              id="advisor"
              value={form.advisorName}
              onChange={(e) => onUpdate("advisorName", e.target.value)}
              placeholder="Ex.: Prof. Carlos Bento"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => onUpdate("city", e.target.value)}
            placeholder="Ex.: Maputo"
          />
        </div>
      </div>
    );
  }

  if (educationLevel === "TECHNICAL") {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="institution">Instituição</Label>
            <Input
              id="institution"
              value={form.institutionName}
              onChange={(e) => onUpdate("institutionName", e.target.value)}
              placeholder="Ex.: ISTEG"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course">Curso</Label>
            <Input
              id="course"
              value={form.courseName}
              onChange={(e) => onUpdate("courseName", e.target.value)}
              placeholder="Ex.: Informática"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="student">Nome do estudante</Label>
            <Input
              id="student"
              value={form.studentName}
              onChange={(e) => onUpdate("studentName", e.target.value)}
              placeholder="Ex.: Maria João António"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advisor">Professor ou orientador</Label>
            <Input
              id="advisor"
              value={form.advisorName}
              onChange={(e) => onUpdate("advisorName", e.target.value)}
              placeholder="Ex.: Prof. Doutor João Luís"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentNumber">Nº de Estudante</Label>
            <Input
              id="studentNumber"
              value={form.studentNumber}
              onChange={(e) => onUpdate("studentNumber", e.target.value)}
              placeholder="Ex.: 2024/001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Disciplina</Label>
            <Input
              id="subject"
              value={form.subjectName}
              onChange={(e) => onUpdate("subjectName", e.target.value)}
              placeholder="Ex.: Gestão de Redes"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => onUpdate("city", e.target.value)}
            placeholder="Ex.: Maputo"
          />
        </div>
      </div>
    );
  }

  // HIGHER_EDUCATION
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="institution">Universidade</Label>
          <Input
            id="institution"
            value={form.institutionName}
            onChange={(e) => onUpdate("institutionName", e.target.value)}
            placeholder="Ex.: Universidade Eduardo Mondlane"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="facultyName">Faculdade</Label>
          <Input
            id="facultyName"
            value={form.facultyName}
            onChange={(e) => onUpdate("facultyName", e.target.value)}
            placeholder="Ex.: Faculdade de Economia"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departmentName">Departamento</Label>
          <Input
            id="departmentName"
            value={form.departmentName}
            onChange={(e) => onUpdate("departmentName", e.target.value)}
            placeholder="Ex.: Departamento de Gestão"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="course">Curso</Label>
          <Input
            id="course"
            value={form.courseName}
            onChange={(e) => onUpdate("courseName", e.target.value)}
            placeholder="Ex.: Gestão"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="student">Nome do estudante</Label>
          <Input
            id="student"
            value={form.studentName}
            onChange={(e) => onUpdate("studentName", e.target.value)}
            placeholder="Ex.: Maria João António"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="advisor">Orientador</Label>
          <Input
            id="advisor"
            value={form.advisorName}
            onChange={(e) => onUpdate("advisorName", e.target.value)}
            placeholder="Ex.: Prof. Doutor João Luís"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="studentNumber">Nº de Estudante</Label>
          <Input
            id="studentNumber"
            value={form.studentNumber}
            onChange={(e) => onUpdate("studentNumber", e.target.value)}
            placeholder="Ex.: 2024/001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Disciplina</Label>
          <Input
            id="subject"
            value={form.subjectName}
            onChange={(e) => onUpdate("subjectName", e.target.value)}
            placeholder="Ex.: Metodologia de Investigação"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="semester">Semestre</Label>
          <Select
            value={form.semester}
            onValueChange={(v) => onUpdate("semester", v)}
          >
            <SelectTrigger id="semester">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="I">I Semestre</SelectItem>
              <SelectItem value="II">II Semestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">Cidade</Label>
        <Input
          id="city"
          value={form.city}
          onChange={(e) => onUpdate("city", e.target.value)}
          placeholder="Ex.: Maputo"
        />
      </div>
    </div>
  );
}
