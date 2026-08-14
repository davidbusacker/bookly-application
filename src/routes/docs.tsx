import { createFileRoute } from "@tanstack/react-router";
import { endpointsByTag, ENDPOINTS } from "@/lib/bookly/catalog";
import { RULES } from "@/lib/bookly/rules";
import { TRACE_LOGGING_GUIDE } from "@/lib/bookly/traces";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Bookly Support API — Order, Returns & Refunds API Docs" },
      {
        name: "description",
        content:
          "Public, no-auth REST API for Bookly, a fictional bookstore: orders, shipping, returns, refunds, policies and support tickets, with OpenAPI 3.1 and an agent tool manifest.",
      },
      { property: "og:title", content: "Bookly Support API" },
      {
        property: "og:description",
        content: "Order, returns, refunds and support knowledge API with OpenAPI 3.1, tools.json and llms.txt.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const LINKS = [
  { href: "/admin", label: "Store console (staff view)" },
  { href: "/api/public/openapi.json", label: "OpenAPI 3.1 spec" },
  { href: "/api/public/tools.json", label: "Agent tool manifest" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/api/public/v1/meta", label: "Discovery metadata" },
  { href: "/api/public/v1/health", label: "Health" },
];

function Docs() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Bookly · demo bookstore
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Bookly Support API</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A fully API-native order, shipping, returns and refunds system for building a customer support
            agent. No authentication, open CORS, {ENDPOINTS.length} documented endpoints.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Conventions & rules</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>Success: <code>{'{ "data": ..., "meta": { "request_id" } }'}</code>; errors use an RFC 9457-style envelope.</li>
            <li>Money is integer cents. Orders accept UUID or <code>BK-#####</code>; customers accept UUID or email.</li>
            <li>Lists paginate with <code>limit</code> (max 100) and <code>offset</code>.</li>
            <li>
              Returns: {RULES.returnWindowDays}-day window ({RULES.damagedWindowDays} days for damaged/wrong item),
              ${(RULES.returnLabelFeeCents / 100).toFixed(2)} label fee waived for damaged claims, ebooks
              non-returnable.
            </li>
            <li>Cancellation allowed while {RULES.cancellableStatuses.join(" or ")}.</li>
          </ul>
        </section>

        <section id="agent-trace-logging" className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Agent trace logging (required)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            After every conversation the CX agent must POST a trace to{" "}
            <code>/api/public/v1/agent-traces</code>. Staff read these in the console under{" "}
            <a href="/admin/traces" className="underline underline-offset-4">Agent traces</a>. The same
            instructions are served in <code>/api/public/tools.json</code>, <code>/llms.txt</code> and the
            OpenAPI description.
          </p>
          <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap">
            {TRACE_LOGGING_GUIDE}
          </pre>
        </section>


        {endpointsByTag().map((group) => (
          <section key={group.name} className="mt-10">
            <h2 className="text-xl font-semibold">{group.name}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
            <div className="mt-4 space-y-3">
              {group.endpoints.map((e) => (
                <article key={e.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs font-bold text-primary-foreground">
                      {e.method}
                    </span>
                    <code className="text-sm font-medium">{e.path}</code>
                  </div>
                  <p className="mt-2 text-sm">{e.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Agent guidance: {e.agentUse}</p>
                  {e.example ? (
                    <a
                      href={e.method === "GET" ? e.example.path : "/api/public/openapi.json"}
                      className="mt-2 inline-block text-xs font-medium underline underline-offset-4"
                    >
                      {e.method === "GET" ? `Try ${e.example.path}` : "See request body in the OpenAPI spec"}
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
