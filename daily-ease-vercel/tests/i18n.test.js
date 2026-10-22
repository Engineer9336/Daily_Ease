const { test } = require("node:test");
const assert = require("node:assert/strict");
const { data, LANGS, t, catName } = require("../lib/i18n");
const A = require("../lib/assistant");
const CATEGORIES = require("../lib/categories");
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");

test("all three languages have identical, non-empty keys and matching placeholders", () => {
  assert.deepEqual(Object.keys(LANGS), ["en", "hi", "hinglish"]);
  const keys = Object.keys(data.t.en);
  for (const l of Object.keys(LANGS)) {
    assert.deepEqual(Object.keys(data.t[l]).sort(), [...keys].sort(), l);
    for (const k of keys) { assert.ok(data.t[l][k].trim(), `${l}.${k}`); assert.equal(ph(data.t[l][k]), ph(data.t.en[k]), `${l}.${k}`); }
  }
  assert.equal(t("hi", "welcome", { name: "आर्यन" }), "स्वागत है, आर्यन!");
});

test("every category is translated", () => {
  for (const c of CATEGORIES) for (const l of Object.keys(LANGS)) assert.ok(catName(l, c) && catName(l, c) !== c || l === "en", c);
});

test("assistant answers in all languages", () => {
  for (const l of Object.keys(LANGS)) {
    for (const f of A.FAQS) assert.ok(f.texts[l] && f.texts[l][0] && f.texts[l][1], `${f.id}.${l}`);
    for (const q of A.suggested(l)) assert.ok(A.answer(q, l).id, q);
  }
  assert.equal(A.answer("service kaise book karein", "hinglish").id, "book");
  assert.equal(A.answer("भुगतान कैसे होता है", "hi").id, "payment");
  assert.equal(A.answer("how do I cancel", "en").id, "cancel");
  assert.equal(A.answer("asdfgh qwerty", "en").id, null);
});
