"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/client";

export default function Register() {
  const { t, err, lang } = useApp(), router = useRouter();
  const [f, setF] = useState({ role: "customer", name: "", email: "", phone: "", password: "", password2: "" });
  const [e, setE] = useState(""), [ok, setOk] = useState(""), [busy, setBusy] = useState(false);
  const set = (k) => (x) => setF({ ...f, [k]: x.target.value });
  async function submit(ev) {
    ev.preventDefault(); setE(""); setOk("");
    if (f.password !== f.password2) return setE(t("err_password_mismatch"));
    setBusy(true);
    try {
      await api("auth/register", "POST", { ...f, language: lang });
      setOk(t("ok_account_created")); setTimeout(() => router.push("/login"), 900);
    } catch (x) { setE(err(x)); } finally { setBusy(false); }
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2>{t("nav_register")}</h2>
      <label>{t("i_am")}</label>
      <div className="row">
        {["customer", "worker"].map((r) => (
          <label key={r} className="checkbox"><input type="radio" name="role" checked={f.role === r} onChange={() => setF({ ...f, role: r })} />{t(r)}</label>
        ))}
      </div>
      <label htmlFor="nm">{t("full_name")}</label><input id="nm" required maxLength={80} value={f.name} onChange={set("name")} />
      <label htmlFor="em">{t("email")}</label><input id="em" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
      <label htmlFor="ph">{t("phone")}</label><input id="ph" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
      <label htmlFor="pw">{t("password")}</label><input id="pw" type="password" minLength={8} maxLength={72} required autoComplete="new-password" value={f.password} onChange={set("password")} />
      <label htmlFor="pw2">↻ {t("password")}</label><input id="pw2" type="password" required autoComplete="new-password" value={f.password2} onChange={set("password2")} />
      {e && <div className="msg err" role="alert">{e}</div>}
      {ok && <div className="msg ok">{ok}</div>}
      <div className="row"><button className="btn" disabled={busy}>{t("create_account")}</button></div>
    </form>
  );
}
