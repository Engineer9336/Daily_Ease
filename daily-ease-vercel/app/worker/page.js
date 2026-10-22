"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/components/AppProvider";
import useGuard from "@/components/useGuard";
import BookingCard from "@/components/BookingCard";
import WorkerCard from "@/components/WorkerCard";
import { api, resizePhoto } from "@/lib/client";
import { CATS } from "@/lib/i18n";

function Profile({ profile, onSaved }) {
  const { t, err, cat } = useApp();
  const p = profile || {};
  const [f, setF] = useState({ category: p.category || "plumber", city: p.city || "", skills: p.skills || "", hourly_rate: p.hourly_rate || 300,
    experience_years: p.experience_years || 0, bio: p.bio || "", available: p.available !== false });
  const [photo, setPhoto] = useState(undefined), [e, setE] = useState(""), [ok, setOk] = useState(false);
  const set = (k) => (x) => setF({ ...f, [k]: x.target.value });
  async function pick(ev) {
    try { setPhoto(await resizePhoto(ev.target.files[0])); setE(""); } catch (x) { setE(err(x)); }
  }
  async function save(ev) {
    ev.preventDefault(); setE(""); setOk(false);
    try { await api("worker/profile", "PUT", { ...f, ...(photo ? { photo } : {}) }); setOk(true); setPhoto(undefined); onSaved(); } catch (x) { setE(err(x)); }
  }
  return (
    <form className="form wide" onSubmit={save}>
      <label>{t("category")}</label>
      <select value={f.category} onChange={set("category")}>{Object.keys(CATS).map((k) => <option key={k} value={k}>{cat(k)}</option>)}</select>
      <label>{t("city")}</label><input required maxLength={60} value={f.city} onChange={set("city")} />
      <label>{t("skills")}</label><input maxLength={200} value={f.skills} onChange={set("skills")} />
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><label>{t("hourly_rate")}</label><input type="number" min="50" max="20000" value={f.hourly_rate} onChange={set("hourly_rate")} /></div>
        <div><label>{t("years")}</label><input type="number" min="0" max="60" value={f.experience_years} onChange={set("experience_years")} /></div>
      </div>
      <label>{t("bio")}</label><textarea maxLength={500} value={f.bio} onChange={set("bio")} />
      <label>{t("upload_photo")}</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} />
      <div className="m">{t("photo_hint")}</div>
      <label className="checkbox"><input type="checkbox" checked={f.available} onChange={(x) => setF({ ...f, available: x.target.checked })} />{t("available_toggle")}</label>
      {e && <div className="msg err" role="alert">{e}</div>}
      {ok && <div className="msg ok">{t("ok_saved")}</div>}
      <div className="row"><button className="btn">{t("save_profile")}</button></div>
    </form>
  );
}

export default function Worker() {
  const { t, err } = useApp(), user = useGuard("worker");
  const [tab, setTab] = useState("in"), [rows, setRows] = useState(null), [profile, setProfile] = useState(undefined), [e, setE] = useState("");
  const load = useCallback(() => {
    api("bookings").then((d) => setRows(d.bookings)).catch((x) => setE(err(x)));
    api("worker/profile").then((d) => setProfile(d.profile)).catch((x) => setE(err(x)));
  }, [err]);
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line
  async function act(id, status) { try { await api("bookings/" + id, "PATCH", { status }); load(); } catch (x) { setE(err(x)); } }
  if (!user || profile === undefined) return <p>{t("loading")}</p>;
  return (
    <>
      <h1>{t("nav_worker")}</h1>
      <div className="tabs">
        <button className={"btn sm " + (tab === "in" ? "" : "ghost")} onClick={() => setTab("in")}>{t("incoming")}</button>
        <button className={"btn sm " + (tab === "pr" ? "" : "ghost")} onClick={() => setTab("pr")}>{t("my_profile")}</button>
      </div>
      {e && <div className="msg err">{e}</div>}
      {tab === "in" ? (
        <>
          {!profile && <div className="msg err">{t("profile_incomplete")}</div>}
          {profile && rows && !rows.length && <div className="card">{t("no_bookings")}</div>}
          {(rows || []).map((b) => (
            <BookingCard key={b.id} b={b} otherLabel={t("from_customer")} otherName={b.customer_name} phone={b.customer_phone}>
              <div className="row">
                {b.status === "pending" && <><button className="btn sm" onClick={() => act(b.id, "accepted")}>{t("act_accept")}</button><button className="btn danger sm" onClick={() => act(b.id, "rejected")}>{t("act_reject")}</button></>}
                {b.status === "accepted" && <button className="btn sm" onClick={() => act(b.id, "completed")}>{t("act_complete")}</button>}
              </div>
            </BookingCard>
          ))}
        </>
      ) : (
        <>{profile && <WorkerCard w={profile} />}<Profile key={profile ? profile.id : "new"} profile={profile} onSaved={load} /></>
      )}
    </>
  );
}
