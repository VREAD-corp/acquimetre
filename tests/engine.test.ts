// Engine tests: acquiz static gates on Acquimètre drafts, PPTX extraction, deterministic option order,
// and the public sample (every question of the published example passes every gate).
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import JSZip from "jszip";

import { checkCourse, locateQuote } from "../engine/check";
import { extractOrder } from "../engine/extract";
import { parseFile } from "../engine/lib/parse/index";
import { quoteInText } from "../engine/lib/gen/gates";
import { itemProblems } from "../engine/lib/gen/schema";
import { nbsp, shuffledChoices } from "../engine/render";

const ROOT = resolve(import.meta.dirname, "..");
const SAMPLE = join(ROOT, "samples/gestion-temps");

async function pptx(slides: string[], notes: string[] = []) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  slides.forEach((s, i) => zip.file(`ppt/slides/slide${i + 1}.xml`, `<p:sld><p:cSld><p:spTree><p:sp><p:txBody>${s.split("\n").map((l) => `<a:p><a:r><a:t>${l.replace(/&/g, "&amp;")}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`));
  notes.forEach((n, i) => n && zip.file(`ppt/notesSlides/notesSlide${i + 1}.xml`, `<p:notes><a:p><a:r><a:t>${n}</a:t></a:r></a:p><a:p><a:r><a:t>${i + 1}</a:t></a:r></a:p></p:notes>`));
  return zip.generateAsync({ type: "uint8array" });
}

test("PPTX: one place per slide (« diapositive N »), notes included, slide 10 after slide 2", async () => {
  const slides = Array.from({ length: 10 }, (_, i) => `Titre ${i + 1}\nLa règle des 80/20 de Pareto s’applique au temps & aux tâches, diapositive ${i + 1}.`);
  const p = await parseFile("cours.pptx", await pptx(slides, ["Notes du formateur : insister sur la marge de 40 %"]));
  assert.equal(p.kind, "pptx");
  assert.equal(p.places.length, 10);
  assert.equal(p.places[9]!.label, "diapositive 10");
  assert.match(p.places[0]!.text, /Notes : Notes du formateur : insister sur la marge de 40 %/);
  assert.match(p.places[0]!.text, /temps & aux tâches/);
  assert.ok(quoteInText("insister sur la marge de 40 %", p.places[0]!.text));
});

test("formats: a .txt renamed .pdf or an unknown extension is refused", async () => {
  await assert.rejects(parseFile("faux.pdf", new TextEncoder().encode("bonjour")), /Format non pris en charge/);
  await assert.rejects(parseFile("cours.odt", new Uint8Array([0x50, 0x4b, 3, 4])), /Format non pris en charge/);
});

test("item rules (acquiz itemProblems): one-word answers, answer not in the question, exactly one right option, no duplicate option", () => {
  const base = { objective: 1, source_quote: "une citation du cours assez longue" };
  assert.deepEqual(itemProblems({ ...base, type: "word", question: "Quel mot désigne le fait de remettre au lendemain ?", answer: "procrastination" }, { objectiveCount: 2 }), []);
  assert.ok(itemProblems({ ...base, type: "word", question: "Quel est le contraire de la procrastination ici ?", answer: "procrastination" }, { objectiveCount: 2 }).includes("réponse contenue dans la question"));
  assert.ok(itemProblems({ ...base, type: "word", question: "Quelle méthode utilisez-vous ici ?", answer: "méthode Nerac" }, { objectiveCount: 2 }).includes("réponse en plusieurs mots"));
  assert.ok(itemProblems({ ...base, type: "mcq", question: "Quelle part du temps prend l’essentiel ?", answer: "20 %", choices: ["10 %", "30 %", "50 %"] }, { objectiveCount: 2 }).some((p) => /exactement une fois/.test(p)));
  assert.ok(itemProblems({ ...base, type: "mcq", question: "Quelle part du temps prend l’essentiel ?", answer: "20 %", choices: ["20 %", "30 %", "30 %"] }, { objectiveCount: 2 }).includes("options en double"));
  assert.ok(itemProblems({ ...base, objective: 3, type: "word", question: "Quel mot désigne le fait de remettre au lendemain ?", answer: "procrastination" }, { objectiveCount: 2 }).some((p) => /hors plage/.test(p)));
});

test("the public sample: 35 questions, every quote found on its page, every one-word answer in its passage, no duplicate", () => {
  const r = checkCourse(SAMPLE, 1);
  assert.equal(r.ok, true, r.problems.join("; "));
  assert.deepEqual(r.counts, { positioning: 10, final: 15, j30: 10 });
  assert.ok(r.items.every((i) => i.gates.quoteFound && i.source && /^p\. \d+/.test(i.source.place)));
  assert.ok(r.items.filter((i) => i.type === "word").every((i) => i.gates.answerPresent === true));
  const nerac = r.items.find((i) => i.id === "F4")!;
  assert.deepEqual(nerac.source, { file: "C01/support-gestion-professionnelle-du-temps.pdf", place: "p. 10" });
});

test("gates catch a made-up quote, a one-word answer absent from the passage and a near-duplicate question", () => {
  const dir = mkdtempSync(join(tmpdir(), "acq-check-"));
  cpSync(join(SAMPLE, "work/C01/extract.json"), join(dir, "work/C01/extract.json"), { recursive: true });
  mkdirSync(join(dir, "work/C01"), { recursive: true });
  const draft = JSON.parse(readFileSync(join(SAMPLE, "work/C01/draft.json"), "utf8"));
  draft.final.items[0].source_quote = "Le cours affirme que la pause café dure exactement vingt minutes";
  draft.final.items[1].answer = "motivation";
  draft.j30.items[1] = { ...draft.positioning.items[0] };
  writeFileSync(join(dir, "work/C01/draft.json"), JSON.stringify(draft));
  const r = checkCourse(dir, 1);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.startsWith("F1 : ") && /citation introuvable/.test(p)), r.problems.join("\n"));
  assert.ok(r.problems.some((p) => p.startsWith("F2 : ") && /réponse absente du passage cité/.test(p)));
  assert.ok(r.problems.some((p) => p.startsWith("J2 : ") && /doublon de P1/.test(p)));
});

test("options are shuffled deterministically (same order for the same order id) and the right answer is not always first", () => {
  const r = checkCourse(SAMPLE, 1);
  const mcq = r.items.filter((i) => i.type === "mcq");
  const first = mcq.map((i) => shuffledChoices(i, "exemple").indexOf(i.answer));
  assert.deepEqual(first, mcq.map((i) => shuffledChoices(i, "exemple").indexOf(i.answer)));
  assert.ok(new Set(first).size >= 3, `positions ${first}`);
  assert.ok(mcq.every((i) => shuffledChoices(i, "x").sort().join() === [...i.choices!].sort().join()));
});

test("French typography: no-break space before « ? : ; % » in rendered Markdown", () => {
  assert.equal(nbsp("Quelle part ? 20 % du temps : « oui »"), "Quelle part ? 20 % du temps : « oui »");
});

test("extract: the sample order reads the DOCX programme (1 place) and the PDF support (22 pages)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "acq-ex-"));
  cpSync(join(SAMPLE, "input"), join(dir, "input"), { recursive: true });
  const [c] = await extractOrder(dir);
  assert.equal(c!.files.length, 2);
  assert.deepEqual(c!.files.map((f) => [f.kind, f.places.length]), [["docx", 1], ["pdf", 22]]);
  assert.ok(locateQuote("Signifie Noter, Estimer, Réserver, Arbitrer, Contrôler", c!));
});
