import type { QueryClient } from "@tanstack/react-query";

import { apiGet, qs } from "./api-client";

/**
 * Warms the React Query cache with the default data every Bookly admin and
 * Decagon landing screen requests, so switching environments is instant.
 */
export function prefetchAllEnvironments(queryClient: QueryClient) {
  const ordersRecent = "/api/public/v1/orders?limit=8";
  const ordersOpen = "/api/public/v1/orders?status=pending,processing,shipped&limit=1";
  const ordersList = `/api/public/v1/orders${qs({ limit: 25, offset: 0 })}`;
  const customersList = `/api/public/v1/customers${qs({ limit: 50 })}`;
  const returnsList = `/api/public/v1/returns${qs({ limit: 50 })}`;
  const transactionsList = `/api/public/v1/transactions${qs({ limit: 50 })}`;
  const convosList = `/api/public/v1/agent-traces${qs({ q: "", outcome: "", limit: 100 })}`;

  const jobs: Array<{ queryKey: unknown[]; path: string }> = [
    // Bookly admin
    { queryKey: ["orders", "recent"], path: ordersRecent },
    { queryKey: ["orders", "open"], path: ordersOpen },
    { queryKey: ["returns", "recent"], path: "/api/public/v1/returns?limit=6" },
    { queryKey: ["refunds", "recent"], path: "/api/public/v1/refunds?limit=6" },
    { queryKey: ["customers", "count"], path: "/api/public/v1/customers?limit=1" },
    { queryKey: ["orders", ordersList], path: ordersList },
    { queryKey: ["customers", customersList], path: customersList },
    { queryKey: ["returns", returnsList], path: returnsList },
    { queryKey: ["transactions", transactionsList], path: transactionsList },
    { queryKey: ["refunds", "all"], path: "/api/public/v1/refunds?limit=50" },
    // Decagon
    { queryKey: ["decagon-traces"], path: "/api/public/v1/agent-traces?limit=100" },
    { queryKey: ["decagon-convos", "", ""], path: convosList },
  ];

  return Promise.all(
    jobs.map((job) =>
      queryClient
        .prefetchQuery({
          queryKey: job.queryKey,
          queryFn: () => apiGet(job.path),
          staleTime: 10_000,
        })
        .catch(() => undefined),
    ),
  );
}

/** Route paths preloaded (code + loaders) so navigation never waits on a chunk. */
export const PRELOAD_ROUTES = [
  "/admin",
  "/admin/orders",
  "/admin/customers",
  "/admin/returns",
  "/admin/transactions",
  "/admin/refunds",
  "/admin/settings",
  "/decagon",
  "/decagon/convos",
  "/decagon/aops",
  "/decagon/catalog",
  "/decagon/evals",
  "/decagon/watchtower",
  "/decagon/duet",
] as const;
