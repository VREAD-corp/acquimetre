// Step 1 of the offline fulfilment: course files of an order -> work/Cxx/extract.json (text, places, segments).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseFile, type ParsedFile } from "./lib/parse/index";

export type OrderFile = { course: number; course_title: string; file: string };
export type Order = { order_id: string; company: string; courses: number; sample?: boolean; files: OrderFile[] };
export type CourseExtract = {
  course: number;
  title: string;
  files: { file: string; kind: ParsedFile["kind"]; sha256: string; words: number; pages?: number; places: ParsedFile["places"]; segments: ParsedFile["segments"] }[];
};

export const courseId = (n: number) => `C${String(n).padStart(2, "0")}`;

export const readOrder = (dir: string): Order => JSON.parse(readFileSync(join(dir, "input", "order.json"), "utf8"));

export async function extractOrder(dir: string): Promise<CourseExtract[]> {
  const order = readOrder(dir);
  const byCourse = new Map<number, OrderFile[]>();
  for (const f of order.files) byCourse.set(f.course, [...(byCourse.get(f.course) ?? []), f]);
  if (byCourse.size > 10) throw new Error(`${byCourse.size} formations : 10 au maximum par commande`);
  const out: CourseExtract[] = [];
  for (const [course, files] of [...byCourse.entries()].sort((a, b) => a[0] - b[0])) {
    const ex: CourseExtract = { course, title: files[0]!.course_title, files: [] };
    for (const f of files) {
      const bytes = readFileSync(join(dir, "input", f.file));
      const p = await parseFile(f.file, bytes);
      ex.files.push({ file: f.file, kind: p.kind, sha256: p.sha256, words: p.wordCount, pages: p.pages, places: p.places, segments: p.segments });
    }
    const wdir = join(dir, "work", courseId(course));
    mkdirSync(wdir, { recursive: true });
    writeFileSync(join(wdir, "extract.json"), JSON.stringify(ex, null, 1) + "\n");
    writeFileSync(join(wdir, "extract.txt"), ex.files.map((f) => `===== ${f.file} (${f.kind}, ${f.words} mots)\n` + f.places.map((pl) => `--- ${pl.label}\n${pl.text}`).join("\n")).join("\n\n") + "\n");
    out.push(ex);
  }
  return out;
}
