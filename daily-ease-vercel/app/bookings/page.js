"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/components/AppProvider";
import useGuard from "@/components/useGuard";
import BookingCard from "@/components/BookingCard";
import { api } from "@/lib/client";

function Review({ b, done }) {
  const { t, err } = useApp();
  const [r, setR] = useState(5), [txt, setTxt] = useState(""), [e, setE] = useState("");
  async function send(ev) {
    ev.preventDefault();
    try { await api(`bookings/${b.id}/review`, "POST", { rating: r, review: txt }); done(); } catch (x) { setE(err(x)); }
  }
  return (
    <form onSubmit={send}>
      <label>{t("rate_this")}</label>
      <select value={r} onChange={(x) => setR(Number(x.target.value))} style={{ width: "auto" }}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
      <input placeholder={t("review_ph")} maxLength={300} value={txt} onChange={(x) => setTxt(x.target.value)} style={{ marginTop: 8 }} />
      {e && <div className="msg err">{e}</div>}
      <div className="row"><button className="btn sm">{t("submit_review")}</button></div>
    </form>
  );
}

export default function Bookings() {
  const { t, err } = useApp(), user = useGuard("customer");
  const [rows, setRows] = useState(null), [e, setE] = useState("");
  const load = useCallback(() => api("bookings").then((d) => setRows(d.bookings)).catch((x) => setE(err(x))), [err]);
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line
  async function cancel(id) { try { await api("bookings/" + id, "PATCH", { status: "cancelled" }); load(); } catch (x) { setE(err(x)); } }
  if (!user) return <p>{t("loading")}</p>;
  return (
    <>
      <h1>{t("nav_bookings")}</h1>
      {e && <div className="msg err">{e}</div>}
      {rows && !rows.length && <div className="card">{t("no_bookings")}</div>}
      {(rows || []).map((b) => (
        <BookingCard key={b.id} b={b} otherLabel={t("with_worker")} otherName={b.worker_name} phone={b.worker_phone}>
          {["pending", "accepted"].includes(b.status) && <div className="row"><button className="btn danger sm" onClick={() => cancel(b.id)}>{t("act_cancel")}</button></div>}
          {b.status === "completed" && !b.rating && <Review b={b} done={load} />}
        </BookingCard>
      ))}
    </>
  );
}
