import { useEffect, useMemo, useRef, useState } from "react";
import { AOPS, CATALOG } from "@/lib/decagon/library";

type Suggestion = { insert: string; label: string; hint: string };

const AOP_ITEMS: Suggestion[] = AOPS.map((a) => ({ insert: a.slug, label: `#${a.slug}`, hint: a.name }));
const CATALOG_ITEMS: Suggestion[] = CATALOG.map((c) => ({
  insert: c.name,
  label: `@${c.name}`,
  hint: `${c.kind} · ${c.surface}`,
}));

// Attributes referenced anywhere in the AOP library become searchable resources
const ATTR_ITEMS: Suggestion[] = (() => {
  const seen = new Map<string, Suggestion>();
  for (const a of AOPS) {
    for (const m of a.body.matchAll(/\{\{([^}]+)\}\}/g)) {
      const path = m[1]?.trim();
      if (path && !seen.has(path)) {
        const ns = path.split(".")[0] ?? path;
        seen.set(path, { insert: path, label: `{{${path}}}`, hint: `${ns} attribute` });
      }
    }
  }
  return [...seen.values()];
})();

type Trigger = { char: "#" | "@" | "{"; start: number; query: string };

const TRIGGER_META: Record<Trigger["char"], { pool: Suggestion[]; heading: string }> = {
  "#": { pool: AOP_ITEMS, heading: "AOPs" },
  "@": { pool: CATALOG_ITEMS, heading: "Tools & skills" },
  "{": { pool: ATTR_ITEMS, heading: "Attributes" },
};

function detectTrigger(value: string, caret: number): Trigger | null {
  const before = value.slice(0, caret);
  const attr = /(^|[\s(>*_`])(\{\{)([a-z0-9_.]*)$/i.exec(before);
  if (attr) {
    return { char: "{", start: caret - (attr[3]?.length ?? 0) - 2, query: attr[3] ?? "" };
  }
  const m = /(^|[\s(>*_`])([#@])([a-z0-9_]*)$/i.exec(before);
  if (m) {
    return { char: m[2] as "#" | "@", start: caret - (m[3]?.length ?? 0) - 1, query: m[3] ?? "" };
  }
  return null;
}

// Render text with colored reference chips, keeping identical layout metrics
function highlight(text: string) {
  const parts = text.split(/(\{\{[^}]*\}\}?|#[a-z0-9_]+|@[a-z0-9_]+)/gi);
  return parts.map((p, i) => {
    if (/^\{\{/.test(p)) {
      return (
        <span key={i} className="rounded bg-[color-mix(in_oklab,var(--ai)_18%,transparent)] text-[var(--ai)]">
          {p}
        </span>
      );
    }
    if (/^#[a-z0-9_]/i.test(p)) {
      return (
        <span key={i} className="rounded bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-[var(--primary)]">
          {p}
        </span>
      );
    }
    if (/^@[a-z0-9_]/i.test(p)) {
      return (
        <span key={i} className="rounded bg-[color-mix(in_oklab,var(--brand-2)_18%,transparent)] text-[var(--brand-2)]">
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

const EDITOR_TEXT = "p-6 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words";

export function AopEditor({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    if (!trigger) return [];
    const pool = TRIGGER_META[trigger.char].pool;
    const q = trigger.query.toLowerCase();
    return pool.filter((i) => i.insert.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)).slice(0, 6);
  }, [trigger]);

  useEffect(() => setIndex(0), [trigger?.query, trigger?.char]);

  const syncScroll = () => {
    if (ref.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = ref.current.scrollTop;
    }
  };

  const detect = (el: HTMLTextAreaElement) => {
    setTrigger(detectTrigger(el.value, el.selectionStart ?? 0));
  };

  const apply = (s: Suggestion) => {
    if (!trigger) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const open = trigger.char === "{" ? "{{" : trigger.char;
    const close = trigger.char === "{" ? "}}" : "";
    const next = value.slice(0, trigger.start) + open + s.insert + close + value.slice(caret);
    onChange(next);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = trigger.start + open.length + s.insert.length + close.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <div className="ai-panel relative h-[32rem] overflow-hidden rounded-xl focus-within:ai-glow">
        {/* Highlight mirror behind the transparent-text textarea */}
        <div
          ref={mirrorRef}
          aria-hidden
          className={`absolute inset-0 overflow-hidden text-foreground ${EDITOR_TEXT}`}
        >
          {highlight(value)}
          {"\n"}
        </div>
        <textarea
          ref={ref}
          value={value}
          spellCheck={false}
          onScroll={syncScroll}
          onChange={(e) => {
            onChange(e.target.value);
            detect(e.target);
            syncScroll();
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
          className={`relative h-full w-full resize-none bg-transparent text-transparent caret-foreground outline-none ${EDITOR_TEXT}`}
        />
      </div>

      {trigger && items.length > 0 ? (
        <div className="absolute bottom-4 left-6 z-10 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          <p className="border-b border-border bg-surface-2/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {TRIGGER_META[trigger.char].heading}
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
