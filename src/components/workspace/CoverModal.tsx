"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WorkBrief } from "@/types/workspace";

const TEMPLATES = [
  { id: "UEM_STANDARD", name: "UEM", desc: "Universidade Eduardo Mondlane" },
  { id: "UCM_STANDARD", name: "UCM", desc: "Universidade Católica" },
  { id: "ISRI", name: "ISRI", desc: "Relações Internacionais" },
  { id: "ABNT_GENERIC", name: "ABNT", desc: "Qualquer instituição" },
  { id: "MODERNA", name: "Moderna", desc: "Relatórios e propostas" },
  { id: "CLASSICA", name: "Clássica", desc: "Contextos formais" },
] as const;

interface CoverModalProps {
  open: boolean;
  brief: WorkBrief;
  currentTemplate?: string;
  onSelect: (template: string) => void;
  onSaveBrief: (data: Partial<WorkBrief>) => void;
  onClose: () => void;
}

export function CoverModal({
  open,
  brief,
  currentTemplate,
  onSelect,
  onSaveBrief,
  onClose,
}: CoverModalProps) {
  const [selected, setSelected] = useState(
    currentTemplate ?? "UEM_STANDARD"
  );

  const [info, setInfo] = useState({
    institutionName: brief.institutionName ?? "",
    courseName: brief.courseName ?? "",
    studentName: brief.studentName ?? "",
    advisorName: brief.advisorName ?? "",
    city: brief.city ?? "",
    year: brief.year ?? "",
  });

  const handleApplyTemplate = () => {
    onSelect(selected);
    onClose();
  };

  const handleSaveInfo = () => {
    onSaveBrief(info);
    onClose();
  };

  const updateField = (field: keyof typeof info, value: string) => {
    setInfo((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar capa</DialogTitle>
          <DialogDescription>
            Altera o estilo e os dados que aparecem na capa do trabalho.
          </DialogDescription>
        </DialogHeader>

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
            <div className="grid grid-cols-3 gap-2.5">
              {TEMPLATES.map((tpl) => (
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
                      {tpl.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-2xl"
              >
                Cancelar
              </Button>
              <Button onClick={handleApplyTemplate} className="rounded-2xl">
                Aplicar template
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="info" className="mt-4">
              <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cover-institution" className="text-xs">
                  Instituição
                </Label>
                <Input
                  id="cover-institution"
                  value={info.institutionName}
                  onChange={(e) => updateField("institutionName", e.target.value)}
                  placeholder="Ex.: Universidade Eduardo Mondlane"
                  className="text-xs"
                />
              </div>

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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cover-student" className="text-xs">
                    Estudante
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
                    Orientador
                  </Label>
                  <Input
                    id="cover-advisor"
                    value={info.advisorName}
                    onChange={(e) => updateField("advisorName", e.target.value)}
                    placeholder="Ex.: Prof. Doutor João"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="rounded-2xl"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveInfo} className="rounded-2xl">
                Guardar dados
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
