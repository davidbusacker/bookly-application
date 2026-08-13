import { money, when, type RefundEvent } from "@/lib/bookly/api-client";
import { StatusBadge } from "@/components/console/ui";

export function RefundTimeline({ events }: { events: RefundEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No history recorded for this refund yet.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {sorted.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border border-border bg-primary" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {e.status_from ? (
              <>
                <StatusBadge value={e.status_from} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : null}
            <StatusBadge value={e.status_to ?? e.type} />
            <span className="text-xs text-muted-foreground">
              {when(e.created_at)} · by <span className="font-medium text-foreground">{e.actor}</span>
              {typeof e.amount_cents === "number" ? ` · ${money(e.amount_cents)}` : ""}
            </span>
          </div>
          {e.note ? <p className="mt-1 text-sm text-muted-foreground">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
