// Acquimètre offline fulfilment. Usage (from the repo root):
//   npx tsx engine/cli.ts extract <orderDir>   course files (input/order.json + input/Cxx/*) -> work/Cxx/extract.{json,txt}
//   npx tsx engine/cli.ts cold    <orderDir>   work/Cxx/draft.json -> work/Cxx/cold.prompts.jsonl (cold-answer gate, to answer
//                                              offline WITHOUT the course into work/Cxx/cold.answers.jsonl)
//   npx tsx engine/cli.ts judge   <orderDir>   cold answers of MC items -> work/Cxx/cold.judge-prompts.jsonl (judged
//                                              offline against the key into work/Cxx/cold.judge.jsonl)
//   npx tsx engine/cli.ts check   <orderDir>   work/Cxx/draft.json (written offline by Octave) -> gates -> work/Cxx/check.json
//   npx tsx engine/cli.ts render  <orderDir>   checked drafts -> output/<zip> (DOCX, PDF, CSV, evidence file)
//   npx tsx engine/cli.ts all     <orderDir>   the three steps (extract, check, render)
// <orderDir>/input is what gas/scripts/eval-ops.mjs pull writes (order.json + Cxx/ folders). No network, no LLM.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { checkCourse, coldPrompts, judgePrompts, stampCold } from "./check";
import { courseId, extractOrder, readOrder } from "./extract";
import { renderOrder } from "./render";

const [cmd, dirArg] = process.argv.slice(2);
if (!cmd || !dirArg) {
  console.error("usage: cli.ts extract|cold|judge|check|render|all <orderDir>");
  process.exit(2);
}
const dir = resolve(dirArg);
const courses = () => [...new Set(readOrder(dir).files.map((f) => f.course))].sort((a, b) => a - b);

async function main() {
  if (cmd === "extract" || cmd === "all") {
    const ex = await extractOrder(dir);
    console.log(JSON.stringify({ step: "extract", courses: ex.map((c) => ({ course: c.course, title: c.title, files: c.files.map((f) => `${f.file} (${f.kind}, ${f.words} mots, ${f.places.length} emplacements)`) })) }));
  }
  if (cmd === "cold") {
    for (const c of courses()) console.log(JSON.stringify({ step: "cold", course: courseId(c), ...coldPrompts(dir, c) }));
    return;
  }
  if (cmd === "stamp") {
    for (const c of courses()) stampCold(dir, c);
    return;
  }
  if (cmd === "judge") {
    for (const c of courses()) console.log(JSON.stringify({ step: "judge", course: courseId(c), ...judgePrompts(dir, c) }));
    return;
  }
  let reports = [];
  if (cmd === "check" || cmd === "render" || cmd === "all") {
    for (const c of courses()) {
      if (!existsSync(join(dir, "work", courseId(c), "draft.json"))) throw new Error(`${courseId(c)} : work/${courseId(c)}/draft.json manquant (à rédiger à partir de work/${courseId(c)}/extract.txt)`);
      const r = checkCourse(dir, c);
      reports.push(r);
      console.log(JSON.stringify({ step: "check", course: courseId(c), ok: r.ok, counts: r.counts, problems: r.problems }));
    }
    if (reports.some((r) => !r.ok)) process.exit(1);
  }
  if (cmd === "render" || cmd === "all") {
    const z = await renderOrder(dir, { reports });
    console.log(JSON.stringify({ step: "render", zip: z.zip, sha256: z.sha256, files: z.files.length }));
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
