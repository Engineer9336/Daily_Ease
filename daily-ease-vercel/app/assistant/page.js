"use client";
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { answer, suggested } from "@/lib/assistant";

export default function Assistant() {
  const { t, lang } = useApp();
  const [msgs, setMsgs] = useState([]), [q, setQ] = useState(""), end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs]);
  function ask(text) {
    text = text.trim(); if (!text) return;
    const a = answer(text, lang);
    setMsgs((m) => [...m, { r: "user", t: text }, { r: "bot", t: a.answer || t("assistant_fallback") }]); setQ("");
  }
  return (
    <>
      <h1>💬 {t("assistant_title")}</h1>
      <p className="m">{t("assistant_intro")}</p>
      <div className="chat" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={"bubble " + (m.r === "user" ? "user" : "")}>{m.t}</div>)}<div ref={end} />
      </div>
      <b>{t("assistant_suggest")}</b>
      <div className="row">{suggested(lang).map((s) => <button key={s} className="btn ghost sm" onClick={() => ask(s)}>{s}</button>)}</div>
      <form className="row" style={{ flexWrap: "nowrap", marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input aria-label={t("assistant_input")} placeholder={t("assistant_input")} value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} />
        <button className="btn">{t("send")}</button>
      </form>
    </>
  );
}
