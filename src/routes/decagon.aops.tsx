import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, History, Pencil, Save, FlaskConical } from "lucide-react";
import { Card } from "@/components/console/ui";
import { Markdown } from "@/components/decagon/markdown";
import { AopEditor } from "@/components/decagon/aop-editor";
import { AOPS, AOP_VERSIONS, type AopVersion } from "@/lib/decagon/library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/decagon/aops")({
  head: () => ({
    meta: [
      { title: "AOPs — Bookly Agent Operating Procedures" },
      {
        name: "description",
        content:
          "Browse Bookly's agent operating procedures: return intake, refund timing, order status, account resets and the drafted genre-fit nudge.",
      },
      { property: "og:title", content: "Bookly AOP library" },
      { property: "og:description", content: "Agent operating procedures powering Bookly support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AopLibrary,
});

const STATUS_CLASS: Record<string, string> = {
  live: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  draft: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  shadow: "border-border bg-muted text-muted-foreground",
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function VersionPerf({ v }: { v: AopVersion }) {
  if (v.convos === 0) {
    return (
      <p className="px-3 pb-3 pt-2 text-xs text-muted-foreground">
        No eval data — this version has never served production traffic.
      </p>
    );
  }
  return (
    <div className="space-y-2 px-3 pb-3 pt-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Eval quality" value={`${v.quality}`} />
        <Metric label="Containment" value={`${v.containment}%`} />
        <Metric label="CSAT" value={v.csat.toFixed(1)} />
        <Metric label="Convos" value={v.convos.toLocaleString()} />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {v.note} · Authored by {v.author}
      </p>
    </div>
  );
}

function AopLibrary() {
  const [slug, setSlug] = useState(AOPS[0]?.slug ?? "");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const active = AOPS.find((a) => a.slug === slug) ?? AOPS[0];
  const body = active ? (edits[active.slug] ?? active.body) : "";

  const versions = active ? (AOP_VERSIONS[active.slug] ?? []) : [];
  const [openVersion, setOpenVersion] = useState<string | null>(null);
  const selectedVersion = versions.find((v) => v.version === openVersion) ?? versions[0];
  const dirty = active ? edits[active.slug] !== undefined : false;
  const nextVersion = `v${versions.length + 1}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AOPs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {AOPS.length} agent operating procedures across the support agent and the store chatbot.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="space-y-5">
          <Card title="Library">
            <div className="flex flex-col p-2">
              {AOPS.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => {
                    setSlug(a.slug);
                    setEditing(false);
                    setOpenVersion(null);
                  }}
                  className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                    a.slug === active?.slug ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-medium">{a.name}</span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[a.status]}`}>
                      {a.status}
                    </span>
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    #{a.slug}
                    {edits[a.slug] !== undefined ? " · edited" : ""}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card
            title={
              <span className="inline-flex items-center gap-1.5">
                <History size={13} /> Version history
              </span>
            }
          >
            <div className="p-2">
              {versions.map((v) => {
                const open = v.version === selectedVersion?.version;
                return (
                  <div key={v.version} className="rounded-lg">
                    <button
                      type="button"
                      onClick={() => setOpenVersion(open ? "" : v.version)}
                      className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${open ? "bg-accent" : "hover:bg-accent/50"}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{v.version}</span>
                        {v.live ? (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                            live
                          </span>
                        ) : null}
                        <span className="ml-auto text-[11px] text-muted-foreground">{v.date}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{v.label}</span>
                    </button>
                    {open ? <VersionPerf v={v} /> : null}
                  </div>
                );
              })}
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                Every publish is retained with the eval scores recorded while it served traffic.
              </p>
            </div>
          </Card>
        </div>

        {active ? (
          <Card
            title={`#${active.slug}`}
            action={
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Surface · {active.surface}</span>
                {editing && dirty ? (
                  <button
                    type="button"
                    onClick={() => setSaveOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-shadow hover:ai-glow"
                  >
                    <Save size={12} /> Save version
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium transition-shadow hover:ai-glow"
                >
                  {editing ? <Eye size={12} /> : <Pencil size={12} />}
                  {editing ? "Preview" : "Edit mode"}
                </button>
              </div>
            }
          >
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm text-muted-foreground">{active.summary}</p>
              {!editing && selectedVersion ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted-foreground">
                  <span>
                    Viewing <span className="font-mono font-semibold text-foreground">{selectedVersion.version}</span>
                    {selectedVersion.live ? " (live)" : ""}
                  </span>
                  <span>Published {selectedVersion.date}</span>
                  {selectedVersion.convos > 0 ? (
                    <>
                      <span>Quality {selectedVersion.quality}</span>
                      <span>Containment {selectedVersion.containment}%</span>
                      <span>CSAT {selectedVersion.csat.toFixed(1)}</span>
                    </>
                  ) : (
                    <span>No production traffic yet</span>
                  )}
                </div>
              ) : null}
              {saved ? (
                <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {saved}
                </p>
              ) : null}
              {editing ? (
                <>
                  <AopEditor
                    value={body}
                    onChange={(next) => setEdits((e) => ({ ...e, [active.slug]: next }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Type <span className="font-mono">#</span> for an AOP, <span className="font-mono">@</span> for a tool or skill, or{" "}
                    <span className="font-mono">{"{{"}</span> for an attribute — keep typing to filter, ↑↓ to move, Enter to insert.
                  </p>
                </>
              ) : (
                <div className="ai-panel rounded-xl p-6 text-sm leading-relaxed">
                  <Markdown text={body} />
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <SaveVersionDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        slug={active?.slug ?? ""}
        nextVersion={nextVersion}
        liveVersion={versions.find((v) => v.live)?.version ?? "—"}
        onConfirm={(mode) => {
          setSaveOpen(false);
          setEditing(false);
          setSaved(
            mode === "ab"
              ? `${nextVersion} saved · A/B test configured at 50/50 against ${versions.find((v) => v.live)?.version ?? "live"}.`
              : `${nextVersion} saved as a draft version — not yet serving traffic.`,
          );
        }}
      />
    </div>
  );
}

function SaveVersionDialog({
  open,
  onOpenChange,
  slug,
  nextVersion,
  liveVersion,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  nextVersion: string;
  liveVersion: string;
  onConfirm: (mode: "ab" | "draft") => void;
}) {
  const [label, setLabel] = useState("");
  const [split, setSplit] = useState("50");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save version {nextVersion}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">#{slug}</span> is in production on {liveVersion}. New versions never replace live
            traffic directly — roll them out behind an A/B test.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ver-label">
              Version label
            </label>
            <input
              id="ver-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Exchange-first branch"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ai-glow"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ver-split">
              Traffic to {nextVersion}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="ver-split"
                type="range"
                min={5}
                max={95}
                step={5}
                value={split}
                onChange={(e) => setSplit(e.target.value)}
                className="flex-1 accent-[var(--primary)]"
              />
              <span className="w-24 text-right font-mono text-xs tabular-nums">
                {split}% / {100 - Number(split)}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Remaining traffic continues on {liveVersion}. Eval quality, containment and CSAT are recorded per version.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => onConfirm("draft")}
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => onConfirm("ab")}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-shadow hover:ai-glow"
          >
            <FlaskConical size={13} /> Configure A/B test
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
