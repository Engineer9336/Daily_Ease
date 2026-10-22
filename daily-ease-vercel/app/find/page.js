"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import WorkerCard from "@/components/WorkerCard";
import { api } from "@/lib/client";
import { CATS } from "@/lib/i18n";

function BookingForm({ w, onClose }) {
  const { t, err, user } = useApp();
  const tomorrow = new Date(Date.now() + 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState({ description: "", address: "", when: tomorrow });
  const [e, setE] = useState(""), [ok, setOk] = useState(false), [busy, setBusy] = useState(false);
  async function submit(ev) {
    ev.preventDefault(); setE(""); setBusy(true);
    try {
      await api("bookings", "POST", { worker_id: w.id, description: f.description, address: f.address, scheduled_for: new Date(f.when).toISOString() });
      setOk(true);
    } catch (x) { setE(err(x)); } finally { setBusy(false); }
  }
  return (
    <div className="card" style={{ borderColor: "var(--brand)" }}>
      <h3>{t("book_title", { name: w.name })}</h3>
      {!user || user.role !== "customer" ? (
        <div className="msg err">{t("need_login_customer")} <Link href="/login">{t("nav_login")}</Link></div>
      ) : ok ? (
        <div className="msg ok">{t("ok_booked")} <Link href="/bookings">{t("nav_bookings")}</Link></div>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor="jd">{t("job_desc")}</label><textarea id="jd" required maxLength={500} value={f.description} onChange={(x) => setF({ ...f, description: x.target.value })} />
          <label htmlFor="ad">{t("address")}</label><input id="ad" required maxLength={300} value={f.address} onChange={(x) => setF({ ...f, address: x.target.value })} />
          <label htmlFor="dt">{t("date")} / {t("time")}</label><input id="dt" type="datetime-local" required value={f.when} onChange={(x) => setF({ ...f, when: x.target.value })} />
          {e && <div className="msg err" role="alert">{e}</div>}
          <div className="row"><button className="btn" disabled={busy}>{t("submit_request")}</button></div>
        </form>
      )}
      <div className="row"><button className="btn ghost sm" onClick={onClose}>{t("close")}</button></div>
    </div>
  );
}

export default function Find() {
  const { t, cat } = useApp();
  const [q, setQ] = useState(""), [category, setCategory] = useState(""), [city, setCity] = useState(""), [avail, setAvail] = useState(true);
  const [list, setList] = useState(null), [book, setBook] = useState(null);
  useEffect(() => { const c = new URLSearchParams(window.location.search).get("cat"); if (c && CATS[c]) setCategory(c); }, []);
  useEffect(() => {
    const id = setTimeout(() => {
      const p = new URLSearchParams({ q, category, city, all: avail ? "0" : "1" });
      api("workers?" + p).then((d) => setList(d.workers)).catch(() => setList([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q, category, city, avail]);
  return (
    <>
      <h1>{t("nav_find")}</h1>
      <div className="filters">
        <input aria-label={t("search_ph")} placeholder={t("search_ph")} value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} />
        <select aria-label={t("category")} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t("all_categories")}</option>
          {Object.keys(CATS).map((k) => <option key={k} value={k}>{cat(k)}</option>)}
        </select>
        <input aria-label={t("city")} placeholder={t("city")} value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} />
      </div>
      <label className="checkbox"><input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} />{t("only_available")}</label>
      {book && <BookingForm w={book} onClose={() => setBook(null)} />}
      {list === null ? <p>{t("loading")}</p> : (
        <>
          <p className="m">{t("results_n", { n: list.length })}</p>
          {!list.length && <div className="card">{t("no_results")}</div>}
          {list.map((w) => (
            <WorkerCard key={w.id} w={w}>
              {w.available && <div className="row"><button className="btn sm" onClick={() => { setBook(w); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("book_now")}</button></div>}
            </WorkerCard>
          ))}
        </>
      )}
    </>
  );
}
