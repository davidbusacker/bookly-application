import { createFileRoute } from "@tanstack/react-router";
import { booklyDb } from "@/lib/bookly/db";
import { dbErr, handler, ok, preflight } from "@/lib/bookly/http";

/**
 * Whole-catalog inventory snapshot, designed to be pulled into an agent's context in one call.
 * No search, no pagination — the full book list plus per-author rollups and totals.
 */
export const Route = createFileRoute("/api/public/v1/inventory/")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      GET: handler(async () => {
        const db = booklyDb();
        const { data, error } = await db
          .from("books")
          .select("id, isbn, title, author, format, category, price_cents, stock, published_year")
          .order("author", { ascending: true })
          .order("title", { ascending: true });
        dbErr(error);

        const books = data ?? [];
        const byAuthor = new Map<string, { author: string; titles: number; units_in_stock: number }>();
        for (const b of books) {
          const row = byAuthor.get(b.author) ?? { author: b.author, titles: 0, units_in_stock: 0 };
          row.titles += 1;
          row.units_in_stock += b.stock ?? 0;
          byAuthor.set(b.author, row);
        }

        return ok(
          {
            books,
            authors: [...byAuthor.values()].sort((a, b) => a.author.localeCompare(b.author)),
          },
          {
            total_titles: books.length,
            total_authors: byAuthor.size,
            total_units_in_stock: books.reduce((sum, b) => sum + (b.stock ?? 0), 0),
            out_of_stock_titles: books.filter((b) => (b.stock ?? 0) <= 0).length,
            generated_at: new Date().toISOString(),
          },
        );
      }),
    },
  },
});
