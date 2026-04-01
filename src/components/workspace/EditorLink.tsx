import Link from "next/link";

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
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
          />
          <path
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
          />
        </svg>
        Abrir editor completo
      </Link>
    </div>
  );
}
