import { useEffect, useMemo, useRef, useState } from "react";
import { AOPS, CATALOG } from "@/lib/decagon/library";

type Suggestion = { insert: string; label: string; hint: string };

const AOP_ITEMS: Suggestion[] = AOPS.map((a) => ({ insert: a.slug, label: `#${a.slug}`, hint: a.name }));
const CATALOG_ITEMS: Suggestion[] = CATALOG.map((c) => ({
  insert: c.name,
  label: `@${c.name}`,
  hint: `${c.kind} · ${c.surface}`,
}));

export function AopEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<{ char: "#" | "@"; start: number; query: string } | null>(null);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    if (!trigger) return [];
    const pool = trigger.char === "#" ? AOP_ITEMS : CATALOG_ITEMS;
    const q = trigger.query.toLowerCase();
    return pool.filter((i) => i.insert.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)).slice(0, 6);
  }, [trigger]);

  useEffect(() => setIndex(0), [trigger?.query, trigger?.char]);

  const detect = (el: HTMLTextAreaElement) => {
    const caret = el.selectionStart ?? 0;
    const before = el.value.slice(0, caret);
    const match = /(^|[\s(>*_`])([#@])([a-z0-9_]*)$/i.exec(before);
    if (!match) {
      setTrigger(null);
      return;
    }
    setTrigger({
      char: match[2] as "#" | "@",
      start: caret - (match[3]?.length ?? 0) - 1,
      query: match[3] ?? "",
    });
  };

  const apply = (s: Suggestion) => {
    if (!trigger) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const next = value.slice(0, trigger.start) + trigger.char + s.insert + value.slice(caret);
    onChange(next);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = trigger.start + 1 + s.insert.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target);
        }}
        onClick={(e) => detect(e.currentTarget)}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) detect(e.currentTarget);
        }}
        onKeyDown={(e) => {
          if (!trigger || items.length === 0) {
            if (e.key === "Escape") setTrigger(null);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => (i - 1 + items.length) % items.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            const pick = items[index];
            if (pick) apply(pick);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setTrigger(null);
          }
        }}
        onBlur={() => setTimeout(() => setTrigger(null), 120)}
        className="ai-panel h-[32rem] w-full resize-none rounded-xl p-6 font-mono text-[13px] leading-relaxed outline-none focus:ai-glow"
      />

      {trigger && items.length > 0 ? (
        <div className="absolute bottom-4 left-6 z-10 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          <p className="border-b border-border bg-surface-2/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {trigger.char === "#" ? "AOPs" : "Tools & skills"}
            {trigger.query ? ` · "${trigger.query}"` : ""}
          </p>
          {items.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(s)}
              onMouseEnter={() => setIndex(i)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${i === index ? "bg-accent" : ""}`}
            >
              <span className="font-mono text-xs">{s.label}</span>
              <span className="truncate text-[11px] text-muted-foreground">{s.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
