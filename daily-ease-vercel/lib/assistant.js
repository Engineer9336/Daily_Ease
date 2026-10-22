// FAQ assistant: keyword scoring over a tri-lingual FAQ list (runs fully client-side).
const data = require("./faqs.json");

const TOKEN = /[^\s.,!?;:()"'।]+/g;

function score(text, tokens, kws) {
  let s = 0;
  for (const raw of kws) {
    const kw = raw.toLowerCase();
    if ((kw.includes(" ") && text.includes(kw)) || tokens.has(kw)) s += 2 + kw.split(" ").length;
  }
  return s;
}

/** Returns { answer, id } — id is null when nothing matched. */
function answer(query, lang = "en") {
  const text = String(query || "").toLowerCase().trim();
  const tokens = new Set(text.match(TOKEN) || []);
  let best = null, bestScore = 0;
  for (const f of data.faqs) {
    let s = score(text, tokens, f.kws);
    if (Object.values(f.texts).some((t) => t[0].toLowerCase() === text)) s += 100;
    if (s > bestScore) { best = f; bestScore = s; }
  }
  if (!best) return { answer: "", id: null };
  return { answer: (best.texts[lang] || best.texts.en)[1], id: best.id };
}

function suggested(lang) {
  return data.suggested.map((id) => {
    const f = data.faqs.find((x) => x.id === id);
    return (f.texts[lang] || f.texts.en)[0];
  });
}
module.exports = { answer, suggested, FAQS: data.faqs };
