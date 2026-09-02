// Login del lado del servidor.
// El navegador ya no compara contraseñas: manda nombre + contraseña acá,
// y recibe una credencial firmada. Las contraseñas nunca vuelven al navegador.
const { firmarToken } = require("./_auth");

const SUPA_URL = process.env.SUPA_URL || "https://rwlfbbmbustxpuvbakbo.supabase.co";
const SUPA_KEY = process.env.SUPA_SERVICE_KEY;
const ADMIN_PW = process.env.ADMIN_PW || "Clases2026";

async function rpc(fn, body) {
  const r = await fetch(SUPA_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) { console.error("rpc error", await r.text()); return null; }
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// Compara sin filtrar tiempos, para que no se pueda adivinar la contraseña
// midiendo cuánto tarda en responder.
function igualSeguro(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return require("crypto").timingSafeEqual(x, y);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const tipo = String(body.tipo || "");
    const nombre = String(body.nombre || "").trim();
    const password = String(body.password || "");

    if (!SUPA_KEY) return res.status(500).json({ ok: false, error: "Falta configurar el servidor" });

    // ---- ADMIN: la contraseña deja de viajar en el JavaScript ----
    if (tipo === "admin") {
      if (!password || !igualSeguro(password, ADMIN_PW)) {
        return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
      }
      return res.status(200).json({ ok: true, token: firmarToken({ t: "admin" }, 12), nombre: "Admin" });
    }

    // ---- ALUMNAS Y PROFESORAS ----
    const tabla = tipo === "alumna" ? "alumnos" : tipo === "profesora" ? "profesoras" : null;
    if (!tabla) return res.status(400).json({ ok: false, error: "Tipo de acceso inválido" });
    if (!nombre || !password) return res.status(400).json({ ok: false, error: "Faltan el nombre o la contraseña" });

    const filas = await rpc("verificar_login", { p_tabla: tabla, p_nombre: nombre, p_pass: password });
    if (!filas || !filas.length) {
      return res.status(401).json({ ok: false, error: "No encontramos ese nombre y contraseña" });
    }

    const quien = filas[0];
    const token = firmarToken({ t: tipo, id: quien.id, n: quien.nombre }, 24 * 30);
    return res.status(200).json({ ok: true, token: token, id: quien.id, nombre: quien.nombre });
  } catch (e) {
    console.error("login error", e);
    return res.status(500).json({ ok: false, error: "Error del servidor" });
  }
};
