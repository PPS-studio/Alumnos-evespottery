// Manda push a las alumnas cuando enviás un mensaje general/segmentado (solo a quienes tengan notif_generales ON)
const webpush = require("web-push");
const SUPA_URL = process.env.SUPA_URL || "https://rwlfbbmbustxpuvbakbo.supabase.co";
const SUPA_KEY = process.env.SUPA_SERVICE_KEY;
const REST = SUPA_URL + "/rest/v1";

webpush.setVapidDetails("mailto:hola@evespottery.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

async function sb(path) {
  const r = await fetch(REST + path, { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

module.exports = async function handler(req, res) {
  try {
    const texto = (req.query && req.query.texto) || (req.body && req.body.texto) || "Tenés un nuevo aviso del taller.";
    const dia = (req.query && req.query.dia) || null;
    const hora = (req.query && req.query.hora) || null;
    const sede = (req.query && req.query.sede) || null;

    const [alumnos, subs] = await Promise.all([
      sb("/alumnos?estado=eq.activo&select=id,sede,turno_dia,turno_hora"),
      sb("/push_subs?notif_generales=eq.true&select=*")
    ]);
    const alById = {}; alumnos.forEach(a => { alById[a.id] = a; });

    let sent = 0;
    for (const s of subs) {
      if (!s.subscription) continue;
      const a = alById[s.alumno_id];
      if (!a) continue;
      if (dia && a.turno_dia !== dia) continue;
      if (hora && a.turno_hora !== hora) continue;
      if (sede && a.sede !== sede) continue;
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title: "Eve's Pottery", body: texto, url: "https://clases.evespottery.com" }));
        sent++;
      } catch (e) {}
    }
    res.status(200).json({ ok: true, sent });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
};
