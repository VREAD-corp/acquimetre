// Acquimètre public site: page bodies (French). Facts are dated and sourced; the sample is real (samples/gestion-temps).
export const BRAND = 'Acquimètre';
export const SITE_ORIGIN = 'https://outils.vread.fr';
export const SITE_BASE = '/acquimetre/';
export const SITE = SITE_ORIGIN + SITE_BASE;
export const CONTACT = 'octave@vread.fr';
export const TERMS_VERSION = 'cgv-pro-eval-2026-10-13';
export const TERMS_DATE = '13 octobre 2026';
export const UPDATED = '2026-10-13';
export const SELLER = {
  name: 'READ FRANCE SAS',
  form: 'société par actions simplifiée (SAS)',
  capital: '1 000 €',
  address: '11 rue Rouvet, 75019 Paris, France',
  siren: '988 741 773',
  rcs: 'RCS Paris 988 741 773',
  president: 'Tanguy Warsmann',
};
export const ICPF_URL = 'https://certif-icpf.org/articles/non-conformites-les-plus-frequentes-audit-qualiopi';
export const KIT_URL = 'https://outils.vread.fr/kit-qualiopi-v10/';
export const SAMPLE_SOURCE = 'https://fr.wikiversity.org/wiki/Gestion_professionnelle_du_temps';

const eur = (cents) => `${String(cents / 100).replace('.', ',')} €`;

/** Home page: the offer, the sample, the price, the process, the limits, the FAQ. */
export function homeBody(p) {
  const { full, kit, sample, open } = p;
  const cta = open
    ? `<a class="btn btn-primary" href="commander.html">Commander : ${eur(full)} net</a>`
    : `<a class="btn btn-primary" href="mailto:${CONTACT}?subject=Acquim%C3%A8tre">Écrire pour réserver</a>`;
  return `
<section class="hero" id="haut">
  <div class="wrap">
    <p class="kicker">Qualiopi, indicateurs 8 et 11</p>
    <h1>Vos tests de positionnement et vos évaluations de fin de formation, rédigés à partir de vos supports de cours</h1>
    <p class="lead">Vous déposez les supports de vos formations (PDF, Word ou PowerPoint). Sous 5 jours ouvrés, vous recevez pour chacune un test de positionnement, une évaluation de fin de formation et une évaluation à J+30, avec corrigés, barèmes et, pour chaque question, la page de votre support dont elle vient. ${eur(full)} net pour 1 à 10 formations.</p>
    <div class="ctas">${cta}<a class="btn btn-ghost" href="#exemple">Voir l’exemple complet</a></div>
    <p class="small muted">Vente aux organismes immatriculés en France (SIREN). TVA non applicable, art. 293 B du CGI. Acheteurs du <a href="${KIT_URL}">Kit Qualiopi</a> : ${eur(kit)}.</p>
  </div>
</section>

<section class="block" id="pourquoi">
  <div class="wrap">
    <h2>Le positionnement à l’entrée fait partie des écarts les plus relevés en audit</h2>
    <p>En 2024, le certificateur ICPF a réalisé 4 554 audits Qualiopi ; 1 806 ont relevé au moins une non-conformité. L’indicateur 8 (positionnement et évaluation des acquis à l’entrée) en a causé 269, soit 15 % de ces audits (<a href="${ICPF_URL}">article d’ICPF, consulté le 13/10/2026</a>).</p>
    <p>Le référentiel en vigueur au 1er novembre 2026 (décret n° 2026-728 du 1er août 2026) garde les deux exigences sous les mêmes numéros : déterminer le positionnement à l’entrée (indicateur 8, actions de formation et apprentissage) et évaluer l’atteinte des objectifs (indicateur 11). Un modèle vide ne suffit pas à l’auditeur : il veut voir, formation par formation, le test, le barème et la règle de décision, puis les résultats des stagiaires.</p>
    <div class="fact"><p><strong>Ce qui prend du temps, c’est le contenu.</strong> Écrire 25 à 35 questions tirées d’un cours, avec les bonnes réponses, les pièges plausibles et le lien à chaque objectif, demande plusieurs heures par formation. C’est ce travail que nous faisons à partir de vos propres supports.</p></div>
  </div>
</section>

<section class="block" id="contenu">
  <div class="wrap">
    <h2>Ce que vous recevez pour chaque formation</h2>
    <div class="grid3">
      <div class="card"><h3>Test de positionnement</h3><p>8 à 12 questions sur les objectifs du programme, une autoévaluation et une règle de décision écrite d’avance (parcours standard, allégé, aménagement). Indicateur 8.</p></div>
      <div class="card"><h3>Évaluation de fin de formation</h3><p>12 à 20 questions, au moins deux par objectif, avec un seuil d’atteinte par objectif et au total. Indicateur 11.</p></div>
      <div class="card"><h3>Évaluation à J+30</h3><p>8 à 12 questions de mise en situation, différentes de celles de fin de formation, pour vérifier ce qui reste un mois après. Indicateur 11, à ne pas confondre avec le questionnaire de satisfaction à froid (indicateur 30).</p></div>
    </div>
    <p>Avec, pour chaque formation : les corrigés et barèmes réservés au formateur, avec le passage cité et sa page ; une fiche de résultats par stagiaire qui relie chaque objectif à ses questions ; un fichier CSV des questions à importer dans votre outil de quiz. Pour la commande : un dossier de preuves indicateurs 8 et 11 (PDF) avec le tableau de validation à signer.</p>
    <p>Les fichiers sont des DOCX que vous modifiez librement, avec leur version PDF. Les questions sont à choix unique ou à réponse en un mot : la correction se fait sans hésitation, à la main ou dans votre outil.</p>
  </div>
</section>

<section class="block" id="exemple">
  <div class="wrap">
    <h2>L’exemple complet, sur un vrai cours</h2>
    <p>Nous avons traité la leçon « <a href="${SAMPLE_SOURCE}">Gestion professionnelle du temps</a> » de Wikiversité (10 chapitres, ${sample.words} mots, licence CC BY-SA 4.0), mise en page comme un support de cours. L’archive ci-dessous est exactement ce qu’un client reçoit : ${sample.questions} questions pour une formation, ${sample.files} fichiers.</p>
    <ul class="dl">
      <li><a href="exemple/${sample.zip}" data-mesure="free_download">Archive complète (ZIP, ${sample.zipKb} Ko)</a> <span class="muted small">DOCX, PDF et CSV</span></li>
      <li><a href="exemple/dossier-preuves-indicateurs-8-11.pdf" data-mesure="free_download">Dossier de preuves indicateurs 8 et 11 (PDF)</a></li>
      <li><a href="exemple/C01-1-positionnement-stagiaire.pdf" data-mesure="free_download">Test de positionnement, version stagiaire (PDF)</a></li>
      <li><a href="exemple/C01-2-fin-de-formation-stagiaire.pdf" data-mesure="free_download">Évaluation de fin de formation, version stagiaire (PDF)</a></li>
      <li><a href="exemple/C01-4-corriges-baremes-sources.pdf" data-mesure="free_download">Corrigés, barèmes et passages cités (PDF)</a></li>
      <li><a href="exemple/support-gestion-professionnelle-du-temps.pdf">Le support de cours utilisé (PDF, 22 pages)</a></li>
    </ul>
    <p class="small muted">Source : Wikiversité, leçon « Gestion professionnelle du temps », contributeurs de Wikiversité, révisions du 9 avril 2016 au 10 juillet 2026 extraites le 13/10/2026, licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a>. Le support et les évaluations de l’exemple sont diffusés sous la même licence. Les objectifs du cours ont été reformulés pour être évaluables ; la durée et le public de la fiche programme sont des valeurs d’exemple.</p>
  </div>
</section>

<section class="block" id="deroulement">
  <div class="wrap">
    <h2>Comment se passe une commande</h2>
    <ol class="steps">
      <li><strong>Vous payez en ligne</strong> par carte (Stripe). La facture acquittée arrive par e-mail avec un lien d’envoi personnel.</li>
      <li><strong>Vous déposez vos supports</strong> sur ce lien : pour chaque formation, le programme (objectifs, prérequis) et le support remis aux stagiaires. PDF, DOCX ou PPTX, 15 Mo par fichier, 40 fichiers au plus. Retirez les noms et résultats de stagiaires : ils ne servent pas.</li>
      <li><strong>Nous rédigeons.</strong> Le délai de 5 jours ouvrés part du clic sur « J’ai tout envoyé ». La date de livraison s’affiche à ce moment et vous est confirmée par e-mail.</li>
      <li><strong>Vous recevez l’archive par e-mail</strong>, relisez, modifiez si besoin et signez le tableau de validation. Une question fausse ou hors sujet est remplacée sans frais si vous la signalez dans les 30 jours.</li>
    </ol>
  </div>
</section>

<section class="block" id="prix">
  <div class="wrap">
    <h2>Prix</h2>
    <div class="grid2">
      <div class="card"><p class="price">${eur(full)} <span class="small muted">net</span></p><p>De 1 à 10 formations, en une commande. Soit 24,90 € par formation pour 10 formations. Paiement unique, pas d’abonnement.</p>${open ? '<p><a class="btn btn-primary btn-sm" href="commander.html">Commander</a></p>' : ''}</div>
      <div class="card"><p class="price">${eur(kit)} <span class="small muted">net</span></p><p>Même prestation pour les organismes qui ont acheté le Kit Qualiopi : saisissez le code reçu dans l’e-mail de livraison du kit, ou déclarez l’avoir acheté.</p>${open ? '<p><a class="btn btn-ghost btn-sm" href="commander.html?offre=kit">Commander au tarif kit</a></p>' : ''}</div>
    </div>
    <p class="small muted">TVA non applicable, art. 293 B du CGI : le prix affiché est le prix payé. Vente aux professionnels uniquement (SIREN demandé). Conditions : <a href="cgv-pro.html">CGV professionnels</a>.</p>
  </div>
</section>

<section class="block" id="limites">
  <div class="wrap">
    <h2>Ce que le service ne fait pas</h2>
    <ul>
      <li>Il ne certifie rien et ne garantit pas le résultat de votre audit. Le dossier décrit vos instruments ; c’est leur usage avec vos stagiaires que l’auditeur examine.</li>
      <li>Il n’évalue pas les gestes pratiques. Pour une formation où l’objectif est un savoir-faire observé (geste, conduite d’entretien), complétez par votre grille d’observation : la fiche de résultats a une ligne pour la noter.</li>
      <li>Il ne lit pas les supports scannés (images sans texte). Si un fichier est illisible, nous vous l’écrivons dans les 2 jours ouvrés, avant de commencer.</li>
      <li>Il ne fait pas passer les tests : vous les utilisez sur papier ou dans votre outil (le CSV s’importe dans la plupart des outils de quiz).</li>
    </ul>
    <p>Les questions sont rédigées par Octave, l’assistant IA de READ FRANCE SAS, à partir de vos seuls supports, puis contrôlées par programme : chaque citation doit être retrouvée mot pour mot dans vos fichiers, chaque réponse en un mot doit figurer dans le passage cité et pas dans l’énoncé, et aucune question ne doit doubler une autre. Le formateur relit et valide avant usage : c’est lui l’évaluateur.</p>
  </div>
</section>

<section class="block" id="confidentialite">
  <div class="wrap">
    <h2>Vos supports</h2>
    <p>Ils sont rangés dans un dossier privé par commande, que seul le compte de READ FRANCE SAS qui traite les commandes peut ouvrir. Ils servent uniquement à rédiger vos évaluations : pas de réutilisation pour d’autres clients, pas d’entraînement d’un modèle d’IA. Ils sont supprimés 90 jours après la livraison, avec l’archive livrée ; la facture est conservée 10 ans. En commandant, vous attestez avoir le droit de nous transmettre ces supports.</p>
  </div>
</section>

<section class="block" id="questions">
  <div class="wrap">
    <h2>Questions fréquentes</h2>
    <details id="q-kit"><summary>J’ai déjà le Kit Qualiopi : qu’est-ce que cela ajoute ?</summary><p>Le kit donne les trames (T04 fiche de positionnement, T29 test avec barème, T06 suivi et évaluation des acquis). Il ne peut pas contenir les questions de vos formations. Acquimètre remplit ces trames avec des questions tirées de vos supports. Les acheteurs du kit paient ${eur(kit)}.</p></details>
    <details id="q-formations"><summary>Que compte une « formation » ?</summary><p>Un programme avec ses objectifs et son support, quelle que soit sa durée. Deux sessions du même programme comptent pour une formation. Un parcours très long (plus de 200 pages de support) peut être découpé en deux formations : nous vous le proposons avant de commencer.</p></details>
    <details id="q-objectifs"><summary>Mes objectifs de programme sont flous. Comment faites-vous ?</summary><p>Nous les reformulons en objectifs évaluables à partir du plan de votre support, et nous l’indiquons dans les corrigés. Vous les gardez ou les remplacez par ceux de votre fiche programme avant de signer le tableau de validation.</p></details>
    <details id="q-delai"><summary>Et si la livraison dépasse 5 jours ouvrés ?</summary><p>Vous pouvez demander le remboursement intégral si l’archive n’est pas livrée 10 jours ouvrés après votre envoi complet (article 6 des CGV).</p></details>
    <details id="q-satisfaction"><summary>L’évaluation à J+30 remplace-t-elle mon questionnaire de satisfaction à froid ?</summary><p>Non. Elle mesure les connaissances (indicateur 11). Le recueil des appréciations relève de l’indicateur 30, que ICPF cite comme première cause de non-conformité en 2024 (802 non-conformités). Gardez les deux.</p></details>
    <details id="q-format"><summary>Puis-je modifier les questions ?</summary><p>Oui. Les DOCX et le CSV vous appartiennent pour votre activité : modifiez, retirez, ajoutez. Seule la revente des évaluations comme produit est exclue.</p></details>
  </div>
</section>

<section class="block" id="commander-bas">
  <div class="wrap">
    <h2>Commander</h2>
    <p>${open ? `Paiement par carte, facture immédiate, lien d’envoi des supports par e-mail. <a class="btn btn-primary btn-sm" href="commander.html">Commander pour ${eur(full)}</a>` : `Les commandes ouvrent bientôt. Écrivez à <a href="mailto:${CONTACT}">${CONTACT}</a> pour réserver un créneau.`}</p>
    <p class="small muted">Une question avant de commander ? Écrivez à <a href="mailto:${CONTACT}">${CONTACT}</a> : réponse sous 1 jour ouvré.</p>
  </div>
</section>`;
}

/** Order page body (Stripe Payment Element; same field names and ids as octave-checkout gas/web/index.html). */
export function commanderBody(p) {
  const { full, kit } = p;
  return `<section class="wrap" aria-labelledby="commander-h">
<h1 id="commander-h">Commander Acquimètre</h1>
<p>Évaluations Qualiopi indicateurs 8 et 11 pour 1 à 10 formations, rédigées à partir de vos supports. Vente réservée aux professionnels (entreprises immatriculées en France, SIREN obligatoire). Après le paiement, vous recevez la facture et le lien d’envoi de vos supports ; la livraison a lieu sous 5 jours ouvrés après votre envoi complet.</p>
<form id="octave-pay" class="checkout-form card" novalidate>
  <fieldset class="field-group"><legend>Tarif</legend>
    <label class="offer-choice"><input type="radio" name="product" value="eval-8-11" checked><span><strong>Tarif standard</strong> : <span data-price-for="eval-8-11">${eur(full)} net (TVA non applicable, art. 293 B du CGI)</span></span></label>
    <label class="offer-choice"><input type="radio" name="product" value="eval-8-11-kit"><span><strong>Acheteurs du Kit Qualiopi</strong> : <span data-price-for="eval-8-11-kit">${eur(kit)} net (TVA non applicable, art. 293 B du CGI)</span></span></label>
    <p class="small muted">Prix retenu : <span id="product-price">${eur(full)} net (TVA non applicable, art. 293 B du CGI)</span></p>
  </fieldset>
  <div id="kit-proof" class="field-group" hidden>
    <label class="field"><span>Code reçu dans l’e-mail de livraison du Kit Qualiopi (facultatif)</span>
      <input type="text" name="kitCode" data-octave-extra maxlength="20" autocomplete="off"></label>
    <label class="check"><input type="checkbox" name="kitDeclared" data-octave-extra="bool"><span>Sans code : je déclare que l’entreprise ci-dessous a acheté le Kit Qualiopi V10. En cas de déclaration inexacte, la différence de 50 € pourra être facturée (CGV, article 4).</span></label>
  </div>
  <label class="field"><span>Nombre de formations à traiter (1 à 10)</span>
    <input type="number" name="courses" data-octave-extra min="1" max="10" step="1" value="3" required></label>
  <label class="field"><span>E-mail professionnel (facture, lien d’envoi des supports, livraison)</span>
    <input type="email" name="email" autocomplete="email" required maxlength="254"></label>
  <label class="field"><span>Raison sociale</span>
    <input type="text" name="company" autocomplete="organization" required minlength="2" maxlength="200"></label>
  <label class="field"><span>SIREN (9 chiffres)</span>
    <input type="text" name="siren" inputmode="numeric" required pattern="\\s*(\\d\\s*){9}" maxlength="11" aria-describedby="siren-help"></label>
  <p id="siren-help" class="small muted">Le numéro est contrôlé (clé de Luhn) avant tout paiement.</p>
  <fieldset class="field-group"><legend>Adresse de facturation (figure sur la facture)</legend>
    <label class="field"><span>Adresse</span>
      <input type="text" name="addressLine1" autocomplete="address-line1" required minlength="3" maxlength="200"></label>
    <label class="field"><span>Complément d’adresse (facultatif)</span>
      <input type="text" name="addressLine2" autocomplete="address-line2" maxlength="200"></label>
    <label class="field"><span>Code postal</span>
      <input type="text" name="postalCode" autocomplete="postal-code" inputmode="numeric" required pattern="\\s*\\d{5}\\s*" maxlength="7"></label>
    <label class="field"><span>Ville</span>
      <input type="text" name="city" autocomplete="address-level2" required maxlength="100"></label>
    <p class="small muted">Pays : France.</p>
  </fieldset>
  <label class="check"><input type="checkbox" name="rightsAttested" data-octave-extra="bool" required>
    <span>J’atteste que l’entreprise détient les droits sur les supports qu’elle va transmettre, ou l’autorisation de les faire traiter, et qu’ils ne contiendront pas de données personnelles de stagiaires (noms, résultats, coordonnées).</span></label>
  <label class="check"><input type="checkbox" name="terms" required>
    <span>Je commande au nom et pour le compte de l’entreprise ci-dessus, pour un usage professionnel, et j’accepte les <a id="terms-link" href="cgv-pro.html" target="_blank" rel="noopener">conditions générales de vente aux professionnels</a> (version du ${TERMS_DATE}).</span></label>
  <p id="payment-loading" class="small muted" role="status">Chargement du paiement sécurisé…</p>
  <div id="payment-element"></div>
  <p id="pay-error" class="status err" role="alert" hidden></p>
  <button type="submit" id="pay-button" class="pay-button" disabled>Payer ${eur(full)} et recevoir le lien d’envoi</button>
  <p class="small muted">Paiement sécurisé par carte bancaire avec Stripe : vos données de carte sont saisies dans un cadre Stripe et ne transitent pas par nos serveurs.</p>
  <noscript><p class="status err">Le paiement nécessite JavaScript.</p></noscript>
</form>
</section>`;
}

export function commandeBody() {
  return `<section class="wrap">
<h1>Votre commande</h1>
<p id="order-status" class="status" role="status" aria-live="polite">Confirmation du paiement…</p>
<p id="order-help" class="muted"></p>
<div id="upload-next" class="card" hidden>
  <h2>Étape suivante : vos supports de cours</h2>
  <p>Le même lien vous a été envoyé par e-mail avec la facture. Vous pouvez déposer vos fichiers maintenant ou plus tard.</p>
  <p><a id="upload-link" class="btn btn-primary" href="envoyer.html">Déposer mes supports</a></p>
</div>
</section>`;
}

export function envoyerBody() {
  const rows = Array.from({ length: 10 }, (_, i) => `  <div class="course-row" data-course="${i + 1}">
    <strong>Formation ${i + 1}</strong>
    <label class="field"><span class="small">Intitulé</span><input type="text" data-course-title="${i + 1}" maxlength="120" autocomplete="off"></label>
    <label class="field"><span class="small">Fichiers (PDF, DOCX, PPTX)</span><input type="file" multiple accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"></label>
  </div>`).join('\n');
  return `<section class="wrap" aria-labelledby="envoyer-h">
<h1 id="envoyer-h">Envoyer vos supports de cours</h1>
<p id="upload-loading" class="status" role="status">Chargement de votre commande…</p>
<div id="upload-app" hidden>
  <p>Commande <strong id="upload-order"></strong> pour <strong id="upload-company"></strong>. Pour chaque formation (10 au plus) : le programme (objectifs, prérequis) et le support remis aux stagiaires. 15 Mo par fichier. Retirez les données de stagiaires.</p>
  <p id="upload-state" class="status" role="status" tabindex="-1" hidden></p>
  <h2>Fichiers reçus</h2>
  <p id="upload-count" class="small muted"></p>
  <ul id="upload-files"></ul>
  <form id="upload-form" class="card" novalidate>
${rows}
    <p id="upload-progress" class="status" role="status" hidden></p>
    <p id="upload-error" class="status err" role="alert" hidden></p>
    <p><button type="submit" id="upload-send" class="pay-button">Envoyer les fichiers choisis</button></p>
  </form>
  <p><button type="button" id="upload-done" class="btn btn-primary" disabled>J’ai tout envoyé</button></p>
  <p class="small muted">Le délai de livraison de 5 jours ouvrés part de ce clic. Un fichier oublié ? Revenez sur ce lien, ajoutez-le, puis cliquez de nouveau : la date est recalculée. Vos fichiers sont rangés dans un dossier privé et supprimés 90 jours après la livraison.</p>
</div>
</section>`;
}
