import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { BarChart3, ChevronDown, FileText, FlaskConical, MessagesSquare, RadioTower, Sparkle, Wrench } from "lucide-react";
import { InterfaceDot } from "@/components/interface-dot";

export const Route = createFileRoute("/decagon")({
  component: DecagonLayout,
});

const NAV = [
  { to: "/decagon", label: "Insights", icon: BarChart3, exact: true },
  { to: "/decagon/convos", label: "Convos", icon: MessagesSquare },
  { to: "/decagon/watchtower", label: "Watchtower", icon: RadioTower },
  { to: "/decagon/evals", label: "Evaluations", icon: FlaskConical },
  { to: "/decagon/aops", label: "AOPs", icon: FileText },
  { to: "/decagon/catalog", label: "Tools & skills", icon: Wrench },
  { to: "/decagon/duet", label: "Duet", icon: Sparkle },
] as const;



function DecagonLayout() {
  return (
    <div className="app-canvas flex min-h-screen bg-background text-foreground">
      <InterfaceDot />
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 px-3 py-5 backdrop-blur-xl md:flex">
        <div className="px-2 pb-6">
          <p className="ai-text text-lg font-bold tracking-tight">decagon</p>
          <div className="relative mt-1 inline-flex max-w-full items-center">
            <select
              aria-label="Workspace"
              defaultValue="bookly-prd"
              className="appearance-none rounded-md border border-border bg-surface-1 py-1 pl-2 pr-7 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="bookly-prd">Bookly (PRD)</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2 text-muted-foreground" aria-hidden />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n ? n.exact : false }}
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-soft)]" }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <n.icon size={16} />
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-border px-6 py-3 md:hidden">
          <span className="text-base font-bold">decagon</span>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-muted-foreground">
              {n.label}
            </Link>
          ))}
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
