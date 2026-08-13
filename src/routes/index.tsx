import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bookly Store Console — Orders, Returns & Refunds" },
      {
        name: "description",
        content:
          "Bookly's support admin: live orders, shipments, returns, refunds with full decision history, transactions, customers and support tickets — backed by the public Bookly API.",
      },
      { property: "og:title", content: "Bookly Store Console" },
      {
        property: "og:description",
        content: "Live back-office view of every order, return, refund decision and support ticket in Bookly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
