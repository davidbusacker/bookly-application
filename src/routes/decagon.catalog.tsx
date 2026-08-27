import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Wrench, Zap } from "lucide-react";
import { Card, Table } from "@/components/console/ui";
import { CATALOG, type CatalogEntry } from "@/lib/decagon/library";

export const Route = createFileRoute("/decagon/catalog")({
  head: () => ({
    meta: [
      { title: "Tools & Skills — Bookly Agent Catalog" },
      {
        name: "description",
        content: "Browse and edit the catalog of tools and skills available to Bookly's AI support agent and store chatbot.",
      },
      { property: "og:title", content: "Bookly tool & skill catalog" },
      { property: "og:description", content: "Every tool and skill the Bookly agents can call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

const BLANK: Omit<CatalogEntry, "id"> = {
  kind: "tool",
  name: "",
  description: "",
  surface: "bookly_api",
  status: "draft",
};

function CatalogPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>(CATALOG);
  const [filter, setFilter] = useState<"all" | "tool" | "skill">("all");
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [draft, setDraft] = useState<Omit<CatalogEntry, "id">>(BLANK);

  const rows = useMemo(
    () => entries.filter((e) => (filter === "all" ? true : e.kind === filter)),
    [entries, filter],
  );

  const openNew = () => {
    setEditing(null);
    setDraft(BLANK);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    if (editing) {
      setEntries((prev) => prev.map((e) => (e.id === editing.id ? { ...editing, ...draft } : e)));
    } else {
      setEntries((prev) => [...prev, { ...draft, id: `n${Date.now()}` }]);
    }
    setEditing(null);
    setDraft(BLANK);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tools &amp; skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.filter((e) => e.kind === "tool").length} tools · {entries.filter((e) => e.kind === "skill").length} skills
          available to Bookly agents. Changes here are local to this workspace session.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card
          title="Catalog"
          action={
            <div className="flex gap-1">
              {(["all", "tool", "skill"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                    filter === k ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          }
        >
          <Table head={["Name", "Type", "Surface", "Status", ""]}>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-2.5">
                  <span className="flex items-center gap-2">
                    {e.kind === "tool" ? (
                      <Wrench size={13} className="text-[var(--ai)]" />
                    ) : (
                      <Zap size={13} className="text-brand" />
                    )}
                    <span className="font-mono text-xs font-medium">
                      {e.kind === "tool" ? "" : "@"}
                      {e.name}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{e.description}</span>
                </td>
                <td className="px-5 py-2.5 capitalize">{e.kind}</td>
                <td className="px-5 py-2.5 font-mono text-xs">{e.surface}</td>
                <td className="px-5 py-2.5 capitalize">{e.status}</td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(e);
                      setDraft({ kind: e.kind, name: e.name, description: e.description, surface: e.surface, status: e.status });
                    }}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-accent"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card
          title={editing ? `Edit ${editing.name}` : "New tool or skill"}
          action={
            editing ? (
              <button type="button" onClick={openNew} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            ) : null
          }
        >
          <div className="space-y-3 px-5 py-4">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Type
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as CatalogEntry["kind"] })}
                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground"
              >
                <option value="tool">Tool</option>
                <option value="skill">Skill</option>
              </select>
            </label>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="get_reading_profile"
                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Description
              <textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={3}
                className="mt-1 w-full resize-none rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Surface
              <input
                value={draft.surface}
                onChange={(e) => setDraft({ ...draft, surface: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as CatalogEntry["status"] })}
                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-normal normal-case tracking-normal text-foreground"
              >
                <option value="live">Live</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <button
              type="button"
              onClick={save}
              disabled={!draft.name.trim()}
              className="brand-bar inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              <Plus size={14} /> {editing ? "Save changes" : "Add to catalog"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
