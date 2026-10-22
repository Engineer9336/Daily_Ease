"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "./AppProvider";
import { api } from "@/lib/client";
import { LANGS } from "@/lib/i18n";

export default function Nav() {
  const { t, lang, setLang, user, setUser } = useApp();
  const path = usePathname(), router = useRouter();
  const role = user ? user.role : null;
  const items = {
    guest: [["/", "nav_home"], ["/find", "nav_find"], ["/assistant", "nav_assistant"], ["/login", "nav_login"], ["/register", "nav_register"]],
    customer: [["/", "nav_home"], ["/find", "nav_find"], ["/bookings", "nav_bookings"], ["/assistant", "nav_assistant"]],
    worker: [["/worker", "nav_worker"], ["/assistant", "nav_assistant"]],
    admin: [["/admin", "nav_admin"], ["/assistant", "nav_assistant"]],
  }[role || "guest"];
  async function logout() { await api("auth/logout", "POST").catch(() => {}); setUser(null); router.push("/"); }
  return (
    <header className="nav">
      <Link href="/" className="brand">🏠 {t("app_title")}</Link>
      <nav>
        {user !== undefined && items.map(([href, k]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>{t(k)}</Link>
        ))}
      </nav>
      <div className="nav-right">
        <select aria-label={t("language")} value={lang} onChange={(e) => setLang(e.target.value)}>
          {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {user && <button className="btn ghost" onClick={logout}>{t("logout")}</button>}
      </div>
    </header>
  );
}
