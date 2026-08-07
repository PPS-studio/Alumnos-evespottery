// Vercel Cron — corre cada 15 min. Manda push de recordatorio 48h y 2h antes de cada clase.
const webpush = require("web-push");

const SUPA_URL = process.env.SUPA_URL || "https://rwlfbbmbustxpuvbakbo.supabase.co";
const SUPA_KEY = process.env.SUPA_SERVICE_KEY; // service_role key (secreta, solo en el servidor)
const REST = SUPA_URL + "/rest/v1";

webpush.setVapidDetails(
  "mailto:hola@evespottery.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const SCHED = {
  "San Isidro": ["lunes-18:00", "martes-09:30", "miércoles-18:30", "jueves-18:30", "sábado-10:00"],
  "Palermo": ["lunes-18:30", "martes-10:00", "martes-14:30", "martes-18:30", "jueves-10:00", "jueves-14:30", "jueves-18:30", "viernes-10:00", "viernes-18:30", "sábado-16:30"]
};

async function sb(path, method, body) {
  const opts = { method: method || "GET", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" } };
  if (method === "POST") opts.headers.Prefer = "return=representation";
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(REST + path, opts);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// UTC ms -> Argentina wall-clock Date (UTC-3)
function toArg(ms) { return new Date(ms - 3 * 3600000); }
function argDayName(ms) { const a = toArg(ms); const dow = a.getUTCDay(); return DAYS[dow === 0 ? 6 : dow - 1]; }
function dayKey(ms) { const a = toArg(ms); return a.getUTCFullYear() + "-" + String(a.getUTCMonth() + 1).padStart(2, "0") + "-" + String(a.getUTCDate()).padStart(2, "0"); }

// build UTC ms for an Argentina day+hora on a given reference ms
function argClassMs(refMs, hora) {
  const a = toArg(refMs);
  const tp = hora.split(":");
  let h = parseInt(tp[0]) + 3, extra = 0;
  if (h >= 24) { h -= 24; extra = 1; }
  return Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() + extra, h, parseInt(tp[1]), 0, 0);
}

module.exports = async function handler(req, res) {
  try {
    const now = Date.now();
    const [alumnos, subs, cancs, extras, enviadas] = await Promise.all([
      sb("/alumnos?estado=eq.activo&select=id,nombre,sede,turno_dia,turno_hora"),
      sb("/push_subs?select=*"),
      sb("/cancelaciones?select=alumno_id,fecha_iso"),
      sb("/clases_extra?select=alumno_id,fecha_iso"),
      sb("/push_enviadas?select=alumno_id,clase_iso,tipo")
    ]);

    const subByAl = {};
    (subs || []).forEach(s => { subByAl[s.alumno_id] = s; });
    const sentSet = new Set((enviadas || []).map(e => e.alumno_id + "|" + e.clase_iso + "|" + e.tipo));

    // windows: 48h (send if class is 47h45m..48h15m away) and 2h (1h45m..2h15m)
    const windows = [
      { tipo: "48h", min: 47.75 * 3600000, max: 48.25 * 3600000, campo: "notif_48h" },
      { tipo: "2h", min: 1.75 * 3600000, max: 2.25 * 3600000, campo: "notif_2h" }
    ];

    let sentCount = 0;
    const toSend = [];

    for (const al of alumnos) {
      const sub = subByAl[al.id];
      if (!sub || !sub.subscription) continue;
      // check next 3 days of this alumna's fixed class
      for (let d = 0; d <= 3; d++) {
        const refMs = now + d * 86400000;
        if (argDayName(refMs) !== al.turno_dia) continue;
        const classMs = argClassMs(refMs, al.turno_hora);
        const diff = classMs - now;
        // skip if cancelled that day
        const cancelled = (cancs || []).some(c => c.alumno_id === al.id && dayKey(new Date(c.fecha_iso).getTime()) === dayKey(classMs));
        if (cancelled) continue;
        const classIso = new Date(classMs).toISOString();
        for (const w of windows) {
          if (!sub[w.campo]) continue;
          if (diff >= w.min && diff <= w.max) {
            const key = al.id + "|" + classIso + "|" + w.tipo;
            if (sentSet.has(key)) continue;
            const a = toArg(classMs);
            const hhmm = String(a.getUTCHours()).padStart(2, "0") + ":" + String(a.getUTCMinutes()).padStart(2, "0");
            const body = w.tipo === "48h"
              ? "Tenés clase " + al.turno_dia + " a las " + hhmm + ". Si no podés ir, cancelá desde la app."
              : "Tu clase es en 2 horas (" + hhmm + "). ¡Te esperamos!";
            toSend.push({ al, sub, tipo: w.tipo, classIso, title: "Eve's Pottery", body });
          }
        }
      }
    }

    for (const item of toSend) {
      try {
        await webpush.sendNotification(item.sub.subscription, JSON.stringify({ title: item.title, body: item.body, url: "https://clases.evespottery.com" }));
        await sb("/push_enviadas", "POST", { alumno_id: item.al.id, clase_iso: item.classIso, tipo: item.tipo });
        sentCount++;
      } catch (e) {
        // subscription expired -> could delete here
        if (e.statusCode === 410 || e.statusCode === 404) {
          await sb("/push_subs?alumno_id=eq." + item.al.id, "PATCH", { subscription: null });
        }
      }
    }

    res.status(200).json({ ok: true, evaluated: alumnos.length, sent: sentCount });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
};
