# P2 Implementation

P2 adds production-shaped foundations for:

- Pro Plus
- WhatsApp
- Multiple candidate profiles
- Advanced reports
- Automated notification extraction assistance
- Multilingual support

## Guardrails

- Pro Plus remains feature-flagged by `NEXT_PUBLIC_ENABLE_PRO_PLUS`.
- WhatsApp remains disabled unless `NEXT_PUBLIC_ENABLE_WHATSAPP=true` and a real provider is configured.
- Automated extraction can create draft review payloads only. Publication requires human approval and verification.
- Localized content must be reviewed before public display.

## Routes

- `/dashboard/family`
- `/dashboard/reports`
- `/dashboard/language`
- `/admin/extraction`
- `/admin/advanced-reports`

## Remaining Production Work

- Connect WhatsApp provider credentials and templates.
- Add server-side profile creation enforcing entitlement limits.
- Build PDF ingestion and extraction queue.
- Add reviewed translations for public pages.
- Generate downloadable advanced reports.
