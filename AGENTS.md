# SarkariMatch Agent Notes

- Preserve production intent: this is not a visual prototype.
- Keep public pages server-rendered by default.
- Do not use live AI for eligibility decisions.
- Do not expose service-role, Razorpay, email, or webhook secrets to clients.
- Add tables through SQL files in `db/migrations`; there is no RLS, so every user-scoped query must filter by the session user id and admin routes must call `requireAdmin()`.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before shipping a phase.
