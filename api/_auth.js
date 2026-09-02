// Helper compartido de sesiones. El guion bajo del nombre hace que Vercel
// NO lo publique como endpoint: solo lo usan las otras funciones de /api.
const crypto = require("crypto");

// Clave con la que se firman las credenciales.
// Si existe SESSION_SECRET la usa; si no, deriva una a partir de la clave de
// servicio (que ya es secreta y solo vive en el servidor). Derivada, no copiada:
// aunque se filtrara la firma, no se puede volver a la clave original.
function secreto() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const base = process.env.SUPA_SERVICE_KEY;
  if (!base) throw new Error("Falta SUPA_SERVICE_KEY");
  return crypto.createHmac("sha256", base).update("eves-sesiones-v1").digest("hex");
}

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function firma(texto) {
  return crypto.createHmac("sha256", secreto()).update(texto).digest("base64url");
}

// Arma la credencial firmada que el navegador va a guardar
function firmarToken(datos, horas) {
  const cuerpo = b64(Object.assign({}, datos, { exp: Date.now() + horas * 3600000 }));
  return cuerpo + "." + firma(cuerpo);
}

// Devuelve los datos si la credencial es válida y no venció; si no, null
function verificarToken(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const partes = token.split(".");
    if (partes.length !== 2) return null;
    const esperada = firma(partes[0]);
    const a = Buffer.from(partes[1]);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const datos = JSON.parse(Buffer.from(partes[0], "base64url").toString());
    if (!datos.exp || datos.exp < Date.now()) return null;
    return datos;
  } catch (e) { return null; }
}

// Lee la credencial del pedido que llega del navegador
function quienEs(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  return verificarToken(token);
}

module.exports = { firmarToken, verificarToken, quienEs };
