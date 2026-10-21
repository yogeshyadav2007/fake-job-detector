const $ = (id) => document.getElementById(id);
const VERDICTS = {
  low: "Looks legitimate",
  medium: "Suspicious – be careful",
  high: "Likely a fake job",
};

// Runs inside the page; must be self-contained.
function extractPageText() {
  const sel = window.getSelection().toString().trim();
  if (sel.length > 200) return sel;
  const root = document.querySelector("main, [role=main], article") || document.body;
  return root.innerText.slice(0, 15000);
}

$("check").addEventListener("click", async () => {
  const button = $("check");
  button.disabled = true;
  $("status").textContent = "Analyzing…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText,
    });
    if (!text || text.trim().length < 80) {
      $("status").textContent = "Not enough text on this page to analyze.";
      return;
    }
    const r = await analyze(text);
    $("result").hidden = false;
    $("result").className = r.level;
    $("verdict").textContent = VERDICTS[r.level];
    $("fill").style.width = `${Math.round(r.score * 100)}%`;
    $("score").textContent = `Risk score ${Math.round(r.score * 100)}% (model ${Math.round(r.ml * 100)}%)`;
    $("flags").replaceChildren(
      ...r.flags.map((m) => Object.assign(document.createElement("li"), { textContent: m }))
    );
    $("status").textContent = "Tip: select the job description first for best accuracy.";
  } catch (e) {
    $("status").textContent = "Can't analyze this page (browser-internal pages and the Web Store are blocked).";
  } finally {
    button.disabled = false;
  }
});
