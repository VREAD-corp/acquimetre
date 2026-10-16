# QA of the public sample (reading engine)

Since 2026-10-16 `engine/` imports READ FRANCE's reading engine (`@read-france/reading-engine`, VREAD-corp/vread-reading-engine,
pinned to a commit in package.json): PDF/DOCX extraction, the section segmenter, answer presence, quote location and
duplicates, and the historical **cold-answer gate** and form rules of vread-workflow-def (snapshot `a5df9a9`), which the
acquiz copy vendored here before never ran. The fulfilment gains two offline steps (no model key, no network):

```sh
npx tsx engine/cli.ts cold  <orderDir>   # work/Cxx/cold.prompts.jsonl: course title + question, never the course
#   -> an agent that has not seen the course answers into work/Cxx/cold.answers.jsonl (it copies each qhash)
npx tsx engine/cli.ts judge <orderDir>   # MC answers (asked without options) vs key -> judged into cold.judge.jsonl
npx tsx engine/cli.ts check <orderDir>   # every gate; a leak or a missing/stale cold answer stops the build
```
The entry test (positioning, Qualiopi indicator 8) measures prior knowledge by design and is exempt.

## Sample « Gestion professionnelle du temps » (35 questions)

| | Round 0 (2026-10-14 draft) | Final |
|---|---|---|
| Static gates | 35/35 | 35/35 |
| Form rules (new) | 5 flagged (format hints « (un mot) », cloze items: rule refined in the engine, no item change) | 0 |
| Cold-answer gate (memory: course title + question) | **18 of 25** end-of-training / J+30 items answered right without the course | **25/25 pass** (10 positioning exempt) |

The 18 items were rewritten onto the course's own examples (its NERAC and pendulage cases, its Pareto table, its
named tools), re-checked, and re-tested by a fresh cold agent and judge. Files: `qa/cold/` (round-0 prompts and
answers, with and without options), `samples/gestion-temps/work/C01/cold.*` (final), `work/C01/check.json` (every gate
of every item). Note for the trainer: three rewritten items (F3, F13, F14) test details of the support (dates, tool
names) more than a skill; acceptable for a sample, to be watched on real orders.
