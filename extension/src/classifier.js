// Scores job-posting text: TF-IDF logistic regression (model/model.json) blended
// with hand-written red-flag rules. Runs fully on-device.

const RED_FLAGS = [
  { re: /\b(wire transfer|western union|moneygram|gift cards?|bitcoin|crypto(currency)? payment)\b/i, msg: "Mentions unusual payment methods", w: 0.35 },
  { re: /\b(registration|training|processing|application|starter kit|equipment) (fee|deposit|cost)\b|\bpay (a|an|the) (fee|deposit)\b|\bsend (us )?money\b/i, msg: "Asks you to pay a fee or deposit", w: 0.4 },
  { re: /\b(no experience (needed|required|necessary)|no interview|hired immediately|immediate start)\b/i, msg: "Promises easy hiring with no experience or interview", w: 0.2 },
  { re: /\b(earn|make)\s+\$?\d[\d,]*\s*(\/|per|a)\s*(day|hour|week)\b|\bguaranteed (income|salary|pay)\b|\bunlimited (earning|income)\b/i, msg: "Unrealistic or guaranteed earnings", w: 0.25 },
  { re: /\b(whatsapp|telegram|signal)\b/i, msg: "Directs you to WhatsApp/Telegram", w: 0.25 },
  { re: /\b[a-z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|aol)\.com\b/i, msg: "Uses a free personal email address", w: 0.2 },
  { re: /\b(ssn|social security number|bank account (number|details)|passport (copy|number)|credit card)\b/i, msg: "Requests sensitive personal or financial data", w: 0.3 },
  { re: /\b(act now|urgent(ly)? (hiring|need)|limited (spots|positions)|apply (today|immediately))\b/i, msg: "Uses urgency / pressure language", w: 0.1 },
  { re: /\b(reshipping|re-shipping|check processing|mystery shopper|package forwarding)\b/i, msg: "Matches a common scam job type", w: 0.3 },
];

// scikit-learn's English stop word list is what the model was trained with; terms
// missing from model.vocab are ignored anyway, so only common words matter here.
const STOP = new Set(
  "a about above after again all am an and any are as at be because been before being below between both but by can did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who why will with you your".split(" ")
);

let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = fetch(chrome.runtime.getURL("model/model.json")).then((r) => r.json());
  }
  return modelPromise;
}

// Must stay in sync with clean() and the vectorizer token pattern in training/train_model.py
function tokenize(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, " url ")
    .replace(/[^a-z0-9$@ ]+/g, " ");
  return (cleaned.match(/[a-z0-9$@]{2,}/g) || []).filter((t) => !STOP.has(t));
}

function mlProbability(model, text) {
  const counts = new Map();
  for (const t of tokenize(text)) {
    const i = model.vocab[t];
    if (i !== undefined) counts.set(i, (counts.get(i) || 0) + 1);
  }
  let norm = 0;
  const weights = [];
  for (const [i, c] of counts) {
    const w = (1 + Math.log(c)) * model.idf[i];
    weights.push([i, w]);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  let z = model.intercept;
  for (const [i, w] of weights) z += (w / norm) * model.coef[i];
  return 1 / (1 + Math.exp(-z));
}

async function analyze(text) {
  const model = await loadModel();
  const ml = mlProbability(model, text);
  const flags = RED_FLAGS.filter((f) => f.re.test(text));
  const ruleBoost = Math.min(0.6, flags.reduce((s, f) => s + f.w, 0));
  const score = Math.min(1, 0.6 * ml + ruleBoost);
  const level = score >= 0.6 ? "high" : score >= 0.35 ? "medium" : "low";
  return { score, ml, level, flags: flags.map((f) => f.msg) };
}

if (typeof module !== "undefined") module.exports = { tokenize, mlProbability };
