"use client";
import { useApp } from "./AppProvider";
import { stars } from "./WorkerCard";

export default function BookingCard({ b, otherLabel, otherName, phone, children }) {
  const { t, cat, lang } = useApp();
  return (
    <div className="card">
      <div>
        <span className={"st st-" + b.status}>{t("st_" + b.status)}</span>{" "}
        <b>{cat(b.category)}</b> · {otherLabel}: <b>{otherName}</b>
      </div>
      <div className="m">🗓 {t("scheduled")}: {new Date(b.scheduled_for).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
      <div className="m">📍 {b.address}</div>
      <div>📝 {b.description}</div>
      {phone && <div className="m">📞 {t("contact")}: <a href={"tel:" + phone}>{phone}</a></div>}
      {b.rating && <div className="m">{stars(b.rating)} {b.review}</div>}
      {children}
    </div>
  );
}
