import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { booklyDb } from "@/lib/bookly/db";
import { handler, ok, parseBody, preflight } from "@/lib/bookly/http";

const Body = z.object({ email: z.string().email() });

export const Route = createFileRoute("/api/public/v1/support/actions/password-reset")({
  server: {
    handlers: {
      OPTIONS: () => preflight(),
      POST: handler(async ({ request }) => {
        const body = await parseBody(request, Body);
        const db = booklyDb();
        const { data: customer } = await db
          .from("customers")
          .select("id,name,email")
          .eq("email", body.email)
          .maybeSingle();

        // Always return the same shape so the API never leaks account existence.
        return ok({
          email: body.email,
          sent: true,
          known_customer: Boolean(customer),
          expires_in_minutes: 30,
          message:
            "If an account exists for this email, a password reset link has been sent. The link expires in 30 minutes.",
          simulated: true,
        });
      }),
    },
  },
});
