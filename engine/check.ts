// Step 3 of the offline fulfilment: work/Cxx/draft.json (written offline by Octave, no LLM at runtime) is
// checked against the customer's own course text with acquiz's static gates. Nothing is repaired silently:
// any failed item stops the build with the reason, and the draft is fixed by hand.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { answerAppearsInText, buildWordSet } from "./lib/ai/answer-presence";
import { findDuplicate, quoteInText } from "./lib/gen/gates";
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
  gates: { schema: boolean; quoteFound: boolean; answerPresent: boolean | null; duplicateOf: string | null };
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

export function checkCourse(dir: string, course: number): CheckReport {
  const wdir = join(dir, "work", courseId(course));
  const ex: CourseExtract = JSON.parse(readFileSync(join(wdir, "extract.json"), "utf8"));
  const raw = JSON.parse(readFileSync(join(wdir, "draft.json"), "utf8"));
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`${courseId(course)} draft.json : ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  const draft: Draft = parsed.data;
  if (draft.course !== course) throw new Error(`${courseId(course)} draft.json : course ${draft.course}`);
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
      items.push({ ...q, id, instrument: ins.key, source: loc ? { file: loc.file, place: loc.place } : null, gates: { schema: true, quoteFound: !!loc, answerPresent, duplicateOf }, problems });
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
