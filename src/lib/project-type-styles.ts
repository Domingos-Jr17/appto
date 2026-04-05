export type ProjectType = "trabalho escolar" | "trabalho prático" | "trabalho de investigacao";

export const projectTypeStyles: Record<ProjectType, { label: string; className: string }> = {
  "trabalho escolar": {
    label: "Trabalho Escolar",
    className: "bg-indigo-500/10 backdrop-blur-xl text-indigo-400 border border-indigo-500/20",
  },
  "trabalho prático": {
    label: "Trabalho Prático",
    className: "bg-lime-500/10 backdrop-blur-xl text-lime-400 border border-lime-500/20",
  },
  "trabalho de investigacao": {
    label: "Trabalho de Investigação",
    className: "bg-violet-500/10 backdrop-blur-xl text-violet-400 border border-violet-500/20",
  },
};
