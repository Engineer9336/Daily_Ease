"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { LANGS, t as tt, catName } from "@/lib/i18n";
import { api } from "@/lib/client";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export default function AppProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const [user, setUser] = useState(undefined); // undefined = still loading
  const setLang = useCallback((l) => {
    if (!LANGS[l]) return;
    setLangState(l);
    try { localStorage.setItem("de_lang", l); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = l === "hi" ? "hi" : "en";
  }, []);
  useEffect(() => {
    try { const l = localStorage.getItem("de_lang"); if (LANGS[l]) setLang(l); } catch {}
    api("auth/me").then((d) => setUser(d.user)).catch(() => setUser(null));
  }, [setLang]);
  const value = {
    lang, setLang, user, setUser,
    t: (k, v) => tt(lang, k, v),
    cat: (k) => catName(lang, k),
    err: (e) => tt(lang, e && e.key ? e.key : "err_server"),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
