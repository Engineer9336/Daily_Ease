"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/client";

export default function Login() {
  const { t, err, setUser, setLang } = useApp(), router = useRouter();
  const [f, setF] = useState({ email: "", password: "" }), [e, setE] = useState(""), [busy, setBusy] = useState(false);
  async function submit(ev) {
    ev.preventDefault(); setBusy(true); setE("");
    try {
      const { user } = await api("auth/login", "POST", f);
      setUser(user); if (user.language) setLang(user.language);
      router.push({ customer: "/find", worker: "/worker", admin: "/admin" }[user.role]);
    } catch (x) { setE(err(x)); } finally { setBusy(false); }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>{t("nav_login")}</h2>
      <label htmlFor="em">{t("email")}</label>
      <input id="em" type="email" autoComplete="email" required value={f.email} onChange={(x) => setF({ ...f, email: x.target.value })} />
      <label htmlFor="pw">{t("password")}</label>
      <input id="pw" type="password" autoComplete="current-password" required value={f.password} onChange={(x) => setF({ ...f, password: x.target.value })} />
      {e && <div className="msg err" role="alert">{e}</div>}
      <div className="row"><button className="btn" disabled={busy}>{t("login_btn")}</button></div>
    </form>
  );
}
