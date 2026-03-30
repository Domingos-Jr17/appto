export type ProjectType =
  | "monografia"
  | "tese"
  | "artigo"
  | "relatório"
  | "dissertação"
  | "ensaio"
  | "tcc"
  | "trabalho de pesquisa"
  | "trabalho escolar"
  | "trabalho prático";

export const projectTypeStyles: Record<ProjectType, { label: string; className: string }> = {
  monografia: {
    label: "Monografia",
    className: "bg-violet-500/10 backdrop-blur-xl text-violet-400 border border-violet-500/20",
  },
  tese: {
    label: "Tese",
    className: "bg-amber-500/10 backdrop-blur-xl text-amber-400 border border-amber-500/20",
  },
  artigo: {
    label: "Artigo",
    className: "bg-emerald-500/10 backdrop-blur-xl text-emerald-400 border border-emerald-500/20",
  },
  relatório: {
    label: "Relatório",
    className: "bg-sky-500/10 backdrop-blur-xl text-sky-400 border border-sky-500/20",
  },
  dissertação: {
    label: "Dissertação",
    className: "bg-pink-500/10 backdrop-blur-xl text-pink-400 border border-pink-500/20",
  },
  ensaio: {
    label: "Ensaio",
    className: "bg-orange-500/10 backdrop-blur-xl text-orange-400 border border-orange-500/20",
  },
  tcc: {
    label: "TCC",
    className: "bg-fuchsia-500/10 backdrop-blur-xl text-fuchsia-400 border border-fuchsia-500/20",
  },
  "trabalho de pesquisa": {
    label: "Trabalho de Pesquisa",
    className: "bg-cyan-500/10 backdrop-blur-xl text-cyan-400 border border-cyan-500/20",
  },
  "trabalho escolar": {
    label: "Trabalho Escolar",
    className: "bg-indigo-500/10 backdrop-blur-xl text-indigo-400 border border-indigo-500/20",
  },
  "trabalho prático": {
    label: "Trabalho Prático",
    className: "bg-lime-500/10 backdrop-blur-xl text-lime-400 border border-lime-500/20",
  },
};
