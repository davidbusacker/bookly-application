import type { ReactNode } from "react";

const TONE: Record<string, string> = {
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
  red: "bg-destructive/12 text-destructive border-destructive/25",
  gray: "bg-muted text-muted-foreground border-border",
};

const STATUS_TONE: Record<string, keyof typeof TONE> = {
  delivered: "green",
  succeeded: "green",
  completed: "green",
  refunded: "green",
  received: "green",
  resolved: "green",
  closed: "gray",
  shipped: "blue",
  in_transit: "blue",
  processing: "blue",
  open: "blue",
  requested: "amber",
  pending: "amber",
  label_created: "amber",
  awaiting_customer: "amber",
  on_hold: "amber",
  cancelled: "red",
  canceled: "red",
  failed: "red",
  voided: "red",
  rejected: "red",
  returned: "amber",
};

export function StatusBadge({ value }: { value?: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = TONE[STATUS_TONE[value] ?? "gray"];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children = "Nothing here yet." }: { children?: ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{label}</p>;
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <p className="px-5 py-8 text-center text-sm text-destructive">
      {error instanceof Error ? error.message : "Something went wrong."}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
