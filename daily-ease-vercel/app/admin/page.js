"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/components/AppProvider";
import useGuard from "@/components/useGuard";
import BookingCard from "@/components/BookingCard";
import WorkerCard from "@/components/WorkerCard";
import { api } from "@/lib/client";

export default function Admin() {
  const { t, err } = useApp(), user = useGuard("admin");
  const [tab, setTab] = useState("users"), [stats, setStats] = useState(null), [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState([]), [bookings, setBookings] = useState([]), [e, setE] = useState(""), [ok, setOk] = useState("");
  const load = useCallback(async () => {
    try {
      const [s, u, w, b] = await Promise.all([api("admin/stats"), api("admin/users"), api("workers?all=1"), api("bookings")]);
      setStats(s.stats); setUsers(u.users); setWorkers(w.workers); setBookings(b.bookings);
    } catch (x) { setE(err(x)); }
  }, [err]);
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line
  const run = (fn) => async () => { try { await fn(); await load(); } catch (x) { setE(err(x)); } };
  if (!user) return <p>{t("loading")}</p>;
  return (
    <>
      <h1>{t("nav_admin")}</h1>
      {stats && <div className="grid g4">{Object.entries(stats).map(([k, v]) => <div className="metric" key={k}><b>{v}</b>{t(k)}</div>)}</div>}
      <div className="tabs" style={{ marginTop: 16 }}>
        {[["users", "tab_users"], ["workers", "tab_workers"], ["bookings", "tab_bookings"]].map(([k, l]) =>
          <button key={k} className={"btn sm " + (tab === k ? "" : "ghost")} onClick={() => setTab(k)}>{t(l)}</button>)}
      </div>
      {e && <div className="msg err">{e}</div>}{ok && <div className="msg ok">{ok}</div>}
      {tab === "users" && users.map((u) => (
        <div className="card" key={u.id}>
          <b>{u.name}</b> · {u.email} · <span className="badge">{u.role}</span>{!u.active && <span className="badge off">✕</span>}
          {u.id !== user.id && <div className="row"><button className="btn ghost sm" onClick={run(() => api("admin/users/" + u.id, "PATCH", { active: !u.active }))}>{t(u.active ? "deactivate" : "activate")}</button></div>}
        </div>
      ))}
      {tab === "workers" && (
        <>
          <button className="btn sm" onClick={run(async () => { await api("admin/demo", "POST"); setOk(t("ok_demo")); })}>{t("load_demo")}</button>
          <div style={{ height: 12 }} />
          {workers.map((w) => (
            <WorkerCard key={w.id} w={w}>
              <div className="row"><button className="btn ghost sm" onClick={run(() => api("admin/workers/" + w.id, "PATCH", { verified: !w.verified }))}>{t(w.verified ? "unverify_btn" : "verify_btn")}</button></div>
            </WorkerCard>
          ))}
        </>
      )}
      {tab === "bookings" && (bookings.length ? bookings.map((b) => (
        <BookingCard key={b.id} b={b} otherLabel={t("with_worker")} otherName={`${b.worker_name} ← ${b.customer_name}`}>
          {["pending", "accepted"].includes(b.status) && <div className="row"><button className="btn danger sm" onClick={run(() => api("bookings/" + b.id, "PATCH", { status: "cancelled" }))}>{t("act_cancel")}</button></div>}
        </BookingCard>
      )) : <div className="card">{t("no_bookings")}</div>)}
    </>
  );
}
