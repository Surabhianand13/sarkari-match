# Question factory

Admin: `/admin/factory` (runs) and `/admin/factory/sources` (syllabus, current affairs, past papers).

## How a question moves

1. **Writer** drafts questions for an exam, subject and optional topic, using the syllabus, current affairs and past-paper style on file.
2. **Solver** answers each question without seeing the key. Quantitative questions are also proved by exact arithmetic.
3. **Review** fixes spelling, grammar and wording (small edits only) and checks syllabus fit and level.
4. **Syllabus and past-paper check** rejects near copies of past papers and flags topics missing from the syllabus.
5. **Repeat checker** rejects questions that match an existing one.
6. **Fixer** repairs any question that failed a check (two attempts), then it goes back through the checks.
7. A person approves in `/admin/questions`. Anything unsure, and every General Awareness question, goes to a person. Nothing publishes by itself.

## Who does the AI work

| Mode | What it uses | Good for |
|---|---|---|
| Chat queue | Claude and ChatGPT subscriptions, no API | Starting out, hundreds to a few thousand questions |
| No AI | Exact arithmetic templates | Quantitative Aptitude |
| API | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY` | Scale (lakhs of questions) |

In chat-queue mode the run stops at each AI step and shows **Copy next tasks**. Paste them into a chat, paste the reply into **Apply answers**, and the run continues. Use Claude for writing and fixing and ChatGPT for solving and reviewing, so the checker is a different model from the writer.

From a terminal (for a Claude Code session answering tasks): `pnpm factory:tasks list|answer|advance`.

## Sources

Past papers are used only for style and level and to reject near copies. They are never reprinted. Add a date to current affairs; the factory warns when the newest one is over a year old.
