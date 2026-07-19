import { personColorClass, personInitial } from "@/lib/allowlist";

export function PersonAvatar({ autor }: { autor: string }) {
  return (
    <span
      className={`person-avatar ${personColorClass(autor)}`}
      title={autor}
      aria-label={autor}
    >
      {personInitial(autor)}
    </span>
  );
}
