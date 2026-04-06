export type ProjectType = "trabalho escolar" | "trabalho técnico" | "trabalho académico";

export const projectTypeStyles: Record<ProjectType, { label: string; className: string }> = {
  "trabalho escolar": {
    label: "Trabalho Escolar",
    className: "bg-indigo-500/10 backdrop-blur-xl text-indigo-400 border border-indigo-500/20",
  },
  "trabalho técnico": {
    label: "Trabalho Técnico",
    className: "bg-lime-500/10 backdrop-blur-xl text-lime-400 border border-lime-500/20",
  },
  "trabalho académico": {
    label: "Trabalho Académico",
    className: "bg-violet-500/10 backdrop-blur-xl text-violet-400 border border-violet-500/20",
  },
};
