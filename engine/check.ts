// Step 3 of the offline fulfilment: work/Cxx/draft.json (written offline by Octave, no LLM at runtime) is
// checked against the customer's own course text with the gates of @read-france/reading-engine (quote found,
// answer present, duplicates, and since 2026-10-16 the cold-answer gate and the form rules, see qa.ts).
// Nothing is repaired silently: any failed item stops the build with the reason, and the draft is fixed by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { answerAppearsInText, buildWordSet, findDuplicate, quoteInText } from "@read-france/reading-engine";

import { COLD_ANSWERS, COLD_PROMPTS, JUDGE_PROMPTS, JUDGE_VERDICTS, engineProblems, stampFiles, toItemSet, writeColdPrompts, writeJudgePrompts, type QaItem } from "./qa";
import { DraftSchema, itemProblems, type Draft, type GeneratedQuestion } from "./lib/gen/schema";
import { courseId, type CourseExtract } from "./extract";

export const INSTRUMENTS = [
  { key: "positioning", code: "P", label: "Test de positionnement à l’entrée", indicator: 8, minPerObjective: 1 },
  { key: "final", code: "F", label: "Évaluation des acquis en fin de formation", indicator: 11, minPerObjective: 2 },
  { key: "j30", code: "J", label: "Évaluation des acquis à J+30", indicator: 11, minPerObjective: 1 },
] as const;
export type InstrumentKey = (typeof INSTRUMENTS)[number]["key"];

export type CheckedItem = GeneratedQuestion & {
  id: string;
  instrument: InstrumentKey;
  source: { file: string; place: string } | null;
  gates: { schema: boolean; quoteFound: boolean; answerPresent: boolean | null; duplicateOf: string | null; cold: string };
  problems: string[];
};
export type CheckReport = { course: number; title: string; ok: boolean; items: CheckedItem[]; problems: string[]; counts: Record<string, number> };

/** First file/place (PDF page, slide, document) whose text contains the quote. */
export function locateQuote(quote: string, ex: CourseExtract): { file: string; place: string; text: string } | null {
  for (const f of ex.files) for (const p of f.places) if (quoteInText(quote, p.text)) return { file: f.file, place: p.label, text: p.text };
  // A passage that runs over a page break: whole file, labelled with both pages.
  for (const f of ex.files) {
    if (!quoteInText(quote, f.places.map((p) => p.text).join("\n"))) continue;
    for (let i = 0; i + 1 < f.places.length; i++) {
      const two = f.places[i]!.text + "\n" + f.places[i + 1]!.text;
      if (quoteInText(quote, two)) return { file: f.file, place: `${f.places[i]!.label}-${f.places[i + 1]!.label.replace(/^p\. /, "")}`, text: two };
    }
  }
  return null;
}

/** The course's draft as reading-engine items (positioning = entry test, exempt from the cold-answer gate). */
function qaItems(draft: Draft, ex: CourseExtract): QaItem[] {
  const out: QaItem[] = [];
  for (const ins of INSTRUMENTS) {
    draft[ins.key].items.forEach((q, i) => {
      const loc = locateQuote(q.source_quote, ex);
      out.push({ id: `${ins.code}${i + 1}`, type: q.type, question: q.question, answer: q.answer, choices: q.choices, placeText: loc?.text ?? "", quote: q.source_quote, coldExempt: ins.key === "positioning" });
    });
  }
  return out;
}

const loadCourse = (dir: string, course: number) => {
  const wdir = join(dir, "work", courseId(course));
  const ex: CourseExtract = JSON.parse(readFileSync(join(wdir, "extract.json"), "utf8"));
  const raw = JSON.parse(readFileSync(join(wdir, "draft.json"), "utf8"));
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`${courseId(course)} draft.json : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  const draft: Draft = parsed.data;
  if (draft.course !== course) throw new Error(`${courseId(course)} draft.json : course ${draft.course}`);
  return { wdir, ex, draft };
};

/** Writes work/Cxx/cold.prompts.jsonl, to be answered offline (without the course) into work/Cxx/cold.answers.jsonl. */
export function coldPrompts(dir: string, course: number): { file: string; count: number } {
  const { wdir, ex, draft } = loadCourse(dir, course);
  const file = join(wdir, COLD_PROMPTS);
  return { file, count: writeColdPrompts(file, [toItemSet(`acquimetre/${courseId(course)}`, draft.title, qaItems(draft, ex), "course")], join(wdir, COLD_ANSWERS)) };
}

/** One-off: fingerprints cold answers and verdicts written before fingerprints existed. */
export function stampCold(dir: string, course: number) {
  const { wdir, ex, draft } = loadCourse(dir, course);
  stampFiles([toItemSet(`acquimetre/${courseId(course)}`, draft.title, qaItems(draft, ex), "course")], join(wdir, COLD_ANSWERS), join(wdir, JUDGE_VERDICTS));
}

/** After the cold answers: work/Cxx/cold.judge-prompts.jsonl (MC answers vs key), to judge offline into cold.judge.jsonl. */
export function judgePrompts(dir: string, course: number): { file: string; count: number } {
  const { wdir, ex, draft } = loadCourse(dir, course);
  const file = join(wdir, JUDGE_PROMPTS);
  return { file, count: writeJudgePrompts(file, [toItemSet(`acquimetre/${courseId(course)}`, draft.title, qaItems(draft, ex), "course")], join(wdir, COLD_ANSWERS)) };
}

export function checkCourse(dir: string, course: number): CheckReport {
  const { wdir, ex, draft } = loadCourse(dir, course);
  const fromEngine = engineProblems([toItemSet(`acquimetre/${courseId(course)}`, draft.title, qaItems(draft, ex), "course")], join(wdir, COLD_ANSWERS), join(wdir, JUDGE_VERDICTS));
  const items: CheckedItem[] = [];
  const earlier: { id: string; prompt: string }[] = [];
  for (const ins of INSTRUMENTS) {
    draft[ins.key].items.forEach((q, i) => {
      const id = `${ins.code}${i + 1}`;
      const problems = itemProblems(q, { objectiveCount: draft.objectives.length });
      const loc = locateQuote(q.source_quote, ex);
      if (!loc) problems.push("citation introuvable dans les supports");
      const answerPresent = q.type === "word" ? !!loc && q.answer.split("|").some((alt) => answerAppearsInText(alt, buildWordSet(loc.text))) : null;
      if (answerPresent === false) problems.push("réponse absente du passage cité");
      const duplicateOf = findDuplicate(q.question, earlier);
      if (duplicateOf) problems.push(`doublon de ${duplicateOf}`);
      earlier.push({ id, prompt: q.question });
      const engine = fromEngine.get(id) ?? [];
      problems.push(...engine);
      const cold = ins.key === "positioning" ? "exempt" : engine.some((p) => p.startsWith("porte cold-answer")) ? "pending" : engine.some((p) => p.startsWith("répondable")) ? "leak" : "pass";
      items.push({ ...q, id, instrument: ins.key, source: loc ? { file: loc.file, place: loc.place } : null, gates: { schema: true, quoteFound: !!loc, answerPresent, duplicateOf, cold }, problems });
    });
  }
  const problems: string[] = items.filter((i) => i.problems.length).map((i) => `${i.id} : ${i.problems.join(", ")}`);
  for (const ins of INSTRUMENTS) {
    draft.objectives.forEach((_, o) => {
      const n = items.filter((i) => i.instrument === ins.key && i.objective === o + 1).length;
      if (n < ins.minPerObjective) problems.push(`${ins.label} : objectif ${o + 1} couvert par ${n} question(s), ${ins.minPerObjective} au moins`);
    });
  }
  const counts = Object.fromEntries(INSTRUMENTS.map((ins) => [ins.key, items.filter((i) => i.instrument === ins.key).length]));
  const report: CheckReport = { course, title: draft.title, ok: problems.length === 0, items, problems, counts };
  writeFileSync(join(wdir, "check.json"), JSON.stringify(report, null, 1) + "\n");
  return report;
}
