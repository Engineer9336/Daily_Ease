"use client";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { CATS } from "@/lib/i18n";

export default function Home() {
  const { t, cat } = useApp();
  return (
    <>
      <section className="hero"><h1>{t("hero_title")}</h1><p>{t("hero_sub")}</p>
        <div className="row"><Link className="btn" style={{ background: "#fff", color: "#115E59" }} href="/find">{t("nav_find")}</Link></div>
      </section>
      <h2>{t("how_title")}</h2>
      <div className="grid g3">{["step1", "step2", "step3"].map((k) => <div className="step" key={k}>{t(k)}</div>)}</div>
      <p className="m">{t("footer_note")}</p>
      <h2>{t("category")}</h2>
      <div className="grid g5">
        {Object.keys(CATS).map((k) => <Link key={k} className="btn ghost" style={{ textAlign: "center", textDecoration: "none" }} href={"/find?cat=" + k}>{cat(k)}</Link>)}
      </div>
    </>
  );
}
