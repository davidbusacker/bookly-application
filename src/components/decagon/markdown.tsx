import type { ReactNode } from "react";

export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|#[a-z0-9_]+|@[a-z0-9_]+|\{\{[a-z0-9_.]+\}\})/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
        if (/^`[^`]+`$/.test(part)) {
          const inner = part.slice(1, -1);
          return (
            <code key={i} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
              <Inline text={inner} />
            </code>
          );
        }
        if (/^\{\{/.test(part))
          return (
            <span
              key={i}
              className="rounded bg-[color-mix(in_oklab,var(--ai-2)_18%,transparent)] px-1 font-mono text-[0.85em] text-[var(--ai-2)]"
            >
              {part}
            </span>
          );
        if (/^#/.test(part))
          return (
            <span key={i} className="rounded bg-[color-mix(in_oklab,var(--ai)_16%,transparent)] px-1 font-medium text-[var(--ai)]">
              {part}
            </span>
          );
        if (/^@/.test(part))
          return (
            <span key={i} className="rounded bg-[color-mix(in_oklab,var(--brand)_16%,transparent)] px-1 font-medium text-brand">
              {part}
            </span>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let table: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="ml-4 list-disc space-y-1">
        {list.map((li, i) => (
          <li key={i}>
            <Inline text={li} />
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushTable = (key: string) => {
    if (!table.length) return;
    const rows = table.map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
    const head = rows[0] ?? [];
    const body = rows.slice(1).filter((r) => !r.every((c) => /^-+$/.test(c)));
    blocks.push(
      <div key={key} className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/70">
            <tr>
              {head.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Inline text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {body.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2 align-top">
                    <Inline text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    table = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^\|/.test(line)) {
      flushList(`l${idx}`);
      table.push(line);
      return;
    }
    flushTable(`t${idx}`);
    if (/^[-*] /.test(line)) {
      list.push(line.slice(2));
      return;
    }
    flushList(`l${idx}`);
    if (!line.trim()) return;
    if (/^---+$/.test(line)) {
      blocks.push(<hr key={idx} className="border-border" />);
    } else if (/^### /.test(line)) {
      blocks.push(
        <h3 key={idx} className="pt-1 text-sm font-semibold">
          <Inline text={line.slice(4)} />
        </h3>,
      );
    } else if (/^## /.test(line)) {
      blocks.push(
        <h2 key={idx} className="pt-2 text-base font-semibold tracking-tight">
          <Inline text={line.slice(3)} />
        </h2>,
      );
    } else if (/^# /.test(line)) {
      blocks.push(
        <h1 key={idx} className="ai-text text-xl font-bold tracking-tight">
          <Inline text={line.slice(2)} />
        </h1>,
      );
    } else if (/^> /.test(line)) {
      blocks.push(
        <blockquote
          key={idx}
          className="border-l-2 border-[color-mix(in_oklab,var(--ai)_50%,transparent)] bg-surface-2/50 px-3 py-2 italic"
        >
          <Inline text={line.slice(2)} />
        </blockquote>,
      );
    } else if (/^\d+\. /.test(line)) {
      blocks.push(
        <p key={idx} className="ml-4">
          <Inline text={line} />
        </p>,
      );
    } else {
      blocks.push(
        <p key={idx}>
          <Inline text={line} />
        </p>,
      );
    }
  });
  flushList("l-end");
  flushTable("t-end");

  return <div className="space-y-2.5">{blocks}</div>;
}
