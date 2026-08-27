import { Link, useRouterState } from "@tanstack/react-router";

/**
 * Discreet demo switcher: a tiny dot fixed in the upper-left corner that
 * toggles between the Bookly store console and the Decagon CX environment.
 */
export function InterfaceDot() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inDecagon = pathname.startsWith("/decagon");
  const to = inDecagon ? "/admin" : "/decagon";

  return (
    <Link
      to={to}
      title={inDecagon ? "Switch to Bookly store" : "Switch to Decagon CX"}
      aria-label={inDecagon ? "Switch to Bookly store" : "Switch to Decagon CX"}
      className="fixed left-2 top-2 z-50 grid size-4 place-items-center rounded-full opacity-30 transition-opacity hover:opacity-90"
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${inDecagon ? "bg-primary" : "ai-text bg-current"}`}
        style={inDecagon ? undefined : { background: "var(--ai-accent, currentColor)" }}
      />
    </Link>
  );
}
