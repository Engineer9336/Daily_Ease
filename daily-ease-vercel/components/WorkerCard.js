"use client";
import { useApp } from "./AppProvider";
import { avatarUri } from "@/lib/client";

export const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

export default function WorkerCard({ w, children }) {
  const { t, cat } = useApp();
  return (
    <div className="card wcard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.photo || avatarUri(w.name, w.avatar_color)} alt={w.name} width="72" height="72" />
      <div className="grow">
        <div className="n">{w.name}</div>
        <div className="m">{cat(w.category)} · 📍 {w.city} · {t("exp", { y: w.experience_years })}</div>
        {w.skills && <div className="m">{w.skills}</div>}
        <div className="m">
          {w.review_count ? `${stars(w.avg_rating)} ${w.avg_rating} (${w.review_count})` : t("rating_none")} · <b>{t("per_hour", { rate: w.hourly_rate })}</b>
        </div>
        <div>
          {w.verified && <span className="badge">✔ {t("verified")}</span>}
          <span className={"badge " + (w.available ? "" : "off")}>{t(w.available ? "available" : "unavailable")}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
