import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Bookly Store Console — Orders, Returns & Customers" },
      {
        name: "description",
        content:
          "Bookly's internal store console: live view of orders, shipments, returns, refunds, transactions, customers and support tickets backed by the public Bookly API.",
      },
      { property: "og:title", content: "Bookly Store Console" },
      { property: "og:description", content: "Live back-office view of every order, return, refund and ticket in Bookly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsoleLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/returns", label: "Returns" },
  { to: "/admin/refunds", label: "Refunds" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/tickets", label: "Support" },
] as const;

function ConsoleLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link to="/admin" className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight">Bookly</span>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Store console
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n ? n.exact : false }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-accent hover:text-foreground" }}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <a
            href="/docs"
            className="ml-auto rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            API docs
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
