// English / Hindi / Hinglish strings (data in i18n.json).
const data = require("./i18n.json");
const LANGS = data.langs;           // { en: "English", hi: "हिन्दी", hinglish: "Hinglish" }
const CATS = data.cats;

function t(lang, key, vars) {
  let s = (data.t[lang] && data.t[lang][key]) || data.t.en[key] || key;
  if (vars) for (const k of Object.keys(vars)) s = s.split("{" + k + "}").join(String(vars[k]));
  return s;
}
const catName = (lang, key) => (CATS[key] && (CATS[key][lang] || CATS[key].en)) || key;
module.exports = { LANGS, CATS, t, catName, data };
