"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AcademicEducationLevel } from "@/types/editor";
import type { WorkFormState } from "@/hooks/use-work-creation";

interface EducationFieldsProps {
  educationLevel: AcademicEducationLevel;
  form: WorkFormState;
  onUpdate: <K extends keyof WorkFormState>(key: K, value: WorkFormState[K]) => void;
  onInstitutionChange?: (value: string) => void;
}

const TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

export function EducationFields({ educationLevel, form, onUpdate, onInstitutionChange }: EducationFieldsProps) {
  const [step, setStep] = useState(1);
  const [showOptional, setShowOptional] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const optionalFieldsId = `education-optional-fields-${educationLevel.toLowerCase()}`;

  useEffect(() => {
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [step]);

  const isStep1Complete = educationLevel === "SECONDARY"
    ? form.institutionName.trim().length > 0
    : form.institutionName.trim().length > 0 && form.courseName.trim().length > 0;
  const isStep2Complete = form.studentName.trim().length > 0;

  const step1Summary = () => {
    if (educationLevel === "SECONDARY") {
      return form.institutionName || "Escola não preenchida";
    }
    const parts = [form.institutionName, form.courseName].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Preenche os dados";
  };

  const step2Summary = () => {
    const parts = [form.studentName, form.advisorName].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Preenche os dados";
  };

  const handleContinue = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = (toStep: number) => {
    setShowOptional(false);
    setStep(toStep);
  };

  if (educationLevel === "SECONDARY") {
    return (
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="sec-step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Passo 1 de 2: Contexto escolar
              </p>
              <div className="space-y-2">
                <Label htmlFor="institution">Escola</Label>
                <Input
                  ref={firstFieldRef}
                  id="institution"
                  value={form.institutionName}
                  onChange={(e) => onInstitutionChange?.(e.target.value) ?? onUpdate("institutionName", e.target.value)}
                  placeholder="Ex.: Escola Secundária Josina Machel"
                />
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!isStep1Complete}
                  className="rounded-xl text-xs"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="sec-step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              {/* Step 1 summary */}
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step1Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              <p className="text-xs font-medium text-muted-foreground">
                Passo 2 de 2: Dados principais
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student">Aluno(a)</Label>
                  <Input
                    ref={firstFieldRef}
                    id="student"
                    value={form.studentName}
                    onChange={(e) => onUpdate("studentName", e.target.value)}
                    placeholder="Ex.: Maria João"
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
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!isStep2Complete}
                  className="rounded-xl text-xs"
                >
                  Concluir
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="sec-done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              {/* Step 1 summary */}
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step1Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              {/* Step 2 summary */}
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step2Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(2)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              {/* Optional fields toggle */}
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                aria-expanded={showOptional}
                aria-controls={optionalFieldsId}
                className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
              >
                <span>{showOptional ? "Ocultar detalhes" : "+ Adicionar detalhes"}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showOptional && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showOptional && (
                  <motion.div
                    id={optionalFieldsId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="className">Classe <span className="text-muted-foreground font-normal">(opcional)</span></Label>
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
                        <Label htmlFor="turma">Turma <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                          id="turma"
                          value={form.turma}
                          onChange={(e) => onUpdate("turma", e.target.value)}
                          placeholder="Ex.: A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="studentNumber">Nº <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                          id="studentNumber"
                          value={form.studentNumber}
                          onChange={(e) => onUpdate("studentNumber", e.target.value)}
                          placeholder="Ex.: 15"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Disciplina <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="subject"
                        value={form.subjectName}
                        onChange={(e) => onUpdate("subjectName", e.target.value)}
                        placeholder="Ex.: História"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => onUpdate("city", e.target.value)}
                        placeholder="Ex.: Maputo"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (educationLevel === "TECHNICAL") {
    return (
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="tech-step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Passo 1 de 2: Contexto académico
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="institution">Instituto</Label>
                  <Input
                    ref={firstFieldRef}
                    id="institution"
                    value={form.institutionName}
                    onChange={(e) => onInstitutionChange?.(e.target.value) ?? onUpdate("institutionName", e.target.value)}
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
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!isStep1Complete}
                  className="rounded-xl text-xs"
                >
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="tech-step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step1Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              <p className="text-xs font-medium text-muted-foreground">
                Passo 2 de 2: Dados principais
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student">Estudante</Label>
                  <Input
                    ref={firstFieldRef}
                    id="student"
                    value={form.studentName}
                    onChange={(e) => onUpdate("studentName", e.target.value)}
                    placeholder="Ex.: Maria João"
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
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleContinue}
                  disabled={!isStep2Complete}
                  className="rounded-xl text-xs"
                >
                  Concluir
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="tech-done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION}
              className="space-y-3"
            >
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step1Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(1)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="truncate text-xs text-muted-foreground">
                    {step2Summary()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleBack(2)}
                  className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Editar
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                aria-expanded={showOptional}
                aria-controls={optionalFieldsId}
                className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
              >
                <span>{showOptional ? "Ocultar detalhes" : "+ Adicionar detalhes"}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showOptional && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showOptional && (
                  <motion.div
                    id={optionalFieldsId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="studentNumber">Nº de Estudante <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                          id="studentNumber"
                          value={form.studentNumber}
                          onChange={(e) => onUpdate("studentNumber", e.target.value)}
                          placeholder="Ex.: 2024/001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Disciplina <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                        <Input
                          id="subject"
                          value={form.subjectName}
                          onChange={(e) => onUpdate("subjectName", e.target.value)}
                          placeholder="Ex.: Gestão de Redes"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => onUpdate("city", e.target.value)}
                        placeholder="Ex.: Maputo"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // HIGHER_EDUCATION
  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="high-step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITION}
            className="space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground">
              Passo 1 de 2: Contexto académico
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="institution">Universidade</Label>
                <Input
                  ref={firstFieldRef}
                  id="institution"
                  value={form.institutionName}
                  onChange={(e) => onInstitutionChange?.(e.target.value) ?? onUpdate("institutionName", e.target.value)}
                  placeholder="Ex.: Universidade Eduardo Mondlane"
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
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleContinue}
                disabled={!isStep1Complete}
                className="rounded-xl text-xs"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="high-step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITION}
            className="space-y-3"
          >
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate text-xs text-muted-foreground">
                  {step1Summary()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleBack(1)}
                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              Passo 2 de 2: Dados principais
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student">Estudante</Label>
                <Input
                  ref={firstFieldRef}
                  id="student"
                  value={form.studentName}
                  onChange={(e) => onUpdate("studentName", e.target.value)}
                  placeholder="Ex.: Maria João"
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
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleContinue}
                disabled={!isStep2Complete}
                className="rounded-xl text-xs"
              >
                Concluir
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="high-done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITION}
            className="space-y-3"
          >
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate text-xs text-muted-foreground">
                  {step1Summary()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleBack(1)}
                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate text-xs text-muted-foreground">
                  {step2Summary()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleBack(2)}
                className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              aria-expanded={showOptional}
              aria-controls={optionalFieldsId}
              className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
            >
              <span>{showOptional ? "Ocultar detalhes" : "+ Adicionar detalhes"}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showOptional && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showOptional && (
                <motion.div
                  id={optionalFieldsId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="facultyName">Faculdade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="facultyName"
                        value={form.facultyName}
                        onChange={(e) => onUpdate("facultyName", e.target.value)}
                        placeholder="Ex.: Faculdade de Economia"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departmentName">Departamento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="departmentName"
                        value={form.departmentName}
                        onChange={(e) => onUpdate("departmentName", e.target.value)}
                        placeholder="Ex.: Departamento de Gestão"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="studentNumber">Nº de Estudante <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="studentNumber"
                        value={form.studentNumber}
                        onChange={(e) => onUpdate("studentNumber", e.target.value)}
                        placeholder="Ex.: 2024/001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Disciplina <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                      <Input
                        id="subject"
                        value={form.subjectName}
                        onChange={(e) => onUpdate("subjectName", e.target.value)}
                        placeholder="Ex.: Metodologia de Investigação"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semestre <span className="text-muted-foreground font-normal">(opcional)</span></Label>
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
                    <Label htmlFor="city">Cidade <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => onUpdate("city", e.target.value)}
                      placeholder="Ex.: Maputo"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
