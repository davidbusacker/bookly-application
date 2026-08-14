import { useState } from "react";
import { ChevronDown, User, Bot, Wrench, Shield, StickyNote } from "lucide-react";
import type { TraceMessage } from "@/lib/bookly/api-client";

const ROLE_STYLE: Record<string, string> = {
  customer: "border-l-sky-500/60",
  agent: "border-l-primary/60",
  tool: "border-l-amber-500/60",
  system: "border-l-border",
  note: "border-l-emerald-500/60",
};

const ROLE_ICON_COLOR: Record<string, string> = {
  customer: "text-sky-500",
  agent: "text-primary",
  tool: "text-amber-500",
  system: "text-muted-foreground",
  note: "text-emerald-500",
};

const ROLE_ICON_BG: Record<string, string> = {
  customer: "bg-sky-500/10",
  agent: "bg-primary/10",
  tool: "bg-amber-500/10",
  system: "bg-muted",
  note: "bg-emerald-500/10",
};

const DEFAULT_SPEAKER: Record<string, string> = {
  customer: "Customer",
  agent: "Agent",
  tool: "Agent",
  system: "System",
  note: "Internal note",
};

const ROLE_ICON: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  customer: User,
  agent: Bot,
  tool: Wrench,
  system: Shield,
  note: StickyNote,
};

const stamp = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

function ToolBlock({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function TraceTranscript({ messages }: { messages: TraceMessage[] }) {
  const [openTools, setOpenTools] = useState(false);
  const ordered = [...messages].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  if (ordered.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted-foreground">No turns logged for this trace.</p>;
  }

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpenTools((v) => !v)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-accent"
        >
          {openTools ? "Collapse all tool calls" : "Expand all tool calls"}
        </button>
      </div>

      {ordered.map((m, idx) => {
        const who = m.speaker || DEFAULT_SPEAKER[m.role] || m.role;
        const isTool = m.role === "tool";
        const isLast = idx === ordered.length - 1;
        const RoleIcon = ROLE_ICON[m.role] ?? Bot;
        return (
          <div key={m.id} className="flex flex-col items-center">
            <div className="flex w-full gap-3">
              <div className="flex w-16 flex-col items-center pt-3">
                <div
                  className={`rounded-full p-2.5 ${ROLE_ICON_BG[m.role] ?? "bg-muted"}`}
                  aria-hidden="true"
                >
                  <RoleIcon className={`${ROLE_ICON_COLOR[m.role] ?? "text-primary"}`} size={22} />
                </div>
                <span className="mt-1.5 text-center text-[10px] font-semibold leading-tight text-foreground/80">
                  {who}
                </span>
              </div>

              <article
                className={`flex-1 rounded-md border border-border border-l-4 bg-background px-4 py-3 ${ROLE_STYLE[m.role] ?? "border-l-border"}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-[11px] text-muted-foreground">[{stamp(m.occurred_at)}]</span>
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.role}
                  </span>
                  {isTool && m.tool_name ? <code className="text-xs font-medium">{m.tool_name}</code> : null}
                  {typeof m.duration_ms === "number" ? (
                    <span className="text-[11px] text-muted-foreground">{m.duration_ms} ms</span>
                  ) : null}
                </div>

                {m.content ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                ) : null}

                {isTool ? (
                  <details open={openTools} className="mt-1.5">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-4 hover:underline">
                      Tool call payload
                    </summary>
                    <ToolBlock label="Input" value={m.tool_input} />
                    <ToolBlock label="Output" value={m.tool_output} />
                  </details>
                ) : null}

                {m.metadata && Object.keys(m.metadata).length > 0 ? (
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    {Object.entries(m.metadata)
                      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </article>
            </div>
            {!isLast ? (
              <div className="my-1 flex h-6 items-center justify-center text-foreground/80">
                <ChevronDown size={18} strokeWidth={3} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
