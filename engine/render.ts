// Step 4 of the offline fulfilment: checked drafts -> Markdown -> DOCX (md2docx.mjs)
// -> PDF (LibreOffice headless, isolated profile) + one CSV per course + the evidence file for indicators 8 and 11
// -> one ZIP per order. Same chain as qualiopi-kit-content/scripts/build.mjs; no PDF code of our own.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// @ts-expect-error plain ESM module without types
import { markdownToDocx } from "./md2docx.mjs";
import { INSTRUMENTS, type CheckReport, type CheckedItem, type InstrumentKey } from "./check";
import { courseId, readOrder, type Order } from "./extract";
import { DraftSchema, type Draft } from "./lib/gen/schema";

const LETTERS = ["a", "b", "c", "d"];
const PUBLISHER = "READ FRANCE SAS";

/** Deterministic shuffle of the options (seed = order + item id), so the right answer is not always « a ». */
export function shuffledChoices(item: CheckedItem, seed: string): string[] {
  const choices = [...(item.choices ?? [])];
  let h = createHash("sha256").update(`${seed}:${item.id}`).digest();
  for (let i = choices.length - 1; i > 0; i--) {
    if (i >= h.length) h = createHash("sha256").update(h).digest();
    const j = h[i]! % (i + 1);
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }
  return choices;
}

const pts = (i: CheckedItem) => i.points ?? 1;
/** French typography: no-break space before « ? : ; ! % » and inside guillemets (no orphan « ? » at a line start). */
export const nbsp = (md: string) => md.replace(/ ([?:;!%»])/g, "\u00a0$1").replace(/« /g, "«\u00a0").replace(/(\d) (€|h\b)/g, "$1\u00a0$2");
const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\[/g, "(").replace(/\]/g, ")");
const answerText = (i: CheckedItem) => i.answer.split("|")[0]!;

function questionMd(i: CheckedItem, n: number, seed: string): string {
  if (i.type === "mcq") {
    const ch = shuffledChoices(i, seed);
    return `**${n}.** ${esc(i.question)}\n\n${ch.map((c, k) => `☐ ${LETTERS[k]}) ${esc(c)}`).join("  \n")}\n`;
  }
  return `**${n}.** ${esc(i.question)}\n\nRéponse : ………………………………………\n`;
}

function expected(i: CheckedItem, seed: string): string {
  if (i.type === "mcq") {
    const ch = shuffledChoices(i, seed);
    const k = ch.findIndex((c) => c === i.answer);
    return `${LETTERS[k]}) ${i.answer}`;
  }
  const alts = i.answer.split("|");
  return alts.length > 1 ? `${alts[0]} (accepté aussi : ${alts.slice(1).join(", ")})` : alts[0]!;
}

const header = (order: Order, d: Draft, what: string) =>
  `**Formation :** ${esc(d.title)} · **Document :** ${what} · **Version :** commande ${order.order_id}, ${new Date().toISOString().slice(0, 10).split("-").reverse().join("/")}\n\n`;

function learnerMd(order: Order, d: Draft, r: CheckReport, ins: (typeof INSTRUMENTS)[number]): string {
  const items = r.items.filter((i) => i.instrument === ins.key);
  const total = items.reduce((s, i) => s + pts(i), 0);
  const intro: Record<InstrumentKey, string> = {
    positioning: "Ce test sert à connaître vos acquis avant la formation, pour adapter le parcours. Il n’élimine personne : répondez sans documentation, « je ne sais pas » est une réponse utile. Durée indicative : 15 minutes.",
    final: "Cette évaluation mesure l’atteinte des objectifs de la formation. Répondez seul, sans documentation. Durée indicative : 20 minutes.",
    j30: "Un mois après la formation, cette évaluation vérifie ce que vous avez retenu et appliqué. Répondez seul, sans documentation. Durée indicative : 15 minutes.",
  };
  const parts = [
    `# ${ins.label}`,
    header(order, d, `${ins.label} (indicateur ${ins.indicator}), version stagiaire`),
    `> ${intro[ins.key]} Cochez une seule case par question à choix ; écrivez un seul mot quand c’est demandé.`,
    `| | |\n|---|---|\n| Nom, prénom | [ ] |\n| Date | [JJ/MM/AAAA] |\n| Session | [ ] |`,
    `## Questions (${items.length} questions, ${total} points)`,
    items.map((i, k) => questionMd(i, k + 1, order.order_id)).join("\n"),
  ];
  if (ins.key === "positioning") {
    parts.push(
      "## Autoévaluation (non notée)",
      `| Compétence visée | Je ne connais pas | J’ai des notions | Je pratique parfois | Je maîtrise |\n|---|---|---|---|---|\n${d.positioning.selfAssessment.map((s) => `| ${esc(s)} | ☐ | ☐ | ☐ | ☐ |`).join("\n")}`,
      "- Ce que j’attends de la formation : [ ]\n- Une situation de travail où je veux l’appliquer : [ ]\n- Besoin d’un aménagement pour suivre la formation ou passer les évaluations : ☐ non ☐ oui (le référent handicap vous contacte)",
    );
  }
  return parts.join("\n\n") + "\n";
}

function trainerMd(order: Order, d: Draft, r: CheckReport): string {
  const out: string[] = [
    `# Corrigés, barèmes et sources – ${esc(d.title)}`,
    header(order, d, "corrigés et sources, réservé au formateur"),
    `> Chaque question cite le passage de vos supports dont elle vient (fichier et page). Contrôles automatiques passés par chaque question : citation retrouvée mot pour mot dans vos supports ; pour les réponses en un mot, mot présent dans le passage cité et absent de l’énoncé ; bonne réponse présente une seule fois parmi les options ; pas de doublon avec une autre question de la formation. Relisez et validez chaque question avant usage : vous restez l’évaluateur.`,
    "## Objectifs évalués",
    d.objectives.map((o, k) => `${k + 1}. ${esc(o)}`).join("\n"),
    `*${esc(d.objectivesSource)}*`,
  ];
  for (const ins of INSTRUMENTS) {
    const items = r.items.filter((i) => i.instrument === ins.key);
    const total = items.reduce((s, i) => s + pts(i), 0);
    out.push(`## ${ins.label} (indicateur ${ins.indicator})`);
    out.push(`| N° | Obj. | Réponse attendue | Pts | Source (fichier, page) |\n|---|---|---|---|---|\n${items.map((i, k) => `| ${k + 1} | O${i.objective} | ${esc(expected(i, order.order_id))}${i.explanation ? ` – ${esc(i.explanation)}` : ""} | ${pts(i)} | ${esc(i.source ? `${i.source.file.split("/").pop()}, ${i.source.place}` : "?")} |`).join("\n")}\n| | | **Total** | **${total}** | |`);
    if (ins.key === "positioning") {
      const R = d.positioning.rule;
      out.push(
        "**Règle de décision, écrite avant de faire passer le test**",
        `| Résultat | Décision | Action et trace |\n|---|---|---|\n| Score < ${R.standard} % | Parcours standard avec points d’attention | Repérer les objectifs à 0 point et prévoir un accompagnement renforcé sur ces objectifs ; noter la décision dans la fiche de résultats |\n| ${R.standard} % ≤ score < ${R.light} % | Parcours standard | Aucune adaptation |\n| Score ≥ ${R.light} % | Parcours allégé ou approfondissement | Proposer d’alléger les séquences déjà maîtrisées (objectifs à 100 %) ou des exercices d’approfondissement ; ajuster la convention si la durée change |\n| Aménagement signalé | Étude avec le référent handicap | Votre procédure d’accueil des personnes en situation de handicap |`,
        `Prérequis : ${d.prerequisites.map(esc).join(" ; ")}. Le test ne sert donc pas à refuser une entrée en formation.`,
      );
    } else {
      const th = d[ins.key].threshold ?? 70;
      out.push(`**Seuil d’atteinte :** ${th} % des points au total, et au moins une bonne réponse par objectif. Un objectif sans bonne réponse est noté « non atteint » dans la fiche de résultats, quel que soit le total.`);
    }
    out.push(`**Passages cités**\n\n${items.map((i, k) => `${k + 1}. « ${esc(i.source_quote)} » (${esc(i.source ? `${i.source.file.split("/").pop()}, ${i.source.place}` : "?")})`).join("\n")}`);
  }
  return out.join("\n\n") + "\n";
}

function resultsSheetMd(order: Order, d: Draft, r: CheckReport): string {
  const by = (key: InstrumentKey, o: number) => r.items.filter((i) => i.instrument === key && i.objective === o).map((i) => r.items.filter((x) => x.instrument === key).indexOf(i) + 1);
  return [
    `# Fiche de résultats par stagiaire – ${esc(d.title)}`,
    header(order, d, "fiche de résultats (indicateurs 8 et 11), une par stagiaire"),
    "> Une fiche par participant, à classer dans son dossier. Elle relie chaque objectif aux questions qui l’évaluent, à l’entrée, en fin de formation et à J+30. Ne la confondez pas avec le questionnaire de satisfaction (indicateur 30).",
    "| | |\n|---|---|\n| Participant | [nom] |\n| Dates de la formation | [ ] |\n| Formateur | [nom] |",
    "## 1. Positionnement à l’entrée (indicateur 8)",
    "| Score | Décision | Informé le |\n|---|---|---|\n| [ ] / " + r.counts.positioning + " | ☐ standard avec points d’attention ☐ standard ☐ allégé ou approfondissement ☐ aménagement | [JJ/MM/AAAA] |",
    "## 2. Atteinte des objectifs (indicateur 11)",
    `| Objectif | Questions fin de formation | Résultat fin de formation | Questions J+30 | Résultat J+30 | Atteint ? |\n|---|---|---|---|---|---|\n${d.objectives.map((o, k) => `| ${k + 1}. ${esc(o)} | ${by("final", k + 1).join(", ")} | [ ] / ${by("final", k + 1).length} | ${by("j30", k + 1).join(", ")} | [ ] / ${by("j30", k + 1).length} | ☐ oui ☐ partiellement ☐ non |`).join("\n")}\n| **Total** | | [ ] / ${r.counts.final} | | [ ] / ${r.counts.j30} | |`,
    "## 3. Conclusion",
    "Synthèse : [ ]\n\nPréconisations : [ressources, suite de parcours]\n\nReporté sur l’attestation de fin de formation le [JJ/MM/AAAA]. Signature du formateur : [ ]",
  ].join("\n\n") + "\n";
}

function csvOf(order: Order, d: Draft, r: CheckReport): string {
  const q = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = ["formation", "instrument", "indicateur", "numero", "objectif", "type", "question", "choix_a", "choix_b", "choix_c", "choix_d", "bonne_reponse", "points", "source_fichier", "source_page", "passage_cite"];
  const rows = INSTRUMENTS.flatMap((ins) => r.items.filter((i) => i.instrument === ins.key).map((i, k) => {
    const ch = i.type === "mcq" ? shuffledChoices(i, order.order_id) : [];
    return [d.title, ins.label, ins.indicator, k + 1, `O${i.objective}`, i.type === "mcq" ? "choix unique" : "réponse courte (un mot)", i.question, ch[0], ch[1], ch[2], ch[3], i.type === "mcq" ? `${LETTERS[ch.indexOf(i.answer)]}) ${i.answer}` : i.answer.replace(/\|/g, " ou "), pts(i), i.source?.file.split("/").pop(), i.source?.place, i.source_quote];
  }));
  return "﻿" + [head, ...rows].map((r) => r.map(q).join(";")).join("\r\n") + "\r\n";
}

function evidenceMd(order: Order, courses: { d: Draft; r: CheckReport; files: string[] }[]): string {
  const nQ = courses.reduce((s, c) => s + c.r.items.length, 0);
  return [
    "# Dossier de preuves : indicateurs 8 et 11",
    `*Commande ${order.order_id} – ${esc(order.company)} – ${courses.length} formation(s), ${nQ} questions – produit par Acquimètre (${PUBLISHER}) le ${new Date().toISOString().slice(0, 10).split("-").reverse().join("/")}.*`,
    "> Ce dossier décrit les instruments d’évaluation de vos formations et la façon dont ils ont été construits. Présentez-le avec les tests passés et les fiches de résultats de vos stagiaires : c’est la trace de la mise en œuvre que l’auditeur regarde. Il ne vaut ni certification ni avis d’un certificateur.",
    "## Ce que demandent les indicateurs",
    "- **Indicateur 8** (critère 2) : le prestataire détermine les procédures de positionnement et d’évaluation des acquis à l’entrée de la prestation. Selon le décret n° 2026-728 du 1er août 2026 (en vigueur le 1er novembre 2026), il s’applique aux actions de formation et aux actions de formation par apprentissage, pas aux bilans de compétences ni à la VAE.\n- **Indicateur 11** (critère 3) : le prestataire évalue l’atteinte par les publics bénéficiaires des objectifs de la prestation.\n- Les évaluations de connaissances ci-dessous ne remplacent pas le recueil des appréciations (indicateur 30).",
    "## Instruments livrés",
    `| Formation | Objectifs | Positionnement (ind. 8) | Fin de formation (ind. 11) | J+30 (ind. 11) | Supports analysés |\n|---|---|---|---|---|---|\n${courses.map(({ d, r, files }) => `| ${courseId(d.course)} ${esc(d.title)} | ${d.objectives.length} | ${r.counts.positioning} questions + autoévaluation, règle de décision | ${r.counts.final} questions, seuil ${d.final.threshold ?? 70} % | ${r.counts.j30} questions, seuil ${d.j30.threshold ?? 70} % | ${files.map((f) => esc(f.split("/").pop()!)).join(", ")} |`).join("\n")}`,
    "## Correspondance objectifs ↔ questions",
    ...courses.map(({ d, r }) => `**${courseId(d.course)} ${esc(d.title)}**\n\n| Objectif | Positionnement | Fin de formation | J+30 |\n|---|---|---|---|\n${d.objectives.map((o, k) => `| ${k + 1}. ${esc(o)} | ${r.items.filter((i) => i.instrument === "positioning").map((i, n) => (i.objective === k + 1 ? n + 1 : null)).filter(Boolean).join(", ")} | ${r.items.filter((i) => i.instrument === "final").map((i, n) => (i.objective === k + 1 ? n + 1 : null)).filter(Boolean).join(", ")} | ${r.items.filter((i) => i.instrument === "j30").map((i, n) => (i.objective === k + 1 ? n + 1 : null)).filter(Boolean).join(", ")} |`).join("\n")}`),
    "## Méthode",
    "1. Extraction du texte de vos supports (PDF, DOCX, PPTX), page par page.\n2. Rédaction des questions à partir de ces textes, objectif par objectif, avec la citation exacte du passage source.\n3. Contrôles automatiques de chaque question : citation retrouvée dans vos supports, réponse en un mot présente dans le passage et absente de l’énoncé, une seule bonne option par question à choix, pas de doublon entre les trois évaluations.\n4. Barème et règles de décision fixés avant la passation (positionnement : adaptation du parcours ; fin de formation et J+30 : seuil par objectif).\n5. Validation par le formateur, ci-dessous, avant la première utilisation.",
    `Contrôles : ${nQ} questions sur ${nQ} ont passé tous les contrôles automatiques (détail par question dans les fichiers « corrigés, barèmes et sources »).`,
    "## Validation par l’organisme",
    `| Formation | Validé par (nom, fonction) | Date | Modifications apportées | Signature |\n|---|---|---|---|---|\n${courses.map(({ d }) => `| ${courseId(d.course)} ${esc(d.title)} | [ ] | [JJ/MM/AAAA] | [aucune / liste] | |`).join("\n")}`,
    "## Où classer ces documents",
    "Dans l’index par indicateur de votre dossier qualité : indicateur 8 pour les tests de positionnement et la règle de décision, indicateur 11 pour les évaluations de fin de formation et à J+30, et pour chaque stagiaire la fiche de résultats remplie.",
  ].join("\n\n") + "\n";
}

function readmeMd(order: Order, courses: { d: Draft }[]): string {
  return [
    "# Lisez-moi : vos évaluations Acquimètre",
    `*Commande ${order.order_id} – ${esc(order.company)}.*`,
    "## Contenu de l’archive",
    `- **dossier-preuves-indicateurs-8-11.pdf** : la synthèse à montrer à l’auditeur, avec le tableau de validation à signer.\n${courses.map(({ d }) => `- **${courseId(d.course)}-…** (${esc(d.title)}) : le test de positionnement, l’évaluation de fin de formation et l’évaluation à J+30 en version stagiaire (DOCX à modifier, PDF à imprimer), les corrigés avec les sources, la fiche de résultats par stagiaire, et un fichier CSV des questions à importer dans votre outil de quiz (séparateur point-virgule, UTF-8).`).join("\n")}`,
    "## Avant la première utilisation",
    "1. Relisez chaque question et sa source dans le fichier des corrigés. Modifiez librement les fichiers DOCX : ils sont à vous.\n2. Remplacez les objectifs par ceux de votre fiche programme s’ils diffèrent, et signez le tableau de validation du dossier de preuves.\n3. Une question vous paraît fausse ou hors sujet ? Répondez à l’e-mail de livraison dans les 30 jours : nous la remplaçons sans frais.",
    "## À savoir",
    "Les questions ont été rédigées par Octave, l’assistant IA de READ FRANCE SAS, à partir de vos seuls supports, puis contrôlées par programme. Aucune donnée de stagiaire n’a été traitée. Vos supports et cette archive sont supprimés de nos systèmes 90 jours après la livraison.",
  ].join("\n\n") + "\n";
}

/** Renders every checked course of an order and zips the deliverable. Returns the ZIP path. */
export async function renderOrder(dir: string, opts: { reports: CheckReport[] }): Promise<{ zip: string; files: string[]; sha256: string }> {
  const order = readOrder(dir);
  const outName = `acquimetre-evaluations-8-11-${order.order_id}`;
  const out = join(dir, "output", outName);
  rmSync(join(dir, "output"), { recursive: true, force: true });
  const md = join(dir, "output", "_md");
  const docx = join(dir, "output", "_docx");
  for (const d of [out, md, docx]) mkdirSync(d, { recursive: true });
  const docs: { name: string; md: string; title: string; landscape?: boolean; pdf: boolean; folder: string }[] = [];
  const courses: { d: Draft; r: CheckReport; files: string[] }[] = [];
  const footer = `Acquimètre – ${PUBLISHER} – commande ${order.order_id}`;
  for (const r of opts.reports) {
    if (!r.ok) throw new Error(`${courseId(r.course)} : contrôles non passés`);
    const d = DraftSchema.parse(JSON.parse(readFileSync(join(dir, "work", courseId(r.course), "draft.json"), "utf8")));
    const files = order.files.filter((f) => f.course === r.course).map((f) => f.file);
    courses.push({ d, r, files });
    const c = courseId(r.course);
    const folder = `${c}-${d.title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}`;
    INSTRUMENTS.forEach((ins, k) => docs.push({ name: `${c}-${k + 1}-${["positionnement", "fin-de-formation", "j30"][k]}-stagiaire`, title: `${ins.label} – ${d.title}`, md: learnerMd(order, d, r, ins), pdf: true, folder }));
    docs.push({ name: `${c}-4-corriges-baremes-sources`, title: `Corrigés et sources – ${d.title}`, md: trainerMd(order, d, r), pdf: true, folder });
    docs.push({ name: `${c}-5-fiche-resultats-stagiaire`, title: `Fiche de résultats – ${d.title}`, md: resultsSheetMd(order, d, r), landscape: true, pdf: true, folder });
    mkdirSync(join(out, folder), { recursive: true });
    writeFileSync(join(out, folder, `${c}-questions.csv`), csvOf(order, d, r));
  }
  docs.push({ name: "dossier-preuves-indicateurs-8-11", title: "Dossier de preuves : indicateurs 8 et 11", md: evidenceMd(order, courses), landscape: true, pdf: true, folder: "" });
  docs.push({ name: "00-lisez-moi", title: "Lisez-moi", md: readmeMd(order, courses), pdf: true, folder: "" });
  for (const doc of docs) {
    doc.md = nbsp(doc.md);
    writeFileSync(join(md, `${doc.name}.md`), doc.md);
    writeFileSync(join(docx, `${doc.name}.docx`), await markdownToDocx(doc.md, { title: doc.title, footerText: footer, landscape: doc.landscape, description: `Acquimètre – ${PUBLISHER}` }));
  }
  const soffice = ["soffice", "libreoffice"].find((b) => { try { execFileSync("which", [b], { stdio: "ignore" }); return true; } catch { return false; } });
  if (!soffice) throw new Error("LibreOffice (soffice) est requis pour les PDF");
  const profile = join(tmpdir(), `lo-profile-acquimetre-${process.pid}`);
  const pdfDir = join(dir, "output", "_pdf");
  mkdirSync(pdfDir, { recursive: true });
  execFileSync(soffice, [`-env:UserInstallation=file://${profile}`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", pdfDir, ...docs.filter((d) => d.pdf).map((d) => join(docx, `${d.name}.docx`))], { stdio: "pipe", timeout: 600_000 });
  rmSync(profile, { recursive: true, force: true });
  for (const doc of docs) {
    const dest = doc.folder ? join(out, doc.folder) : out;
    mkdirSync(dest, { recursive: true });
    if (doc.name !== "00-lisez-moi" && doc.name !== "dossier-preuves-indicateurs-8-11") cpSync(join(docx, `${doc.name}.docx`), join(dest, `${doc.name}.docx`));
    if (doc.name === "dossier-preuves-indicateurs-8-11") cpSync(join(docx, `${doc.name}.docx`), join(dest, `${doc.name}.docx`));
    if (!existsSync(join(pdfDir, `${doc.name}.pdf`))) throw new Error(`PDF manquant : ${doc.name}`);
    cpSync(join(pdfDir, `${doc.name}.pdf`), join(dest, `${doc.name}.pdf`));
  }
  const zip = join(dir, "output", `${outName}.zip`);
  execFileSync("find", [outName, "-exec", "touch", "-d", "2026-10-13T00:00:00Z", "{}", "+"], { cwd: join(dir, "output") });
  execFileSync("zip", ["-X", "-r", "-q", `${outName}.zip`, outName], { cwd: join(dir, "output") });
  const list = (p: string): string[] => readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(p, e.name)).map((x) => `${e.name}/${x}`) : [e.name]));
  const sha256 = createHash("sha256").update(readFileSync(zip)).digest("hex");
  writeFileSync(join(dir, "output", "manifest.json"), JSON.stringify({ order_id: order.order_id, zip: `${outName}.zip`, sha256, files: list(out).sort() }, null, 2) + "\n");
  return { zip, files: list(out).sort(), sha256 };
}
