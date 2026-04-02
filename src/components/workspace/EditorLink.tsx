import Link from "next/link";
import { SquarePen } from "lucide-react";

interface EditorLinkProps {
  workId: string;
}

export function EditorLink({ workId }: EditorLinkProps) {
  return (
    <div className="border-t border-border/60 px-4 py-3">
      <Link
        href={`/app/trabalhos/${workId}/editor`}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <SquarePen className="h-3.5 w-3.5" />
        Abrir editor completo
      </Link>
    </div>
  );
}
