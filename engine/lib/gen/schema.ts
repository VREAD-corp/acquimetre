// Adapted from VREAD-corp/acquiz@cdba4c0 src/lib/gen/schema.ts (Octave/Vin-CC for READ FRANCE SAS).
// The item contract and the item-level rules (itemProblems) are unchanged; the draft written offline by
// Octave adds the course header (objectives, prerequisites) and three instruments (Qualiopi 8 and 11).
import { z } from "zod";

import { buildWordSet, normalizeAnswerForPresence } from "../ai/answer-presence";

export const GeneratedQuestionSchema = z.object({
  objective: z.number().int().min(1),
  type: z.enum(["word", "mcq"]),
  question: z.string().trim().min(10).max(400),
  answer: z.string().trim().min(1).max(200),
  choices: z.array(z.string().trim().min(1).max(200)).min(3).max(4).nullable().optional(),
  source_quote: z.string().trim().min(8).max(600),
  /** Optional: alternatives accepted for a 'word' answer, written "a|b" (acquiz scoring rule). */
  explanation: z.string().trim().max(400).optional(),
  points: z.number().int().min(1).max(4).optional(),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export const InstrumentSchema = z.object({
  items: z.array(GeneratedQuestionSchema).min(3).max(40),
  /** Pass mark in % of the points (end of training, J+30). */
  threshold: z.number().int().min(30).max(100).optional(),
});

export const DraftSchema = z.object({
  course: z.number().int().min(1).max(10),
  title: z.string().trim().min(3).max(160),
  duration: z.string().trim().max(80).optional(),
  audience: z.string().trim().max(300).optional(),
  objectives: z.array(z.string().trim().min(10).max(260)).min(2).max(8),
  objectivesSource: z.string().trim().max(400),
  prerequisites: z.array(z.string().trim().min(3).max(260)).max(6),
  positioning: InstrumentSchema.extend({
    rule: z.object({ standard: z.number().int(), light: z.number().int() }),
    selfAssessment: z.array(z.string().trim().min(3).max(200)).min(2).max(8),
  }),
  final: InstrumentSchema,
  j30: InstrumentSchema,
});
export type Draft = z.infer<typeof DraftSchema>;

/**
 * Item-level rules the JSON schema cannot express. An item that breaks one is
 * dropped (and counted), never "repaired" silently.
 */
export const itemProblems = (q: GeneratedQuestion, ctx: { objectiveCount: number }): string[] => {
  const problems: string[] = [];
  if (q.objective > ctx.objectiveCount) problems.push(`objective ${q.objective} hors plage`);
  if (q.type === "word") {
    // Vread rule (integrity.ts): ONE word, no whitespace. Hyphens/apostrophes allowed.
    if (q.answer.split("|").some((a) => /\s/.test(a.trim()))) problems.push("réponse en plusieurs mots");
    // Word-level, not substring: answer "C" must not match the "c" of "classe".
    if (q.answer.split("|").some((a) => buildWordSet(q.question).has(normalizeAnswerForPresence(a)))) problems.push("réponse contenue dans la question");
    if (q.choices && q.choices.length) problems.push("question à réponse libre avec des options");
  } else {
    const choices = q.choices ?? [];
    if (choices.length < 3) problems.push("QCM sans 3 à 4 options");
    const matches = choices.filter((c) => c.trim().toLowerCase() === q.answer.trim().toLowerCase()).length;
    if (matches !== 1) problems.push("la bonne réponse doit figurer exactement une fois parmi les options");
    if (new Set(choices.map((c) => c.trim().toLowerCase())).size !== choices.length) problems.push("options en double");
  }
  return problems;
};
