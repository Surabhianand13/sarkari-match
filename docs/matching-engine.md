# Matching Engine

The matching engine is deterministic and rule-based. It does not call AI or LLM APIs.

Statuses:

- `strong_match`
- `possible_match`
- `needs_information`
- `not_eligible`

Rules evaluate age on the official cut-off date, qualification requirements, experience requirements, domicile and language warnings. Hard failures override score. Missing information is not treated as a failure.

Every user-facing result must include this disclaimer:

> Based on the information provided, you appear eligible. SarkariMatch does not guarantee eligibility. Verify the official notification before applying.
