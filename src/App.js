import { useState, useEffect, useRef, useCallback } from "react";

// ====== SUPABASE CONFIG ======
var SUPA_URL = "https://rwlfbbmbustxpuvbakbo.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bGZiYm1idXN0eHB1dmJha2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTIwNDUsImV4cCI6MjA4NzY2ODA0NX0.9T_ia_s0XkVNz9P_nEtOsNzxWVVh-docYpOqLc8lgBU";
var SUPA_REST = SUPA_URL + "/rest/v1";
var HEADERS = { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

// ---- SESIÓN ----
function guardarSesion(tok) { try { if (tok) window.localStorage.setItem(SESION_KEY, tok); else window.localStorage.removeItem(SESION_KEY) } catch (e) {} }
function leerSesion() { try { return window.localStorage.getItem(SESION_KEY) || null } catch (e) { return null } }

// Pide al servidor que verifique nombre + contraseña. El navegador nunca las compara.
async function pedirLogin(tipo, nombre, password) {
  try {
    var r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipo, nombre: nombre, password: password })
    });
    var d = await r.json().catch(function () { return null });
    if (!r.ok || !d || !d.ok) return { ok: false, error: (d && d.error) || "No pudimos verificar tus datos. Probá de nuevo." };
    guardarSesion(d.token);
    return { ok: true, id: d.id, nombre: d.nombre };
  } catch (e) {
    return { ok: false, error: "No hay conexión. Fijate que tengas internet y probá de nuevo." };
  }
}

async function supa(table, method, params, body) {
  var url = SUPA_REST + "/" + table + (params || "");
  var opts = { method: method || "GET", headers: Object.assign({}, HEADERS) };
  if (method === "POST") opts.headers["Prefer"] = "return=representation";
  if (method === "PATCH") opts.headers["Prefer"] = "return=representation";
  if (body) opts.body = JSON.stringify(body);
  var r = await fetch(url, opts);
  if (!r.ok) { var e = await r.text(); console.error("Supa error:", e); return null; }
  var txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// ====== THEME ======
var navy = "#132435", gold = "#D0B48F", copper = "#C78538", olive = "#8C8135", grayBlue = "#CBD1DD", cream = "#E9E9E2", grayWarm = "#808078", white = "#fff";
var ft = "'Barlow Semi Condensed',sans-serif";
// La contraseña de admin ya no vive acá: la verifica el servidor (api/login.js).
var SESION_KEY = "ep_sesion";
var SCHED = {
  "San Isidro": ["lunes-18:00", "martes-09:30", "miércoles-18:30", "jueves-18:30", "sábado-10:00"],
  "Palermo": ["lunes-18:30", "martes-10:00", "martes-14:30", "martes-18:30", "jueves-10:00", "jueves-14:30", "jueves-18:30", "viernes-10:00", "viernes-18:30", "sábado-16:30"]
};
var MAX_CUPO = 8; var CLASES_BASE = 4;
var DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
var MN = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
var FERIADOS_2026 = [
  "2026-3-23", "2026-3-24",
  "2026-4-2", "2026-4-3",
  "2026-5-1", "2026-5-25",
  "2026-6-15", "2026-6-20",
  "2026-7-9", "2026-7-10",
  "2026-8-17",
  "2026-10-12",
  "2026-11-23",
  "2026-12-7", "2026-12-8", "2026-12-25"
];
function isFeriado(date) {
  var a = toArg(date);
  var k = a.getUTCFullYear() + "-" + (a.getUTCMonth() + 1) + "-" + a.getUTCDate();
  return FERIADOS_2026.indexOf(k) !== -1;
}
function normDay(s) { return s.replace(/sabado/gi, "sábado").replace(/miercoles/gi, "miércoles") }
function allClassesForAlumno(al, month, year) {
  var c1 = classesInMonth(al.turno.dia, al.turno.hora, month, year);
  if (al.turno2) { var c2 = classesInMonth(al.turno2.dia, al.turno2.hora, month, year); c1 = c1.concat(c2) }
  c1.sort(function (a, b) { return a - b });
  return c1;
}
function parseMes(s) { var low = s.toLowerCase(); for (var i = 0; i < MN.length; i++) { if (low.includes(MN[i])) { var ym = low.match(/\d{4}/); var y = ym ? parseInt(ym[0]) : new Date().getFullYear(); return { month: i, year: y, key: y + "-" + i } } } return null }
// Build a UTC Date that represents the given Argentina-local day+time (from a reference day in any timezone)
function argDateFor(refDate, hora) {
  var a = toArg(refDate); // reference day in Argentina
  var tp = hora.split(":"); var h = parseInt(tp[0]) + 3; var extraDay = 0;
  if (h >= 24) { h -= 24; extraDay = 1 }
  return new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() + extraDay, h, parseInt(tp[1]), 0, 0));
}
function argDayName(refDate) { var a = toArg(refDate); var dow = a.getUTCDay(); var idx = dow === 0 ? 6 : dow - 1; return DAYS[idx] }
function classesInMonth(day, time, month, year) {
  var tgt = DAYS.indexOf(day); var res = [];
  var daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (var dn = 1; dn <= daysInMonth; dn++) {
    var d = new Date(Date.UTC(year, month, dn, 12, 0));
    var dow = d.getUTCDay(); var idx = dow === 0 ? 6 : dow - 1;
    if (idx === tgt) {
      var pp = time.split(":"); var h = parseInt(pp[0]) + 3; var dy = dn;
      if (h >= 24) { h -= 24; dy++ }
      res.push(new Date(Date.UTC(year, month, dy, h, parseInt(pp[1]), 0, 0)))
    }
  } return res
}
function hrsUntil(d) { return (d.getTime() - Date.now()) / 3600000 }
// Argentina timezone helpers (UTC-3) — always display/compare in Argentina time
function toArg(d) { return new Date(d.getTime() - 3 * 3600000) }
function dayKey(d) { var a = toArg(typeof d === "string" ? new Date(d) : d); return a.getUTCFullYear() + "-" + String(a.getUTCMonth() + 1).padStart(2, "0") + "-" + String(a.getUTCDate()).padStart(2, "0") }
function matchDay(iso1, iso2) { if (!iso1 || !iso2) return false; return dayKey(typeof iso1 === "string" ? new Date(iso1) : iso1) === dayKey(typeof iso2 === "string" ? new Date(iso2) : iso2) }
function fmtDate(d) { var a = toArg(d); var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; var mn = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]; return dn[a.getUTCDay()] + " " + a.getUTCDate() + " " + mn[a.getUTCMonth()] + " · " + String(a.getUTCHours()).padStart(2, "0") + ":" + String(a.getUTCMinutes()).padStart(2, "0") }
function fmtDateShort(d) { var a = toArg(d); var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; return dn[a.getUTCDay()] + " " + a.getUTCDate() + "/" + (a.getUTCMonth() + 1) + " " + String(a.getUTCHours()).padStart(2, "0") + ":" + String(a.getUTCMinutes()).padStart(2, "0") }
function genPw(prefix) { return prefix + String(Math.floor(1000 + Math.random() * 9000)) }
function fmtMoney(n) { return "$" + Number(n).toLocaleString("es-AR") }
function conDesc(precio, descuento) { if (!descuento) return precio; return Math.round(precio * (1 - descuento / 100)) }
// Renderiza un precio: si hay descuento, muestra original tachado + con descuento
function PrecioConDesc(props) {
  var precio = props.precio, descuento = props.descuento || 0, label = props.label, color = props.color || "#991b1b";
  if (!descuento) {
    return (<div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: color, fontFamily: ft }}>{label}</p><p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: color, fontFamily: ft }}>{fmtMoney(precio)}</p></div>);
  }
  return (<div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: color, fontFamily: ft }}>{label}</p><p style={{ margin: "2px 0 0", fontSize: 12, color: color, fontFamily: ft, textDecoration: "line-through", opacity: 0.6 }}>{fmtMoney(precio)}</p><p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: color, fontFamily: ft }}>{fmtMoney(conDesc(precio, descuento))}</p></div>);
}
function getCuotaInfo(cuotas, sede, frecuencia) {
  if (!cuotas || !cuotas.length) return null;
  var day = new Date().getDate();
  var results = cuotas.filter(function (c) { return c.sede === sede && c.frecuencia === frecuencia });
  if (!results.length) return null;
  var periodo = day <= 7 ? "hasta_dia_7" : day <= 14 ? "dia_8_al_14" : "desde_dia_15";
  if (frecuencia === "2x") {
    var row = results[0];
    var nextFecha2x = day <= 7 ? 8 : day <= 14 ? 15 : null;
    var diasRestantes2x = nextFecha2x ? nextFecha2x - day : null;
    return { efectivo: row[periodo], transferencia: row[periodo], periodo: periodo, is2x: true, allRows: results, diasRestantes: diasRestantes2x,
      nextAumento: day <= 7 ? { fecha: 8, efectivo: row.dia_8_al_14, transferencia: row.dia_8_al_14 } : day <= 14 ? { fecha: 15, efectivo: row.desde_dia_15, transferencia: row.desde_dia_15 } : null }
  }
  var efRow = results.find(function (r) { return r.forma_pago === "efectivo" });
  var trRow = results.find(function (r) { return r.forma_pago === "transferencia" });
  if (!efRow || !trRow) return null;
  var nextFecha = day <= 7 ? 8 : day <= 14 ? 15 : null;
  var diasRestantes = nextFecha ? nextFecha - day : null;
  return { efectivo: efRow[periodo], transferencia: trRow[periodo], periodo: periodo, is2x: false, allRows: results, diasRestantes: diasRestantes,
    nextAumento: day <= 7 ? { fecha: 8, efectivo: efRow.dia_8_al_14, transferencia: trRow.dia_8_al_14 } : day <= 14 ? { fecha: 15, efectivo: efRow.desde_dia_15, transferencia: trRow.desde_dia_15 } : null }
}

// ====== DATA HELPERS ======
function buildAlumnoFromRow(row, pagos, cancs, extras) {
  var mp = {};
  pagos.filter(function (p) { return p.alumno_id === row.id }).forEach(function (p) { mp[p.mes_key] = true });
  var canc = cancs.filter(function (c) { return c.alumno_id === row.id }).map(function (c) {
    return { iso: c.fecha_iso, mk: c.mes_key, noR: c.sin_recuperacion, sinAviso: c.sin_aviso, isExtra: c.is_extra }
  });
  var ex = extras.filter(function (e) { return e.alumno_id === row.id }).map(function (e) {
    return { date: e.fecha_iso, mk: e.mes_key, tipo: e.tipo }
  });
  var turno2 = row.turno2_dia && row.turno2_hora ? { dia: row.turno2_dia, hora: row.turno2_hora } : null;
  return { id: row.id, nombre: row.nombre, tel: row.tel || "", email: row.email || "", sede: row.sede, turno: { dia: row.turno_dia, hora: row.turno_hora }, turno2: turno2, mp: mp, hist: [], ex: ex, canc: canc, reg: row.clase_regalo || 0, estado: row.estado || "activo", pendArrastre: row.pend_arrastre || 0, frecuencia: row.frecuencia || "1x", excepcion: !!row.excepcion, descuento: row.descuento || 0 }
}
function buildProfeFromRow(row) {
  var sedes = row.sedes || [];
  var sede = sedes.length > 0 ? sedes[0] : "Palermo";
  return { id: row.id, nombre: row.nombre, sede: sede, sedes: sedes, horarios: row.horarios || [], esEncargada: row.encargada || false, sedeEncargada: row.encargada ? sede : null, puedeStock: row.puede_stock || false, tomaLista: row.toma_lista !== false, puedeProduccion: row.puede_produccion || false, veResultados: row.ve_resultados || false }
}
function getMonthStats(al, mk) {
  var p = mk.split("-").map(Number);
  var allClasses = allClassesForAlumno(al, p[1], p[0]);
  var totalInMonth = allClasses.length;
  var feriadosCount = allClasses.filter(function (d) { return isFeriado(d) }).length;
  var clasesReales = totalInMonth - feriadosCount;
  var is5 = al.frecuencia !== "2x" && clasesReales === 5;
  var cancThisMonth = (al.canc || []).filter(function (c) { return c.mk === mk });
  var recThisMonth = (al.ex || []).filter(function (e) { return e.mk === mk });
  var cancSinRecup = cancThisMonth.filter(function (c) { return c.noR }).length;
  var cancConRecup = cancThisMonth.length - cancSinRecup;
  var pendientes = cancConRecup - recThisMonth.length;
  if (pendientes < 0) pendientes = 0;
  var clasesEfectivas = CLASES_BASE - cancConRecup + recThisMonth.length;
  if (is5 && cancThisMonth.length === 0) clasesEfectivas = 5;
  return { totalInMonth: totalInMonth, is5: is5, cancTotal: cancThisMonth.length, cancSinRecup: cancSinRecup, cancConRecup: cancConRecup, recuperaciones: recThisMonth.length, pendientes: pendientes, clasesEfectivas: clasesEfectivas, puedeRecuperar: pendientes > 0 && clasesEfectivas < CLASES_BASE };
}
function getCupoForSlot(allAls, sede, dia, hora, fecha, maxCupo) {
  var dateStr = fecha.toISOString(); var fijos = 0; var recups = 0;
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    var matchT1 = a.turno.dia === dia && a.turno.hora === hora;
    var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora;
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return matchDay(c.iso, dateStr) }); if (!cancelled) fijos++ }
    (a.ex || []).forEach(function (e) { if (matchDay(e.date, dateStr)) recups++ })
  });
  var cap = maxCupo || MAX_CUPO;
  return { ocupado: fijos + recups, libre: cap - fijos - recups };
}
function getAlumnosForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var result = [];
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    var matchT1 = a.turno.dia === dia && a.turno.hora === hora;
    var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora;
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return matchDay(c.iso, dateStr) }); if (!cancelled) result.push({ alumno: a, tipo: "fijo" }) }
    (a.ex || []).forEach(function (e) { if (matchDay(e.date, dateStr) && !result.find(function (r) { return r.alumno.id === a.id })) result.push({ alumno: a, tipo: "recuperacion" }) })
  });
  return result;
}
function countFijosForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var count = 0;
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    var matchT1 = a.turno.dia === dia && a.turno.hora === hora;
    var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora;
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return matchDay(c.iso, dateStr) }); if (!cancelled) count++ }
  });
  return count;
}

// ====== HASH ROUTER ======
function useHash() {
  var _h = useState(window.location.hash || "#/alumna"); var hash = _h[0], setHash = _h[1];
  useEffect(function () { function onHash() { setHash(window.location.hash) } window.addEventListener("hashchange", onHash); return function () { window.removeEventListener("hashchange", onHash) } }, []);
  return hash;
}

function LoadingScreen() {
  return (<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: cream, flexDirection: "column", gap: 12 }}>
    <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy }}>EVES POTTERY</p>
    <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft }}>Cargando datos...</p>
    <div style={{ width: 40, height: 40, border: "3px solid " + grayBlue, borderTop: "3px solid " + copper, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>);
}

function AdminLogin(props) {
  var _pw = useState(""), pw = _pw[0], setPw = _pw[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];
  var _busyA = useState(false), busyA = _busyA[0], setBusyA = _busyA[1];
  async function doLogin() {
    if (busyA) return;
    setBusyA(true); setErr("");
    var r = await pedirLogin("admin", "", pw);
    setBusyA(false);
    if (r.ok) { props.onLogin() } else { setErr(r.error) }
  }
  var iStyle = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, background: white, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: cream }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy, margin: "0 0 4px" }}>EVES POTTERY</p>
          <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft, margin: 0 }}>Panel de administración</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: navy, fontFamily: ft, marginBottom: 4, display: "block" }}>Contraseña</label>
            <input type="password" value={pw} onChange={function (e) { setPw(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") doLogin() }} placeholder="Contraseña de admin" style={iStyle} /></div>
          {err ? <p style={{ color: "#991b1b", fontSize: 13, margin: 0, fontFamily: ft }}>{err}</p> : null}
          <button onClick={doLogin} style={{ padding: "12px", borderRadius: 10, background: copper, color: white, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ft, fontSize: 14, width: "100%" }}>Entrar</button>
        </div>
      </div>
    </div>);
}

// ====== ADMIN CHAT ======
function AdminChat(props) {
  var als = props.als, refreshData = props.refreshData, profes = props.profes, listas = props.listas, cuotas = props.cuotas || [], horariosExtra = props.horariosExtra || [];
  var ref = useRef(null);
  var welcomeMsg = "¡Hola! Asistente Eves Pottery ✦\n\nComandos:\n• Alta alumno: Nombre / Sede / día hora\n• Baja: Nombre\n• Pago recibido: Nombre (mes año)\n• Pagos mes año: nombre1, nombre2...\n• Consulta: Nombre\n• Clase a favor: Nombre\n• Resetear pw: Nombre\n• Resetear todas [P|SI]\n• Alumnos [P|SI] hoy/martes/mañana\n• Ver alumnos [P|SI]\n• Pagos pendientes [P|SI]\n• Cancelar clase: Nombre / fecha\n• Cancelar clases: fecha\n• Agendar clase: Nombre / día hora fecha\n• Alta profe / Baja profe / Ver profes\n• Notificaciones\n• Ver cuotas\n• Cuota: Sede / 1x|2x / forma / v1 / v2 / v3\n• Frecuencia: Nombre / 2x\n• Abrir horario / Cerrar horario / Ver horarios";
  var _m = useState([{ from: "bot", text: welcomeMsg }]), msgs = _m[0], setMsgs = _m[1];
  var _i = useState(""), inp = _i[0], setInp = _i[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  useEffect(function () { if (ref.current) ref.current.scrollIntoView({ behavior: "smooth" }) }, [msgs]);

  function findA(name) { var low = name.toLowerCase().trim(); return als.findIndex(function (a) { return a.nombre.toLowerCase().includes(low) }) }
  function parseSede(t) { var m = t.match(/(si|san\s*isidro)/i); if (m) return "San Isidro"; var mp = t.match(/\bP\b/); if (mp) return "Palermo"; return null; }
  function filterBySede(list, sede) { if (!sede) return list; return list.filter(function (a) { return a.sede === sede }) }

  async function respond(txt) {
    var t = txt.toLowerCase().trim();
    var sedeFilter = parseSede(t);
    var sedeLabel = sedeFilter ? " (" + sedeFilter + ")" : "";

    if (t.startsWith("notificacion") || t.startsWith("notif")) {
      var notifs = await supa("admin_notifs", "GET", "?order=created_at.desc&limit=20");
      var notasPend = await supa("notas_pago", "GET", "?verificado=eq.false&order=created_at.desc");
      var r = "";
      if (notasPend && notasPend.length) {
        r += "📝 Notas de pago sin verificar (" + notasPend.length + "):\n";
        notasPend.forEach(function (n) { var al = als.find(function (a) { return a.id === n.alumno_id }); r += "• " + (al ? al.nombre : "?") + " — " + n.nota + (n.monto ? " " + fmtMoney(n.monto) : "") + " (por " + n.profe_nombre + ")\n" });
        r += "\n";
      }
      if (notifs && notifs.length) { r += "🔔 Otras notificaciones:\n" + notifs.map(function (n) { return "[" + n.tipo + "] " + n.nombre + (n.sede ? " (" + n.sede + ")" : "") + (n.turno ? " " + n.turno : "") }).join("\n") }
      if (!r) return "Sin notificaciones pendientes.";
      return r;
    }
    if (t.includes("ver profe") || t === "profes") {
      if (!profes.length) return "No hay profes cargadas.";
      return "Profesoras:\n" + profes.map(function (p) { return "• " + p.nombre + " — " + p.sede + (p.esEncargada ? " (Enc)" : "") + " — " + p.horarios.map(function (h) { return h.replace("-", " ") }).join(", ") }).join("\n")
    }
    if (t.startsWith("alta profe")) {
      var raw = txt.replace(/alta\s*profe\s*:?\s*/i, "").trim();
      var parts = raw.split("/").map(function (s) { return s.trim() });
      if (parts.length < 3) return "Formato: Alta profe: Nombre / Sede / día hora, día hora";
      var nom = parts[0]; var sede = parts[1].toLowerCase().includes("palermo") ? "Palermo" : "San Isidro";
      var horStr = parts.slice(2).join("/");
      var dayFix = { "lunes": "lunes", "martes": "martes", "miercoles": "miércoles", "miércoles": "miércoles", "jueves": "jueves", "viernes": "viernes", "sabado": "sábado", "sábado": "sábado" };
      var hors = horStr.split(",").map(function (h) { var m = h.trim().toLowerCase().match(/([a-záéíóúñü]+)\s+(\d{1,2}:\d{2})/); if (!m) return null; var dayNorm = dayFix[m[1]]; if (!dayNorm) return null; return dayNorm + "-" + m[2] }).filter(Boolean);
      if (!hors.length) return "No entendí los horarios.";
      var newPwP = genPw("prof");
      var res = await supa("profesoras", "POST", "", { nombre: nom, sedes: [sede], horarios: hors, password: newPwP, encargada: false });
      if (res) { await refreshData(); return "✓ Profe " + nom + " — " + sede + "\nHorarios: " + hors.map(function (h) { return h.replace("-", " ") }).join(", ") + "\nContraseña: " + newPwP }
      return "✗ Error al crear profe."
    }
    if (t.startsWith("baja profe")) {
      var n = txt.replace(/baja\s*profe\s*:?\s*/i, "").trim();
      var idx = profes.findIndex(function (p) { return p.nombre.toLowerCase().includes(n.toLowerCase()) });
      if (idx === -1) return "✗ No encontré esa profesora.";
      await supa("profesoras", "DELETE", "?id=eq." + profes[idx].id);
      await refreshData();
      return "✓ " + profes[idx].nombre + " dada de baja."
    }
    if (t.startsWith("resetear todas") || t.startsWith("reset todas")) {
      var targetList = filterBySede(als, sedeFilter);
      if (!targetList.length) return "No hay alumnos" + sedeLabel;
      var results2 = [];
      for (var ri = 0; ri < targetList.length; ri++) { var alR = targetList[ri]; var newPwR = genPw("eves"); await supa("alumnos", "PATCH", "?id=eq." + alR.id, { password: newPwR }); results2.push("• " + alR.nombre + " — " + newPwR) }
      await refreshData();
      return "Contraseñas regeneradas" + sedeLabel + " (" + results2.length + "):\n" + results2.join("\n");
    }
    if (t.includes("ver contra") || t.includes("ver pw") || t.includes("contraseñas")) {
      return "🔒 Las contraseñas ya no se pueden ver.\n\nAhora se guardan cifradas: ni yo ni nadie puede leerlas, y si alguien accediera a la base tampoco.\n\nSi una alumna la olvidó, generale una nueva y te la muestro para que se la mandes:\n\n  Resetear pw: Nombre";
    }
    if (t.startsWith("resetear pw") || t.startsWith("reset pw")) {
      var n2 = txt.replace(/resetear\s*(pw|contra(seña)?)\s*:?\s*/i, "").replace(/reset\s*pw\s*:?\s*/i, "").trim();
      if (!n2) return "Formato: Resetear pw: Nombre";
      var idx2 = findA(n2); if (idx2 === -1) return "✗ No encontré ese nombre.";
      var newPw2 = genPw("eves");
      await supa("alumnos", "PATCH", "?id=eq." + als[idx2].id, { password: newPw2 });
      await refreshData();
      return "✓ Nueva contraseña para " + als[idx2].nombre + ": " + newPw2;
    }
    if (t.startsWith("contraseña") || t.startsWith("pw ")) {
      var n3 = txt.replace(/^(contraseña|pw)\s*:?\s*/i, "").trim();
      if (!n3) return "Formato: Contraseña: Nombre";
      var idx3 = findA(n3); if (idx3 === -1) return "✗ No encontré ese nombre.";
      return "🔒 No puedo mostrarte la contraseña de " + als[idx3].nombre + ": están cifradas y no se pueden leer.\n\nSi se la olvidó, generale una nueva y te la muestro:\n\n  Resetear pw: " + als[idx3].nombre;
    }
    if (t.includes("pagos pendiente")) {
      var now2 = new Date(); var mk = now2.getFullYear() + "-" + now2.getMonth();
      var pend = filterBySede(als, sedeFilter).filter(function (a) { return !(a.mp || {})[mk] });
      if (!pend.length) return "✓ Todos al día" + sedeLabel;
      return "Pagos pendientes " + MN[now2.getMonth()] + sedeLabel + ":\n" + pend.map(function (a) { return "• " + a.nombre + " — " + a.sede + " — " + a.turno.dia + " " + a.turno.hora }).join("\n") + "\nTotal: " + pend.length
    }
    var masMatch = txt.match(/pagos\s+([\wéáíóú]+)\s+(\d{4})\s*:\s*(.+)/i);
    if (masMatch) {
      var parsed = parseMes(masMatch[1] + " " + masMatch[2]);
      if (!parsed) return "No entendí el mes.";
      var nombres = masMatch[3].split(",").map(function (s) { return s.trim() }).filter(Boolean);
      var ok = [], nf = [];
      for (var ni = 0; ni < nombres.length; ni++) { var idx4 = als.findIndex(function (a) { return a.nombre.toLowerCase().includes(nombres[ni].toLowerCase()) }); if (idx4 === -1) { nf.push(nombres[ni]); continue } await supa("meses_pagados", "POST", "", { alumno_id: als[idx4].id, mes_key: parsed.key }); await supa("historial", "POST", "", { alumno_id: als[idx4].id, accion: "💳 " + MN[parsed.month] + " " + parsed.year }); ok.push(als[idx4].nombre) }
      await refreshData();
      var r2 = "Pago masivo " + MN[parsed.month] + " " + parsed.year + ":";
      if (ok.length) r2 += "\n✓ Registrados (" + ok.length + "):\n" + ok.map(function (n4) { return "  " + n4 }).join("\n");
      if (nf.length) r2 += "\n✗ No encontrados (" + nf.length + "):\n" + nf.map(function (n4) { return "  " + n4 }).join("\n");
      return r2
    }
    if (t.includes("ver alumno") || t === "alumnos" || t === "lista") {
      var filtered2 = filterBySede(als, sedeFilter);
      if (!filtered2.length) return "No hay alumnos" + sedeLabel;
      return "Alumnos" + sedeLabel + ":\n" + filtered2.map(function (a) { var meses = Object.keys(a.mp || {}).map(function (k) { return MN[parseInt(k.split("-")[1])] }).join(", ") || "—"; return "• " + a.nombre + " — " + a.sede + " — " + a.turno.dia + " " + a.turno.hora + " — Pagó: " + meses }).join("\n")
    }
    if (t.includes("alumnos de") || t.includes("alumnos del") || t.includes("planilla")) {
      var td = new Date(); var label = "hoy";
      if (t.includes("mañana")) { td = new Date(); td.setDate(td.getDate() + 1); label = "mañana" }
      else { var dm = t.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/); if (dm) { var ti = DAYS.indexOf(dm[1]); var ci = td.getDay(); var cx = ci === 0 ? 6 : ci - 1; var diff = ti - cx; if (diff <= 0) diff += 7; td = new Date(); td.setDate(td.getDate() + diff); label = dm[1] } }
      var dow = td.getDay(); var dayN = DAYS[dow === 0 ? 6 : dow - 1]; var mk2 = td.getFullYear() + "-" + td.getMonth();
      var list = [];
      filterBySede(als, sedeFilter).forEach(function (a) { if (a.turno.dia !== dayN) return; if (!(a.mp || {})[mk2]) return; var dateObj = new Date(td); var pp = a.turno.hora.split(":"); dateObj.setHours(parseInt(pp[0]), parseInt(pp[1]), 0, 0); var cancelled = (a.canc || []).some(function (c) { return matchDay(c.iso, dateObj) }); if (!cancelled) list.push(a) });
      filterBySede(als, sedeFilter).forEach(function (a) { (a.ex || []).forEach(function (e) { var exD = new Date(e.date); if (dayKey(exD) === dayKey(td) && !list.find(function (x) { return x.id === a.id })) list.push(Object.assign({}, a, { isRec: true })) }) });
      if (!list.length) return "No hay alumnos el " + label + " (" + dayN + ")" + sedeLabel;
      list.sort(function (a, b) { return a.turno.hora.localeCompare(b.turno.hora) });
      return label + " (" + dayN + " " + td.getDate() + "/" + (td.getMonth() + 1) + ")" + sedeLabel + ":\n" + list.map(function (a) { return "• " + a.turno.hora + " — " + a.nombre + (a.isRec ? " (recup)" : "") + " (" + a.sede + ")" }).join("\n") + "\nTotal: " + list.length
    }
    if (t.startsWith("baja") && !t.startsWith("baja profe")) {
      var n5 = txt.replace(/baja\s*:?\s*/i, "").trim(); if (!n5) return "Formato: Baja: Nombre";
      var idx5 = findA(n5); if (idx5 === -1) return "✗ No encontré ese nombre.";
      await supa("alumnos", "PATCH", "?id=eq." + als[idx5].id, { estado: "baja" });
      await supa("historial", "POST", "", { alumno_id: als[idx5].id, accion: "⛔ Baja" });
      await refreshData();
      return "✓ " + als[idx5].nombre + " dado de baja."
    }
    if (t.startsWith("consulta")) {
      var n6 = txt.replace(/consulta\s*:?\s*/i, "").trim(); if (!n6) return "Formato: Consulta: Nombre";
      var idx6 = findA(n6); if (idx6 === -1) return "✗ No encontré ese nombre."; var a6 = als[idx6];
      var meses4 = Object.keys(a6.mp || {});
      var r4 = "✦ " + a6.nombre + "\n📍 " + a6.sede + " · " + a6.turno.dia + " " + a6.turno.hora;
      r4 += "\n💳 Pagó: " + (meses4.length ? meses4.map(function (k) { var p = k.split("-"); return MN[parseInt(p[1])] + " " + p[0] }).join(", ") : "—");
      r4 += "\n🎁 A favor: " + (a6.reg || 0);
      meses4.forEach(function (mk3) { var stats = getMonthStats(a6, mk3); var p = mk3.split("-").map(Number); r4 += "\n\n📅 " + MN[p[1]] + " " + p[0] + ": " + stats.clasesEfectivas + "/" + CLASES_BASE + " clases, " + stats.cancTotal + " canc, " + stats.pendientes + " pend" });
      return r4
    }
    if (t.includes("clase a favor") || t.includes("clase regalo")) {
      var n7 = txt.replace(/clase\s*(de\s*)?(regalo|a\s*favor)\s*:?\s*/i, "").trim();
      if (!n7) return "Formato: Clase a favor: Nombre"; var idx7 = findA(n7); if (idx7 === -1) return "✗ No encontré ese nombre.";
      await supa("alumnos", "PATCH", "?id=eq." + als[idx7].id, { clase_regalo: (als[idx7].reg || 0) + 1 });
      await supa("historial", "POST", "", { alumno_id: als[idx7].id, accion: "🎁 A favor" });
      await refreshData();
      return "✓ Clase a favor para " + als[idx7].nombre
    }
    if (t.startsWith("cuota") && t.includes("/")) {
      var cMatch = txt.match(/cuota\s*:?\s*(.+)/i);
      if (!cMatch) return "Formato: cuota: Sede / 1x|2x / forma_pago / hasta7 / 8a14 / desde15";
      var cParts = cMatch[1].split("/").map(function (s) { return s.trim() });
      if (cParts.length < 6) return "Formato: cuota: Sede / 1x|2x / forma_pago / hasta7 / 8a14 / desde15";
      var cSede = cParts[0].toLowerCase().includes("palermo") ? "Palermo" : "San Isidro";
      var cFreq = cParts[1]; var cForma = cParts[2].toLowerCase();
      var cV1 = parseInt(cParts[3]), cV2 = parseInt(cParts[4]), cV3 = parseInt(cParts[5]);
      if (isNaN(cV1) || isNaN(cV2) || isNaN(cV3)) return "Los valores deben ser números.";
      var existing = cuotas.find(function (c) { return c.sede === cSede && c.frecuencia === cFreq && c.forma_pago === cForma });
      if (existing) { await supa("cuotas", "PATCH", "?id=eq." + existing.id, { hasta_dia_7: cV1, dia_8_al_14: cV2, desde_dia_15: cV3 }) }
      else { await supa("cuotas", "POST", "", { sede: cSede, frecuencia: cFreq, forma_pago: cForma, hasta_dia_7: cV1, dia_8_al_14: cV2, desde_dia_15: cV3 }) }
      await refreshData();
      return "✓ Cuota actualizada: " + cSede + " / " + cFreq + " / " + cForma + "\n" + fmtMoney(cV1) + " / " + fmtMoney(cV2) + " / " + fmtMoney(cV3);
    }
    if (t.includes("ver cuota") || t === "cuotas" || t.includes("precios")) {
      if (!cuotas.length) return "No hay cuotas cargadas.";
      var r5 = "Cuotas actuales:\n";
      ["San Isidro", "Palermo"].forEach(function (sede) { r5 += "\n📍 " + sede + ":\n"; ["1x", "2x"].forEach(function (freq) { var rows = cuotas.filter(function (c) { return c.sede === sede && c.frecuencia === freq }); if (!rows.length) return; r5 += "  " + freq + "/sem:\n"; rows.forEach(function (row) { r5 += "    " + row.forma_pago + ": " + fmtMoney(row.hasta_dia_7) + " / " + fmtMoney(row.dia_8_al_14) + " / " + fmtMoney(row.desde_dia_15) + "\n" }) }) });
      return r5;
    }
    if (t.startsWith("frecuencia") || t.startsWith("freq")) {
      var fMatch = txt.match(/(?:frecuencia|freq)\s*:?\s*(.+?)\s*[\/\-]\s*(1x|2x)/i);
      if (!fMatch) return "Formato: frecuencia: Nombre / 2x";
      var fIdx = findA(fMatch[1].trim()); if (fIdx === -1) return "✗ No encontré ese nombre.";
      await supa("alumnos", "PATCH", "?id=eq." + als[fIdx].id, { frecuencia: fMatch[2] });
      await refreshData();
      return "✓ " + als[fIdx].nombre + " → frecuencia: " + fMatch[2] + "/semana";
    }
    // ALTA ALUMNO
    var hasSlashes = txt.includes("/");
    var looksLikeAlta = t.includes("alta") || (hasSlashes && (t.includes("palermo") || t.includes("san isidro") || t.includes("isidro")));
    if (looksLikeAlta && !t.startsWith("alta profe") && !t.startsWith("cuota") && !t.startsWith("abrir") && !t.startsWith("cerrar") && !t.startsWith("cancelar") && !t.startsWith("agendar") && !t.startsWith("frecuencia") && !t.startsWith("freq")) {
      var parts2 = txt.split("/").map(function (s) { return s.trim() });
      if (parts2.length < 3) return "Formato: Nombre / Sede / día hora";
      var nom3 = parts2[0].replace(/alta\s*(de\s*)?alumno\s*:?\s*/i, "").trim();
      var sedePart = parts2.length >= 4 ? parts2[parts2.length - 2] : parts2[1];
      var turnoPart = parts2[parts2.length - 1];
      if (parts2.length === 4 && !parts2[1].toLowerCase().includes("palermo") && !parts2[1].toLowerCase().includes("isidro")) { sedePart = parts2[2]; turnoPart = parts2[3] }
      var sede2 = sedePart.toLowerCase().includes("palermo") ? "Palermo" : "San Isidro";
      var tm = normDay(turnoPart.toLowerCase()).match(/(lunes|martes|miércoles|jueves|viernes|sábado)\s+(\d{1,2}:\d{2})/);
      if (!tm) return "No entendí el turno. Ej: martes 14:30";
      var sk = tm[1] + "-" + tm[2];
      if (SCHED[sede2].indexOf(sk) === -1) return "✗ No existe ese horario en " + sede2 + ".\nDisponibles: " + SCHED[sede2].map(function (s) { return s.replace("-", " ") }).join(", ");
      var newPw = genPw("eves");
      var res2 = await supa("alumnos", "POST", "", { nombre: nom3, sede: sede2, turno_dia: tm[1], turno_hora: tm[2], password: newPw, clase_regalo: 0, estado: "activo", pend_arrastre: 0 });
      if (res2) { await refreshData(); return "✓ Alta: " + nom3 + " — " + sede2 + " " + tm[1] + " " + tm[2] + "\nContraseña: " + newPw }
      return "✗ Error al crear alumno."
    }
    if (t.includes("pago")) {
      var match = txt.match(/pago\s*(recibido|confirmado|ok)\s*:?\s*(.+)/i);
      if (!match) return "Formato: Pago recibido: Nombre (marzo 2026)";
      var rest = match[2].trim(); var mesM = rest.match(/\(([^)]+)\)/);
      if (!mesM) return "Incluí el mes entre paréntesis.";
      var parsed2 = parseMes(mesM[1]); if (!parsed2) return "No entendí el mes.";
      var n8 = rest.replace(/\([^)]+\)/, "").trim(); var idx8 = findA(n8);
      if (idx8 === -1) return "✗ No encontré ese nombre."; var al8 = als[idx8];
      await supa("meses_pagados", "POST", "", { alumno_id: al8.id, mes_key: parsed2.key });
      await supa("historial", "POST", "", { alumno_id: al8.id, accion: "💳 " + MN[parsed2.month] + " " + parsed2.year });
      await refreshData();
      return "✓ " + al8.nombre + " — " + MN[parsed2.month] + " " + parsed2.year
    }
    // === MENSAJES ===
    if (t.startsWith("mensaje general") || t.startsWith("aviso general") || t.startsWith("aviso a todos")) {
      var msgGen = txt.replace(/^(mensaje general|aviso general|aviso a todos)\s*:?\s*/i, "").trim();
      if (!msgGen) return "Formato: Mensaje general: [tu texto]";
      await supa("mensajes", "POST", "", { alumno_id: null, texto: msgGen, es_general: true, leido: false });
      await refreshData();
      return "✓ Mensaje general enviado a TODAS las alumnas.\n\n\"" + msgGen + "\"";
    }
    // Mensaje segmentado por sede: "Mensaje San Isidro: ..." / "Mensaje Palermo: ..."
    var sedeMatch = txt.match(/^mensaje\s+(san isidro|palermo)\s*:\s*/i);
    if (sedeMatch) {
      var sedeVal = sedeMatch[1].toLowerCase() === "palermo" ? "Palermo" : "San Isidro";
      var textoSede = txt.slice(sedeMatch[0].length).trim();
      if (!textoSede) return "Formato: Mensaje " + sedeVal + ": [tu texto]";
      await supa("mensajes", "POST", "", { alumno_id: null, texto: textoSede, es_general: false, leido: false, filtro_sede: sedeVal });
      await refreshData();
      var countSede = als.filter(function (a) { return a.sede === sedeVal }).length;
      return "✓ Mensaje enviado a las alumnas de " + sedeVal + " (" + countSede + ").\n\n\"" + textoSede + "\"";
    }
    // Mensaje segmentado por día (+ hora opcional): "Mensaje jueves: ..." o "Mensaje jueves 18:30: ..."
    var diaMatch = txt.match(/^mensaje\s+(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)(\s+(\d{1,2}:\d{2}))?\s*:\s*/i);
    if (diaMatch) {
      var diaVal = diaMatch[1].toLowerCase().replace("miercoles", "miércoles").replace("sabado", "sábado");
      var horaVal = diaMatch[3] || null;
      var textoDia = txt.slice(diaMatch[0].length).trim();
      if (!textoDia) return "Formato: Mensaje " + diaVal + (horaVal ? " " + horaVal : "") + ": [tu texto]";
      var payloadDia = { alumno_id: null, texto: textoDia, es_general: false, leido: false, filtro_dia: diaVal };
      if (horaVal) payloadDia.filtro_hora = horaVal;
      await supa("mensajes", "POST", "", payloadDia);
      await refreshData();
      var countDia = als.filter(function (a) { return a.turno.dia === diaVal && (!horaVal || a.turno.hora === horaVal) }).length;
      return "✓ Mensaje enviado a las alumnas de " + diaVal + (horaVal ? " " + horaVal : "") + " (" + countDia + ").\n\n\"" + textoDia + "\"";
    }
    // Mensaje a deudoras
    if (t.startsWith("mensaje deudoras") || t.startsWith("mensaje a deudoras") || t.startsWith("mensaje deudores")) {
      var textoDeuda = txt.replace(/^mensaje\s*(a\s*)?(deudoras|deudores)\s*:?\s*/i, "").trim();
      if (!textoDeuda) return "Formato: Mensaje deudoras: [tu texto]";
      await supa("mensajes", "POST", "", { alumno_id: null, texto: textoDeuda, es_general: false, leido: false, filtro_deuda: true });
      await refreshData();
      return "✓ Mensaje enviado a las alumnas con pagos pendientes.\n\n\"" + textoDeuda + "\"";
    }
    if (t.startsWith("mensaje a") || t.startsWith("mensaje para")) {
      var mm = txt.replace(/^mensaje (a|para)\s*:?\s*/i, "").trim();
      var partsM = mm.split("/");
      if (partsM.length < 2) return "Formato: Mensaje a: Nombre / [tu texto]";
      var idxM = findA(partsM[0].trim());
      if (idxM === -1) return "✗ No encontré ese nombre.";
      var textoM = partsM.slice(1).join("/").trim();
      await supa("mensajes", "POST", "", { alumno_id: als[idxM].id, texto: textoM, es_general: false, leido: false });
      await refreshData();
      return "✓ Mensaje enviado a " + als[idxM].nombre + ":\n\"" + textoM + "\"";
    }
    if (t.includes("ver mensajes") || t.includes("mensajes enviados")) {
      var msgs = await supa("mensajes", "GET", "?order=created_at.desc&limit=20");
      if (!msgs || !msgs.length) return "No hay mensajes enviados.";
      return "✦ Últimos mensajes:\n\n" + msgs.map(function (m) {
        var dest;
        if (m.alumno_id) dest = (als.find(function (a) { return a.id === m.alumno_id }) || {}).nombre || "?";
        else if (m.filtro_deuda) dest = "DEUDORAS";
        else if (m.filtro_dia) dest = m.filtro_dia + (m.filtro_hora ? " " + m.filtro_hora : "");
        else if (m.filtro_sede) dest = m.filtro_sede;
        else dest = "TODAS";
        return "→ " + dest + (m.leido ? " (leído)" : "") + "\n  \"" + m.texto.slice(0, 50) + (m.texto.length > 50 ? "..." : "") + "\"";
      }).join("\n\n");
    }
    if (t.startsWith("borrar mensajes generales") || t.startsWith("eliminar mensajes generales")) {
      await supa("mensajes", "DELETE", "?es_general=eq.true");
      await refreshData();
      return "✓ Mensajes generales borrados.";
    }
    if (t.startsWith("borrar todos los mensajes")) {
      await supa("mensajes", "DELETE", "?id=gte.0");
      await refreshData();
      return "✓ Todos los mensajes borrados.";
    }
    // === EXCEPCIÓN (puede reservar sin pagar) ===
    if (t.startsWith("excepcion") || t.startsWith("excepción")) {
      var quitarExc = t.includes("quitar") || t.includes("sacar") || t.includes("desactivar");
      var nombreExc = txt.replace(/^excepci[oó]n\s*(quitar|sacar|desactivar)?\s*:?\s*/i, "").trim();
      if (!nombreExc) return "Formato: Excepción: Nombre (para activar) · Excepción quitar: Nombre (para sacar)";
      var idxExc = findA(nombreExc);
      if (idxExc === -1) return "✗ No encontré ese nombre.";
      await supa("alumnos", "PATCH", "?id=eq." + als[idxExc].id, { excepcion: !quitarExc });
      await supa("historial", "POST", "", { alumno_id: als[idxExc].id, accion: quitarExc ? "Excepción quitada" : "⭐ Excepción activada — puede reservar sin pago" });
      await refreshData();
      return (quitarExc ? "✓ Excepción quitada a " : "✓ Excepción activada para ") + als[idxExc].nombre + (quitarExc ? "." : ". Ahora puede reservar sin necesidad de pagar.");
    }
    return "No entendí. Probá: ver alumnos, alta, baja, pago recibido, pagos masivo, consulta, clase a favor, resetear pw, alumnos de hoy, pagos pendientes, alta profe, ver profes, notificaciones, ver cuotas, cuota, frecuencia, mensaje general, mensaje a: Nombre, mensaje [día], mensaje [sede], mensaje deudoras, ver mensajes, excepción"
  }

  async function send() {
    if (!inp.trim() || busy) return; var txt = inp; setInp("");
    setMsgs(function (p) { return p.concat({ from: "user", text: txt }) });
    setBusy(true);
    var resp = await respond(txt);
    setMsgs(function (p) { return p.concat({ from: "bot", text: resp }) });
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: cream }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {msgs.map(function (m, i) { var isBot = m.from === "bot"; return (<div key={i} style={{ display: "flex", justifyContent: isBot ? "flex-start" : "flex-end", marginBottom: 10 }}><div style={{ maxWidth: "85%", padding: "11px 15px", borderRadius: isBot ? "4px 14px 14px 14px" : "14px 4px 14px 14px", background: isBot ? white : navy, color: isBot ? navy : cream, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", fontFamily: ft, border: isBot ? "1px solid " + grayBlue : "none" }}>{m.text}</div></div>) })}
        {busy ? <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}><div style={{ padding: "11px 15px", borderRadius: "4px 14px 14px 14px", background: white, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, color: grayWarm }}>Procesando...</div></div> : null}
        <div ref={ref} /></div>
      <div style={{ padding: 12, borderTop: "1px solid " + grayBlue, display: "flex", gap: 8, background: white }}>
        <input value={inp} onChange={function (e) { setInp(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") send() }} placeholder="Escribí un comando..." style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, outline: "none", fontFamily: ft, background: cream }} />
        <button onClick={send} disabled={busy} style={{ padding: "11px 22px", borderRadius: 10, background: busy ? grayWarm : copper, color: white, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 700, fontFamily: ft }}>Enviar</button>
      </div></div>);
}

// ====== LOGIN GENERICO ======
function GenericLogin(props) {
  var table = props.table, onLogin = props.onLogin, subtitle = props.subtitle, skipPw = props.skipPw;
  var _nom = useState(""), nom = _nom[0], setNom = _nom[1];
  var _pw = useState(""), pw = _pw[0], setPw = _pw[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  async function doLogin() {
    setErr(""); setBusy(true);
    var searchName = nom.trim().toLowerCase();
    if (!searchName) { setErr("Ingresá tu nombre."); setBusy(false); return }

    // El admin entra "como" una alumna o profesora sin pedir contraseña.
    if (skipPw) {
      var queryParams = "?order=nombre&limit=1000&select=" + (table === "alumnos" ? "id,nombre,tel,email,sede,turno_dia,turno_hora,clase_regalo,estado,pend_arrastre,created_at,frecuencia,turno2_dia,turno2_hora,excepcion,descuento" : "id,nombre,sedes,horarios,encargada,created_at,puede_stock,toma_lista,puede_produccion,ve_resultados") + (table === "alumnos" ? "&estado=eq.activo" : "");
      var rows = await supa(table, "GET", queryParams);
      setBusy(false);
      if (!rows || rows.length === 0) { setErr("Error al conectar. Intentá de nuevo."); return }
      var found = rows.find(function (item) { return item.nombre.toLowerCase() === searchName }) || rows.find(function (item) { return item.nombre.toLowerCase().includes(searchName) });
      if (!found) { setErr("No encontramos ese nombre."); return }
      onLogin(found); return;
    }

    // Con contraseña: la verifica el servidor. Acá nunca se compara nada.
    var r = await pedirLogin(table === "alumnos" ? "alumna" : "profesora", nom, pw);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return }
    onLogin({ id: r.id, nombre: r.nombre });
  }
  var iStyle = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, background: white, outline: "none", boxSizing: "border-box" };
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: cream }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy, margin: "0 0 4px" }}>EVES POTTERY</p>
          <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft, margin: 0 }}>{subtitle || "Accedé a tus clases"}</p></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: navy, fontFamily: ft, marginBottom: 4, display: "block" }}>Nombre completo</label>
            <input value={nom} onChange={function (e) { setNom(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter" && skipPw) doLogin() }} placeholder="Tu nombre" style={iStyle} /></div>
          {!skipPw ? <div><label style={{ fontSize: 12, fontWeight: 600, color: navy, fontFamily: ft, marginBottom: 4, display: "block" }}>Contraseña</label>
            <input type="password" value={pw} onChange={function (e) { setPw(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") doLogin() }} placeholder="Tu contraseña" style={iStyle} /></div> : null}
          {err ? <p style={{ color: "#991b1b", fontSize: 13, margin: 0, fontFamily: ft }}>{err}</p> : null}
          <button onClick={doLogin} disabled={busy} style={{ padding: "12px", borderRadius: 10, background: copper, color: white, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ft, fontSize: 14, width: "100%" }}>{busy ? "Verificando..." : "Entrar"}</button>
          {!skipPw ? <p style={{ color: grayWarm, fontSize: 12, fontFamily: ft, margin: 0, textAlign: "center" }}>¿No tenés tu contraseña? Pedísela al equipo.</p> : null}
        </div></div></div>);
}

// ====== STOCK DEL TALLER ======
function letraStock(i) { var s = ""; i = Math.floor(i); while (i >= 0) { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1 } return s }
function fotoUrlStock(path) { return SUPA_URL + "/storage/v1/object/public/stock/" + path }
function capStock(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1) }
function numStock(v) { var n = Number(v); return isNaN(n) ? 0 : n }
function fmtCantStock(v) { var n = numStock(v); var r = Math.round(n * 100) / 100; return String(r).replace(".", ",") }
function etiquetasStock(cat, prod) {
  if (!cat) return [];
  if (!cat.usa_letras) return [cat.singular + " " + prod.numero];
  var n = Math.max(1, Math.round(numStock(prod.cantidad)));
  if (n > 60) n = 60;
  var out = []; for (var i = 0; i < n; i++) out.push(cat.singular + " " + prod.numero + "." + letraStock(i));
  return out;
}
function comprimirFotoStock(file) {
  return new Promise(function (resolve) {
    try {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          var max = 1400; var w = img.width, h = img.height;
          var esc = Math.min(1, max / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * esc)), ch = Math.max(1, Math.round(h * esc));
          var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
          var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cw, ch);
          cx.drawImage(img, 0, 0, cw, ch);
          cv.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b || file) }, "image/jpeg", 0.75);
        } catch (e) { URL.revokeObjectURL(url); resolve(file) }
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file) };
      img.src = url;
    } catch (e) { resolve(file) }
  });
}
async function subirFotoStock(blob, path) {
  try {
    var r = await fetch(SUPA_URL + "/storage/v1/object/stock/" + path, {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": blob.type || "image/jpeg", "x-upsert": "true" },
      body: blob
    });
    if (!r.ok) { console.error("Storage error:", await r.text()); return null }
    return path;
  } catch (e) { console.error("Storage error:", e); return null }
}

var stBtn = function (bg, col) { return { width: "100%", padding: "16px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600, fontFamily: ft, background: bg, color: col } };
var stBtnGhost = { width: "100%", padding: "13px", borderRadius: 12, border: "1px solid " + grayBlue, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: ft, background: "transparent", color: grayWarm };
var stField = { width: "100%", padding: "13px", borderRadius: 11, border: "1px solid " + grayBlue, fontSize: 16, fontFamily: ft, color: navy, background: white, boxSizing: "border-box" };
var stLbl = { margin: "0 0 6px", fontSize: 11, letterSpacing: "1.2px", textTransform: "uppercase", color: grayWarm, fontWeight: 700, fontFamily: ft };
var stChip = function (on) { return { padding: "8px 13px", borderRadius: 999, border: "1px solid " + (on ? navy : grayBlue), background: on ? navy : white, color: on ? cream : navy, fontSize: 13.5, fontFamily: ft, cursor: "pointer" } };

function StockPanel(props) {
  var quien = props.quien || "", esAdmin = !!props.esAdmin;
  var _cats = useState([]), cats = _cats[0], setCats = _cats[1];
  var _subs = useState([]), subs = _subs[0], setSubs = _subs[1];
  var _prods = useState([]), prods = _prods[0], setProds = _prods[1];
  var _fotos = useState([]), fotos = _fotos[0], setFotos = _fotos[1];
  var _cargando = useState(true), cargando = _cargando[0], setCargando = _cargando[1];
  var _pant = useState("inicio"), pant = _pant[0], setPant = _pant[1];
  var _cat = useState(null), cat = _cat[0], setCat = _cat[1];
  var _ultimo = useState(null), ultimo = _ultimo[0], setUltimo = _ultimo[1];
  var _ficha = useState(null), ficha = _ficha[0], setFicha = _ficha[1];
  var _busca = useState(""), busca = _busca[0], setBusca = _busca[1];
  var _filtro = useState(null), filtro = _filtro[0], setFiltro = _filtro[1];
  var _bienv = useState(false), bienv = _bienv[0], setBienv = _bienv[1];

  var cargar = useCallback(async function () {
    var res = await Promise.all([
      supa("stock_categorias", "GET", "?order=orden"),
      supa("stock_subcategorias", "GET", "?order=id"),
      supa("stock_productos", "GET", "?estado=eq.activo&order=id.desc"),
      supa("stock_fotos", "GET", "?order=orden")
    ]);
    setCats(res[0] || []); setSubs(res[1] || []); setProds(res[2] || []); setFotos(res[3] || []);
    setCargando(false);
  }, []);
  useEffect(function () { cargar() }, [cargar]);
  useEffect(function () {
    try { if (!window.localStorage.getItem("ep_stock_bienv")) setBienv(true) } catch (e) {}
  }, []);

  function cerrarBienv() { try { window.localStorage.setItem("ep_stock_bienv", "1") } catch (e) {} setBienv(false) }
  function catDe(id) { for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i]; return null }
  function fotosDe(pid) { return fotos.filter(function (f) { return f.producto_id === pid }) }
  function portadaDe(pid) { var fs = fotosDe(pid); if (!fs.length) return null; var p = fs.filter(function (f) { return f.es_principal })[0]; return p || fs[0] }
  function lugaresUsados() {
    var out = []; prods.forEach(function (p) { if (p.lugar && out.indexOf(p.lugar) === -1) out.push(p.lugar) });
    return out.slice(0, 6);
  }

  if (cargando) return <div style={{ padding: 30, textAlign: "center", fontFamily: ft, color: grayWarm }}>Cargando el stock…</div>;

  // ---------- BIENVENIDA ----------
  if (bienv) {
    return (
      <div style={{ padding: "22px 18px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 13, minHeight: "100%" }}>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 30, color: navy, lineHeight: 1.1 }}>Hola{quien ? " " + quien : ""}</p>
        <p style={{ margin: 0, fontSize: 16, color: navy, lineHeight: 1.5 }}>Vamos a armar entre todas un archivo ordenado de todo lo que hay en el taller.</p>
        <p style={{ margin: 0, fontSize: 16, color: navy, lineHeight: 1.5 }}>Es simple: sacás una foto de cada cosa, le pegás un número con cinta, y yo la guardo. Así después cualquiera encuentra lo que busca.</p>
        <p style={{ margin: 0, fontSize: 16, color: navy, lineHeight: 1.5 }}>Empezá por donde quieras. Podés parar y seguir cuando quieras.</p>
        <p style={{ margin: 0, fontSize: 16, color: navy, lineHeight: 1.5, fontWeight: 600 }}>Y no te preocupes por equivocarte: todo se puede editar después.</p>
        <div style={{ flex: 1 }}></div>
        <button onClick={cerrarBienv} style={stBtn(copper, white)}>Empezar</button>
      </div>);
  }

  // ---------- INICIO: elegir tipo ----------
  if (pant === "inicio") {
    return (
      <div style={{ padding: "16px 15px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Qué vas a cargar?</p>
          <button onClick={function () { setFiltro(null); setBusca(""); setPant("galeria") }} style={{ padding: "7px 12px", borderRadius: 9, border: "1px solid " + grayBlue, background: white, color: navy, fontSize: 13, fontFamily: ft, cursor: "pointer", fontWeight: 600 }}>Buscar</button>
        </div>
        {cats.filter(function (c) { return c.activa }).map(function (c) {
          var n = prods.filter(function (p) { return p.categoria_id === c.id }).length;
          return (
            <button key={c.id} onClick={function () { setCat(c); setPant("intro") }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: white, border: "1px solid " + grayBlue, borderRadius: 12, padding: "14px 14px", cursor: "pointer", fontFamily: ft, textAlign: "left" }}>
              <span style={{ fontSize: 16.5, fontWeight: 600, color: navy }}>{capStock(c.nombre)}</span>
              <span style={{ fontSize: 12.5, color: grayWarm }}>{n === 0 ? "ninguno todavía" : n + (n === 1 ? " cargado" : " cargados")}</span>
            </button>);
        })}
        <NuevaCategoriaStock cats={cats} onCreada={cargar} />
        <button onClick={function () { setBienv(true) }} style={{ background: "none", border: "none", color: grayWarm, fontSize: 13, fontFamily: ft, cursor: "pointer", marginTop: 6, textDecoration: "underline" }}>Volver a ver la explicación</button>
      </div>);
  }

  // ---------- INTRO de la categoría ----------
  if (pant === "intro" && cat) {
    var yaCargados = prods.filter(function (p) { return p.categoria_id === cat.id }).length;
    return (
      <div style={{ padding: "16px 16px 22px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 12, minHeight: "100%" }}>
        <button onClick={function () { setCat(null); setPant("inicio") }} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0, textAlign: "left" }}>← Volver</button>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 28, color: navy, lineHeight: 1.1 }}>{capStock(cat.nombre)}</p>
        {(cat.instruccion || "").split("\n").map(function (linea, i) {
          return <p key={i} style={{ margin: 0, fontSize: 15.5, color: "#4A5663", lineHeight: 1.5 }}>{linea}</p>;
        })}
        <div style={{ flex: 1, minHeight: 10 }}></div>
        <button onClick={function () { setPant("alta") }} style={stBtn(copper, white)}>Sacar la primera foto</button>
        {yaCargados > 0 ? <button onClick={function () { setFiltro(cat.id); setBusca(""); setPant("galeria") }} style={stBtnGhost}>Ver los {yaCargados} que ya cargué</button> : null}
      </div>);
  }

  // ---------- ALTA ----------
  if (pant === "alta" && cat) {
    return <StockAlta cat={cat} subs={subs.filter(function (s) { return s.categoria_id === cat.id && s.activa })}
      lugares={lugaresUsados()} quien={quien}
      onCancelar={function () { setPant("intro") }}
      onGuardado={async function (prod) { await cargar(); setUltimo(prod); setPant("ok") }}
      onSubCreada={cargar} />;
  }

  // ---------- OK con el número ----------
  if (pant === "ok" && ultimo && cat) {
    var etiq = etiquetasStock(cat, ultimo);
    return (
      <div style={{ background: navy, minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "26px 20px", fontFamily: ft }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: "1.6px", textTransform: "uppercase", color: gold, fontWeight: 700 }}>✓ Guardado</p>
        <p style={{ margin: "12px 0 0", fontSize: 15, color: grayBlue }}>Este es el</p>
        <p style={{ margin: "2px 0 0", fontSize: 21, color: cream, fontWeight: 600 }}>{cat.singular} N°</p>
        <p style={{ margin: "2px 0 0", fontFamily: "'Instrument Serif',serif", fontSize: 104, lineHeight: 0.95, color: copper }}>{ultimo.numero}</p>
        <div style={{ marginTop: 16, padding: "13px 15px", border: "1px dashed " + gold, borderRadius: 11, background: "rgba(208,180,143,0.12)", color: cream, fontSize: 15, lineHeight: 1.45 }}>
          {etiq.length === 1
            ? <span>Pegale una etiqueta con<br /><b style={{ fontSize: 19 }}>{etiq[0]}</b></span>
            : <span>Son {etiq.length}. Pegá una etiqueta en cada uno:<br /><b style={{ fontSize: 17, lineHeight: 1.6 }}>{etiq.join(" · ")}</b></span>}
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9, marginTop: 24 }}>
          <button onClick={function () { setUltimo(null); setPant("alta") }} style={stBtn(copper, white)}>Cargar otro</button>
          <button onClick={function () { setUltimo(null); setCat(null); setPant("inicio") }} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, fontFamily: ft, background: "transparent", color: grayBlue }}>Terminé por hoy</button>
        </div>
      </div>);
  }

  // ---------- FICHA ----------
  if (pant === "ficha" && ficha) {
    return <StockFicha prod={ficha} cat={catDe(ficha.categoria_id)} fotos={fotosDe(ficha.id)} esAdmin={esAdmin}
      subs={subs.filter(function (s) { return s.categoria_id === ficha.categoria_id })}
      onVolver={function () { setFicha(null); setPant("galeria") }}
      onCambio={async function () { await cargar(); setFicha(null); setPant("galeria") }} />;
  }

  // ---------- GALERÍA ----------
  var lista = prods.filter(function (p) {
    if (filtro && p.categoria_id !== filtro) return false;
    var q = busca.trim().toLowerCase();
    if (!q) return true;
    var c = catDe(p.categoria_id);
    var txt = [p.nombre || "", p.descripcion || "", p.lugar || "", String(p.numero), c ? c.nombre : "", c ? c.singular + " " + p.numero : ""].join(" ").toLowerCase();
    return txt.indexOf(q) !== -1;
  });
  return (
    <div style={{ padding: "14px 14px 22px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={function () { setPant("inicio") }} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0 }}>← Volver</button>
      </div>
      <input value={busca} onChange={function (e) { setBusca(e.target.value) }} placeholder="Buscar: número, nombre, lugar…" style={stField} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button onClick={function () { setFiltro(null) }} style={stChip(!filtro)}>Todo</button>
        {cats.filter(function (c) { return c.activa }).map(function (c) {
          return <button key={c.id} onClick={function () { setFiltro(c.id) }} style={stChip(filtro === c.id)}>{capStock(c.nombre)}</button>;
        })}
      </div>
      {lista.length === 0 ? <p style={{ color: grayWarm, fontSize: 15, textAlign: "center", padding: "24px 0", margin: 0 }}>No hay nada cargado todavía acá.</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {lista.map(function (p) {
          var c = catDe(p.categoria_id); var f = portadaDe(p.id);
          return (
            <button key={p.id} onClick={function () { setFicha(p); setPant("ficha") }} style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 11, overflow: "hidden", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: ft }}>
              <div style={{ position: "relative", height: 108, background: cream }}>
                {f ? <img src={fotoUrlStock(f.path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}
                <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(19,36,53,0.86)", color: cream, fontSize: 10.5, fontWeight: 700, padding: "3px 7px", borderRadius: 6 }}>{c ? c.singular + " " + p.numero : p.numero}</span>
              </div>
              <div style={{ padding: "7px 8px 9px" }}>
                <b style={{ display: "block", fontSize: 13, fontWeight: 600, color: navy, lineHeight: 1.25 }}>{p.nombre || (p.descripcion || "").slice(0, 30) || "Sin nombre"}</b>
                <span style={{ fontSize: 11, color: grayWarm }}>{fmtCantStock(p.cantidad)} {p.unidad}{p.lugar ? " · " + p.lugar : ""}</span>
              </div>
            </button>);
        })}
      </div>
    </div>);
}

function NuevaCategoriaStock(props) {
  var _abierto = useState(false), abierto = _abierto[0], setAbierto = _abierto[1];
  var _n = useState(""), n = _n[0], setN = _n[1];
  var _sg = useState(""), sg = _sg[0], setSg = _sg[1];
  var _guard = useState(false), guard = _guard[0], setGuard = _guard[1];
  async function crear() {
    var nom = n.trim(); if (!nom) return;
    setGuard(true);
    var maxOrden = 0; props.cats.forEach(function (c) { if (c.orden > maxOrden) maxOrden = c.orden });
    await supa("stock_categorias", "POST", "", { nombre: nom, singular: (sg.trim() || nom), orden: maxOrden + 1 });
    setGuard(false); setN(""); setSg(""); setAbierto(false);
    if (props.onCreada) props.onCreada();
  }
  if (!abierto) return <button onClick={function () { setAbierto(true) }} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "1px dashed " + grayBlue, background: "transparent", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer" }}>+ Agregar otro tipo de cosa</button>;
  return (
    <div style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 12, padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
      <p style={stLbl}>¿Qué tipo de cosa querés agregar?</p>
      <input value={n} onChange={function (e) { setN(e.target.value) }} placeholder="Por ejemplo: cajas, repuestos" style={stField} />
      <p style={stLbl}>¿Cómo se dice de a una?</p>
      <input value={sg} onChange={function (e) { setSg(e.target.value) }} placeholder="Por ejemplo: caja, repuesto" style={stField} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={crear} disabled={guard || !n.trim()} style={Object.assign({}, stBtn(copper, white), { padding: "12px", fontSize: 15, opacity: guard || !n.trim() ? 0.5 : 1 })}>{guard ? "Guardando…" : "Guardar"}</button>
        <button onClick={function () { setAbierto(false); setN(""); setSg("") }} style={stBtnGhost}>Cancelar</button>
      </div>
    </div>);
}

function StockAlta(props) {
  var cat = props.cat, subs = props.subs, lugares = props.lugares;
  var _paso = useState(1), paso = _paso[0], setPaso = _paso[1];
  var _imgs = useState([]), imgs = _imgs[0], setImgs = _imgs[1];
  var _cant = useState(1), cant = _cant[0], setCant = _cant[1];
  var _unidad = useState(cat.unidad_default || "unidades"), unidad = _unidad[0], setUnidad = _unidad[1];
  var _lugar = useState(""), lugar = _lugar[0], setLugar = _lugar[1];
  var _nombre = useState(""), nombre = _nombre[0], setNombre = _nombre[1];
  var _desc = useState(""), desc = _desc[0], setDesc = _desc[1];
  var _subId = useState(null), subId = _subId[0], setSubId = _subId[1];
  var _nuevaSub = useState(""), nuevaSub = _nuevaSub[0], setNuevaSub = _nuevaSub[1];
  var _addSub = useState(false), addSub = _addSub[0], setAddSub = _addSub[1];
  var _guardando = useState(false), guardando = _guardando[0], setGuardando = _guardando[1];
  var _error = useState(""), error = _error[0], setError = _error[1];
  var fileRef = useRef(null);

  var UNIDADES = ["unidades", "kilos", "bolsas", "baldes"];
  var cabecera = <p style={Object.assign({}, stLbl, { margin: 0 })}>{cat.singular} nuevo · paso {paso} de 4</p>;

  async function elegirFoto(e) {
    var fs = e.target.files; if (!fs || !fs.length) return;
    setError("");
    var nuevos = [];
    for (var i = 0; i < fs.length; i++) {
      var b = await comprimirFotoStock(fs[i]);
      nuevos.push({ blob: b, url: URL.createObjectURL(b) });
    }
    setImgs(function (prev) { return prev.concat(nuevos) });
    if (fileRef.current) fileRef.current.value = "";
  }
  function quitarFoto(i) {
    setImgs(function (prev) { var c = prev.slice(); try { URL.revokeObjectURL(c[i].url) } catch (e) {} c.splice(i, 1); return c });
  }
  async function crearSub() {
    var nom = nuevaSub.trim(); if (!nom) return;
    var r = await supa("stock_subcategorias", "POST", "", { categoria_id: cat.id, nombre: nom });
    if (r && r[0]) { setSubId(r[0].id); if (props.onSubCreada) props.onSubCreada() }
    setNuevaSub(""); setAddSub(false);
  }
  async function guardar() {
    if (!imgs.length) { setError("Falta la foto."); setPaso(1); return }
    setGuardando(true); setError("");
    var carpeta = "p" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    var paths = [];
    for (var i = 0; i < imgs.length; i++) {
      var p = await subirFotoStock(imgs[i].blob, carpeta + "/" + (i + 1) + ".jpg");
      if (!p) { setGuardando(false); setError("No se pudo subir la foto. Fijate que tengas señal y probá de nuevo."); return }
      paths.push(p);
    }
    var body = {
      categoria_id: cat.id, nombre: nombre.trim() || null, descripcion: desc.trim() || null,
      lugar: lugar.trim() || null, cantidad: cant, unidad: unidad,
      subcategoria_id: subId, creado_por: props.quien || null
    };
    var r = await supa("stock_productos", "POST", "", body);
    if (!r || !r[0]) { setGuardando(false); setError("No se pudo guardar. Probá de nuevo."); return }
    var prod = r[0];
    for (var j = 0; j < paths.length; j++) {
      await supa("stock_fotos", "POST", "", { producto_id: prod.id, path: paths[j], es_principal: j === 0, orden: j });
    }
    setGuardando(false);
    props.onGuardado(prod);
  }

  var wrap = { padding: "16px 16px 22px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 12, minHeight: "100%" };

  if (paso === 1) {
    return (
      <div style={wrap}>
        {cabecera}
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>{imgs.length ? "¿Salió bien la foto?" : "Sacale una foto"}</p>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={elegirFoto} style={{ display: "none" }} />
        {imgs.length === 0
          ? <button onClick={function () { fileRef.current && fileRef.current.click() }} style={Object.assign({}, stBtn(copper, white), { padding: "22px" })}>📷 Abrir la cámara</button>
          : (<>
            <div style={{ display: "grid", gridTemplateColumns: imgs.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
              {imgs.map(function (im, i) {
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={im.url} alt="" style={{ width: "100%", height: imgs.length > 1 ? 110 : 190, objectFit: "cover", borderRadius: 12, display: "block" }} />
                    <button onClick={function () { quitarFoto(i) }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(19,36,53,0.85)", color: cream, border: "none", borderRadius: 8, padding: "4px 9px", fontSize: 12, cursor: "pointer", fontFamily: ft }}>Borrar</button>
                  </div>);
              })}
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: grayWarm }}>Si salió movida u oscura, borrala y sacala de nuevo.</p>
            <button onClick={function () { fileRef.current && fileRef.current.click() }} style={stBtnGhost}>+ Agregar otra foto</button>
          </>)}
        {error ? <p style={{ margin: 0, color: "#b4451f", fontSize: 14 }}>{error}</p> : null}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        {imgs.length ? <button onClick={function () { setPaso(2) }} style={stBtn(copper, white)}>Está bien, seguir</button> : null}
        <button onClick={props.onCancelar} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  if (paso === 2) {
    return (
      <div style={wrap}>
        {cabecera}
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Cuántos hay?</p>
        <p style={{ margin: 0, fontSize: 13.5, color: grayWarm }}>{cat.usa_letras ? "De esto mismo, iguales. Te voy a dar una letra para cada uno." : "Si no sabés exacto, calculá a ojo."}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: white, border: "1px solid " + grayBlue, borderRadius: 14, padding: "11px 13px" }}>
          <button onClick={function () { setCant(function (c) { return Math.max(0, Math.round((c - (cat.usa_letras ? 1 : 0.5)) * 100) / 100) }) }} style={{ width: 54, height: 54, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 27, cursor: "pointer", fontFamily: ft }}>−</button>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 42, color: navy }}>{fmtCantStock(cant)}</span>
          <button onClick={function () { setCant(function (c) { return Math.round((c + (cat.usa_letras ? 1 : 0.5)) * 100) / 100 }) }} style={{ width: 54, height: 54, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 27, cursor: "pointer", fontFamily: ft }}>+</button>
        </div>
        {!cat.usa_letras ? (<>
          <p style={stLbl}>¿En qué se mide?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {UNIDADES.map(function (u) { return <button key={u} onClick={function () { setUnidad(u) }} style={stChip(unidad === u)}>{u}</button> })}
          </div>
        </>) : null}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={function () { setPaso(3) }} style={stBtn(copper, white)}>Seguir</button>
        <button onClick={function () { setPaso(1) }} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  if (paso === 3) {
    return (
      <div style={wrap}>
        {cabecera}
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Dónde está guardado?</p>
        <input value={lugar} onChange={function (e) { setLugar(e.target.value) }} placeholder="Escribí acá…" style={stField} />
        {lugares.length ? (<>
          <p style={stLbl}>O tocá uno que ya usaste</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {lugares.map(function (l) { return <button key={l} onClick={function () { setLugar(l) }} style={stChip(lugar === l)}>{l}</button> })}
          </div>
        </>) : null}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={function () { setPaso(4) }} style={stBtn(copper, white)}>Seguir</button>
        <button onClick={function () { setPaso(2) }} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  return (
    <div style={wrap}>
      {cabecera}
      <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Querés agregar algo más?</p>
      <p style={{ margin: 0, fontSize: 13.5, color: grayWarm }}>Esto es opcional. Si no querés, tocá "Saltear y guardar".</p>
      <p style={stLbl}>¿Qué es?</p>
      <input value={nombre} onChange={function (e) { setNombre(e.target.value) }} placeholder="Por ejemplo: taza cónica chica" style={stField} />
      <p style={stLbl}>Contá lo que quieras</p>
      <textarea value={desc} onChange={function (e) { setDesc(e.target.value) }} placeholder="Color, tamaño, estado, para qué sirve…" style={Object.assign({}, stField, { minHeight: 68, resize: "vertical" })} />
      <p style={stLbl}>¿Es de algún tipo especial?</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {subs.map(function (s) { return <button key={s.id} onClick={function () { setSubId(subId === s.id ? null : s.id) }} style={stChip(subId === s.id)}>{s.nombre}</button> })}
        {!addSub ? <button onClick={function () { setAddSub(true) }} style={Object.assign({}, stChip(false), { borderStyle: "dashed", color: grayWarm })}>+ nuevo</button> : null}
      </div>
      {addSub ? (
        <div style={{ display: "flex", gap: 7 }}>
          <input value={nuevaSub} onChange={function (e) { setNuevaSub(e.target.value) }} placeholder="Nombre nuevo" style={stField} />
          <button onClick={crearSub} style={{ padding: "0 16px", borderRadius: 11, border: "none", background: navy, color: cream, fontFamily: ft, fontSize: 14, cursor: "pointer" }}>Sumar</button>
        </div>) : null}
      {error ? <p style={{ margin: 0, color: "#b4451f", fontSize: 14 }}>{error}</p> : null}
      <div style={{ flex: 1, minHeight: 8 }}></div>
      <button onClick={guardar} disabled={guardando} style={Object.assign({}, stBtn(copper, white), { opacity: guardando ? 0.6 : 1 })}>{guardando ? "Guardando…" : "Guardar"}</button>
      {!guardando ? <button onClick={guardar} style={stBtnGhost}>Saltear y guardar</button> : null}
      {!guardando ? <button onClick={function () { setPaso(3) }} style={stBtnGhost}>← Volver</button> : null}
    </div>);
}

function StockFicha(props) {
  var prod = props.prod, cat = props.cat, fotos = props.fotos, subs = props.subs;
  var esAdmin = !!props.esAdmin;
  var esConsumible = cat && !cat.usa_letras;
  var _costo = useState(prod.costo == null ? "" : String(prod.costo)), costo = _costo[0], setCosto = _costo[1];
  var _edit = useState(false), edit = _edit[0], setEdit = _edit[1];
  var _cant = useState(numStock(prod.cantidad)), cant = _cant[0], setCant = _cant[1];
  var _lugar = useState(prod.lugar || ""), lugar = _lugar[0], setLugar = _lugar[1];
  var _nombre = useState(prod.nombre || ""), nombre = _nombre[0], setNombre = _nombre[1];
  var _desc = useState(prod.descripcion || ""), desc = _desc[0], setDesc = _desc[1];
  var _guard = useState(false), guard = _guard[0], setGuard = _guard[1];
  var fileRef = useRef(null);
  var sub = subs.filter(function (s) { return s.id === prod.subcategoria_id })[0];
  var etiq = etiquetasStock(cat, prod);

  async function guardar() {
    setGuard(true);
    var cambios = { nombre: nombre.trim() || null, descripcion: desc.trim() || null, lugar: lugar.trim() || null, cantidad: cant };
    if (esAdmin) cambios.costo = costo.trim() === "" ? null : numStock(costo.replace(",", "."));
    await supa("stock_productos", "PATCH", "?id=eq." + prod.id, cambios);
    setGuard(false); props.onCambio();
  }
  async function seTermino() {
    if (!window.confirm("¿Se terminó? Lo saco del inventario y guardo la fecha, para saber cuánto duró.")) return;
    setGuard(true);
    await supa("stock_productos", "PATCH", "?id=eq." + prod.id, { cantidad: 0, agotado_at: new Date().toISOString(), estado: "archivado" });
    setGuard(false); props.onCambio();
  }
  async function archivar() {
    if (!window.confirm("¿Sacar esto del inventario? No se borra: queda guardado y su número no se vuelve a usar.")) return;
    setGuard(true);
    await supa("stock_productos", "PATCH", "?id=eq." + prod.id, { estado: "archivado" });
    setGuard(false); props.onCambio();
  }
  async function sumarFoto(e) {
    var fs = e.target.files; if (!fs || !fs.length) return;
    setGuard(true);
    var carpeta = "p" + prod.id + "-extra";
    for (var i = 0; i < fs.length; i++) {
      var b = await comprimirFotoStock(fs[i]);
      var path = await subirFotoStock(b, carpeta + "/" + Date.now() + "-" + i + ".jpg");
      if (path) await supa("stock_fotos", "POST", "", { producto_id: prod.id, path: path, es_principal: false, orden: fotos.length + i + 1 });
    }
    setGuard(false); props.onCambio();
  }

  return (
    <div style={{ padding: "14px 15px 24px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 11 }}>
      <button onClick={props.onVolver} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0, textAlign: "left" }}>← Volver</button>
      <div style={{ background: navy, borderRadius: 12, padding: "13px 15px" }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "1.4px", textTransform: "uppercase", color: gold, fontWeight: 700 }}>La etiqueta dice</p>
        <p style={{ margin: "4px 0 0", fontFamily: "'Instrument Serif',serif", fontSize: etiq.length > 3 ? 20 : 27, color: copper, lineHeight: 1.2 }}>{etiq.join(" · ")}</p>
      </div>
      {fotos.length ? (
        <div style={{ display: "grid", gridTemplateColumns: fotos.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
          {fotos.map(function (f) { return <img key={f.id} src={fotoUrlStock(f.path)} alt="" style={{ width: "100%", height: fotos.length > 1 ? 130 : 220, objectFit: "cover", borderRadius: 11, display: "block" }} /> })}
        </div>) : null}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={sumarFoto} style={{ display: "none" }} />
      <button onClick={function () { fileRef.current && fileRef.current.click() }} style={stBtnGhost}>+ Agregar otra foto</button>
      {!edit ? (<>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 600, color: navy }}>{prod.nombre || "Sin nombre"}</p>
        <p style={{ margin: 0, fontSize: 15, color: "#4A5663" }}>{fmtCantStock(prod.cantidad)} {prod.unidad}{prod.lugar ? " · " + prod.lugar : ""}</p>
        {sub ? <p style={{ margin: 0, fontSize: 13.5, color: grayWarm }}>Tipo: {sub.nombre}</p> : null}
        {prod.descripcion ? <p style={{ margin: 0, fontSize: 15, color: "#4A5663", lineHeight: 1.5 }}>{prod.descripcion}</p> : null}
        {esAdmin && prod.costo != null ? <p style={{ margin: 0, fontSize: 14, color: navy }}>Costó {fmtMoney(prod.costo)}</p> : null}
        {prod.agotado_at ? <p style={{ margin: 0, fontSize: 13.5, color: grayWarm }}>Se terminó el {fmtDateShort(new Date(prod.agotado_at)).split(" ").slice(0, 3).join(" ")}</p> : null}
        <button onClick={function () { setEdit(true) }} style={stBtnGhost}>Corregir algo</button>
        {esConsumible && !prod.agotado_at ? <button onClick={seTermino} disabled={guard} style={Object.assign({}, stBtnGhost, { borderColor: copper, color: copper, fontWeight: 600 })}>Se terminó</button> : null}
        <button onClick={archivar} disabled={guard} style={{ background: "none", border: "none", color: "#b4451f", fontSize: 13.5, fontFamily: ft, cursor: "pointer", textDecoration: "underline", padding: "4px 0" }}>Sacar del inventario</button>
      </>) : (<>
        <p style={stLbl}>¿Qué es?</p>
        <input value={nombre} onChange={function (e) { setNombre(e.target.value) }} style={stField} />
        <p style={stLbl}>Cuántos hay</p>
        <input value={cant} onChange={function (e) { setCant(numStock(e.target.value.replace(",", "."))) }} inputMode="decimal" style={stField} />
        <p style={stLbl}>Dónde está</p>
        <input value={lugar} onChange={function (e) { setLugar(e.target.value) }} style={stField} />
        <p style={stLbl}>Descripción</p>
        <textarea value={desc} onChange={function (e) { setDesc(e.target.value) }} style={Object.assign({}, stField, { minHeight: 68, resize: "vertical" })} />
        {esAdmin ? (<>
          <p style={stLbl}>¿Cuánto costó? (solo lo ves vos)</p>
          <input value={costo} onChange={function (e) { setCosto(e.target.value) }} inputMode="decimal" placeholder="Por ejemplo: 80000" style={stField} />
        </>) : null}
        <button onClick={guardar} disabled={guard} style={Object.assign({}, stBtn(copper, white), { opacity: guard ? 0.6 : 1 })}>{guard ? "Guardando…" : "Guardar cambios"}</button>
        <button onClick={function () { setEdit(false) }} style={stBtnGhost}>Cancelar</button>
      </>)}
    </div>);
}

// ====== PRODUCCIÓN: TANDAS Y MERMAS ======
var PASOS_PROD = ["", "Colada", "Desmolde", "Secado", "Horno de bizcocho", "Esmaltado", "Horno de esmalte", "Logo", "Horno del logo"];
var PREG_PROD = ["", "",
  "De las {n}, ¿cuántas salieron enteras del molde?",
  "De las {n}, ¿cuántas siguen enteras después de secar?",
  "De las {n}, ¿cuántas salieron enteras del horno?",
  "De las {n}, ¿cuántas siguen enteras después de esmaltar?",
  "De las {n}, ¿cuántas salieron enteras del horno?",
  "De las {n}, ¿cuántas siguen enteras después del logo?",
  "De las {n}, ¿cuántas salieron enteras del horno?"];
var ESPERA_PROD = ["", "", "Todavía no desmoldé", "Siguen secando", "Todavía está en el horno", "Todavía no las esmalté", "Todavía está en el horno", "Todavía no le puse el logo", "Todavía está en el horno"];
var GRUPO_PROD = ["no sé", "colada", "desmolde", "secado", "hornos", "esmaltado", "hornos", "logo", "hornos"];
var breakRed = "#9C3B22";

function pasoNombreProd(p) { return p === 0 ? "no sé" : (PASOS_PROD[p] || "") }
function tandaTituloProd(t, prodPorId) {
  if (t.origen === "colada" && t.molde_producto_id) { var m = prodPorId[t.molde_producto_id]; if (m) return "Molde " + m.numero + (m.nombre ? " · " + m.nombre : "") }
  if (t.origen === "taller" && t.pieza_producto_id) { var b = prodPorId[t.pieza_producto_id]; if (b) return (b.nombre || "Bizcocho " + b.numero) }
  return t.descripcion || "Tanda " + t.id;
}
function tandaOrigenProd(t) { return t.origen === "colada" ? "colada nuestra" : t.origen === "comprado" ? "comprados" : "del taller" }

function ProduccionPanel(props) {
  var quien = props.quien || "", veResultados = !!props.veResultados, esAdmin = !!props.esAdmin;
  var _tandas = useState([]), tandas = _tandas[0], setTandas = _tandas[1];
  var _mermas = useState([]), mermas = _mermas[0], setMermas = _mermas[1];
  var _prods = useState([]), prods = _prods[0], setProds = _prods[1];
  var _cats = useState([]), cats = _cats[0], setCats = _cats[1];
  var _cargando = useState(true), cargando = _cargando[0], setCargando = _cargando[1];
  var _pant = useState("inicio"), pant = _pant[0], setPant = _pant[1];
  var _sel = useState(null), sel = _sel[0], setSel = _sel[1];

  var cargar = useCallback(async function () {
    var r = await Promise.all([
      supa("produccion_tandas", "GET", "?order=created_at.desc"),
      supa("produccion_mermas", "GET", "?order=created_at.desc"),
      supa("stock_productos", "GET", "?order=numero"),
      supa("stock_categorias", "GET", "?order=orden")
    ]);
    setTandas(r[0] || []); setMermas(r[1] || []); setProds(r[2] || []); setCats(r[3] || []);
    setCargando(false);
  }, []);
  useEffect(function () { cargar() }, [cargar]);

  if (cargando) return <div style={{ padding: 30, textAlign: "center", fontFamily: ft, color: grayWarm }}>Cargando…</div>;

  var prodPorId = {}; prods.forEach(function (p) { prodPorId[p.id] = p });
  var catPorId = {}; cats.forEach(function (c) { catPorId[c.id] = c });
  function catNombre(n) { for (var i = 0; i < cats.length; i++) if (cats[i].nombre === n) return cats[i]; return null }
  var catMolde = catNombre("molde"), catBarro = catNombre("barros"), catBizc = catNombre("bizcocho");
  var activo = function (p) { return p.estado === "activo" };
  var moldes = catMolde ? prods.filter(function (p) { return p.categoria_id === catMolde.id && activo(p) }) : [];
  var barros = catBarro ? prods.filter(function (p) { return p.categoria_id === catBarro.id && activo(p) }) : [];
  var bizcochos = catBizc ? prods.filter(function (p) { return p.categoria_id === catBizc.id && activo(p) }) : [];
  var abiertas = tandas.filter(function (t) { return t.estado === "abierta" });
  var motivosPrevios = [];
  mermas.forEach(function (m) { var v = (m.motivo || "").trim(); if (v && motivosPrevios.indexOf(v) === -1) motivosPrevios.push(v) });
  motivosPrevios = motivosPrevios.slice(0, 6);

  if (pant === "nueva") {
    return <TandaNueva moldes={moldes} barros={barros} bizcochos={bizcochos} quien={quien}
      onCancelar={function () { setPant("inicio") }}
      onGuardada={async function () { await cargar(); setPant("inicio") }} />;
  }
  if (pant === "actualizar" && sel) {
    var t = tandas.filter(function (x) { return x.id === sel.id })[0] || sel;
    return <TandaActualizar tanda={t} molde={t.molde_producto_id ? prodPorId[t.molde_producto_id] : null}
      titulo={tandaTituloProd(t, prodPorId)} motivosPrevios={motivosPrevios} quien={quien}
      mermasDe={mermas.filter(function (m) { return m.tanda_id === t.id })}
      onVolver={function () { setSel(null); setPant("inicio") }}
      onListo={async function () { await cargar(); setSel(null); setPant("inicio") }} />;
  }
  if (pant === "resultados" && veResultados) {
    return <ProdResultados tandas={tandas} mermas={mermas} prodPorId={prodPorId} esAdmin={esAdmin} barrosTodos={catBarro ? prods.filter(function (p) { return p.categoria_id === catBarro.id }) : []} onVolver={function () { setPant("inicio") }} />;
  }

  var terminadas = tandas.filter(function (t) { return t.estado === "terminada" }).slice(0, 6);
  return (
    <div style={{ padding: "15px 14px 24px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={function () { setPant("nueva") }} style={stBtn(copper, white)}>+ Empezar una tanda</button>
      <p style={stLbl}>Esperando tu respuesta</p>
      {abiertas.length === 0 ? <p style={{ color: grayWarm, fontSize: 14.5, margin: 0 }}>No hay nada esperando. Cuando empieces una tanda, va a aparecer acá.</p> : null}
      {abiertas.map(function (t) {
        return (
          <button key={t.id} onClick={function () { setSel(t); setPant("actualizar") }} style={{ background: white, border: "1px solid " + grayBlue, borderLeft: "3px solid " + copper, borderRadius: 11, padding: "11px 12px", textAlign: "left", cursor: "pointer", fontFamily: ft }}>
            <b style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: navy, lineHeight: 1.3 }}>{tandaTituloProd(t, prodPorId)}</b>
            <span style={{ fontSize: 11.5, color: grayWarm }}>paso {t.paso} de 8 · {PASOS_PROD[t.paso]} · {t.vivas} {t.vivas === 1 ? "pieza" : "piezas"}</span>
          </button>);
      })}
      {veResultados && terminadas.length ? (<>
        <p style={stLbl}>Terminadas</p>
        {terminadas.map(function (t) {
          var perdidas = t.cantidad_inicial - t.vivas;
          return (
            <div key={t.id} style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 11, padding: "10px 12px" }}>
              <b style={{ display: "block", fontSize: 14, fontWeight: 600, color: navy }}>{tandaTituloProd(t, prodPorId)}</b>
              <span style={{ fontSize: 11.5, color: grayWarm }}>{t.cantidad_inicial} empezaron · {t.vivas} llegaron{perdidas ? " · se perdieron " + perdidas : " · sin roturas"}</span>
            </div>);
        })}
      </>) : null}
      {veResultados ? <button onClick={function () { setPant("resultados") }} style={stBtnGhost}>Ver resultados</button> : null}
    </div>);
}

function TandaNueva(props) {
  var _paso = useState("origen"), paso = _paso[0], setPaso = _paso[1];
  var _origen = useState("colada"), origen = _origen[0], setOrigen = _origen[1];
  var _molde = useState(null), molde = _molde[0], setMolde = _molde[1];
  var _pieza = useState(null), pieza = _pieza[0], setPieza = _pieza[1];
  var _barro = useState(null), barro = _barro[0], setBarro = _barro[1];
  var _desc = useState(""), desc = _desc[0], setDesc = _desc[1];
  var _cant = useState(1), cant = _cant[0], setCant = _cant[1];
  var _mCarga = useState(null), mCarga = _mCarga[0], setMCarga = _mCarga[1];
  var _mMolde = useState(null), mMolde = _mMolde[0], setMMolde = _mMolde[1];
  var _busca = useState(""), busca = _busca[0], setBusca = _busca[1];
  var _guard = useState(false), guard = _guard[0], setGuard = _guard[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];

  var wrap = { padding: "16px 15px 24px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 11, minHeight: "100%" };
  var CARGA = [3, 5, 8, 10, 15];
  var MOLDE_MIN = [15, 25, 40, 60];

  async function guardar() {
    setGuard(true); setErr("");
    var body = {
      origen: origen, cantidad_inicial: cant, vivas: cant,
      paso: origen === "colada" ? 2 : 5, creado_por: props.quien || null,
      molde_producto_id: origen === "colada" && molde ? molde.id : null,
      pieza_producto_id: origen === "taller" && pieza ? pieza.id : null,
      barro_producto_id: origen === "colada" && barro ? barro.id : null,
      descripcion: origen === "colada" ? null : (origen === "taller" && pieza ? null : desc.trim() || null),
      minutos_carga: origen === "colada" ? mCarga : null,
      minutos_molde: origen === "colada" ? mMolde : null
    };
    var r = await supa("produccion_tandas", "POST", "", body);
    setGuard(false);
    if (!r || !r[0]) { setErr("No se pudo guardar. Probá de nuevo."); return }
    props.onGuardada();
  }

  if (paso === "origen") {
    var OPC = [
      { k: "colada", t: "Las colamos nosotras", s: "Empieza desde el molde · paso 1 de 8" },
      { k: "comprado", t: "Son bizcochos comprados", s: "Ya vienen horneados · empieza en el paso 5" },
      { k: "taller", t: "Ya estaban en el taller", s: "De los bizcochos que tenés cargados · paso 5" }
    ];
    return (
      <div style={wrap}>
        <p style={stLbl}>Tanda nueva</p>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿De dónde salen estas piezas?</p>
        {OPC.map(function (o) {
          var on = origen === o.k;
          return (
            <button key={o.k} onClick={function () { setOrigen(o.k) }} style={{ background: white, border: (on ? "2px solid " + copper : "1px solid " + grayBlue), borderRadius: 11, padding: "12px 13px", textAlign: "left", cursor: "pointer", fontFamily: ft }}>
              <b style={{ display: "block", fontSize: 15, fontWeight: 600, color: navy }}>{o.t}</b>
              <span style={{ fontSize: 11.5, color: grayWarm }}>{o.s}</span>
            </button>);
        })}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={function () { setPaso(origen === "colada" ? "molde" : "piezas") }} style={stBtn(copper, white)}>Seguir</button>
        <button onClick={props.onCancelar} style={stBtnGhost}>Cancelar</button>
      </div>);
  }

  if (paso === "molde") {
    var lista = props.moldes.filter(function (m) {
      var q = busca.trim().toLowerCase(); if (!q) return true;
      return ((m.nombre || "") + " " + m.numero).toLowerCase().indexOf(q) !== -1;
    });
    return (
      <div style={wrap}>
        <p style={stLbl}>Tanda nueva · las colamos nosotras</p>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Qué molde usaste?</p>
        <input value={busca} onChange={function (e) { setBusca(e.target.value) }} placeholder="Buscar por número o nombre…" style={stField} />
        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 260, overflow: "auto" }}>
          {lista.map(function (m) {
            var on = molde && molde.id === m.id;
            return (
              <button key={m.id} onClick={function () { setMolde(m); setCant(Math.max(1, Math.round(numStock(m.cantidad)))) }} style={{ background: white, border: (on ? "2px solid " + copper : "1px solid " + grayBlue), borderRadius: 11, padding: "10px 12px", textAlign: "left", cursor: "pointer", fontFamily: ft }}>
                <b style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: navy }}>Molde {m.numero} · {m.nombre || "sin nombre"}</b>
                <span style={{ fontSize: 11.5, color: grayWarm }}>{fmtCantStock(m.cantidad)} disponibles{m.lugar ? " · " + m.lugar : ""}</span>
              </button>);
          })}
        </div>
        <div style={{ flex: 1, minHeight: 8 }}></div>
        {molde ? <button onClick={function () { setPaso("cantidad") }} style={stBtn(copper, white)}>Seguir</button> : null}
        <button onClick={function () { setPaso("origen") }} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  if (paso === "piezas") {
    return (
      <div style={wrap}>
        <p style={stLbl}>Tanda nueva · {origen === "comprado" ? "bizcochos comprados" : "ya estaban en el taller"}</p>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Qué son y cuántos?</p>
        {origen === "taller" && props.bizcochos.length ? (<>
          <p style={stLbl}>Elegí de los bizcochos cargados</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 190, overflow: "auto" }}>
            {props.bizcochos.map(function (b) {
              var on = pieza && pieza.id === b.id;
              return (
                <button key={b.id} onClick={function () { setPieza(b) }} style={{ background: white, border: (on ? "2px solid " + copper : "1px solid " + grayBlue), borderRadius: 11, padding: "10px 12px", textAlign: "left", cursor: "pointer", fontFamily: ft }}>
                  <b style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: navy }}>Bizcocho {b.numero} · {b.nombre || "sin nombre"}</b>
                  <span style={{ fontSize: 11.5, color: grayWarm }}>{fmtCantStock(b.cantidad)} en stock</span>
                </button>);
            })}
          </div>
        </>) : null}
        {origen === "comprado" || !props.bizcochos.length ? (<>
          <p style={stLbl}>¿Qué son?</p>
          <input value={desc} onChange={function (e) { setDesc(e.target.value) }} placeholder="Por ejemplo: tazas cónicas chicas" style={stField} />
        </>) : null}
        <p style={stLbl}>¿Cuántas hay?</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: white, border: "1px solid " + grayBlue, borderRadius: 14, padding: "10px 12px" }}>
          <button onClick={function () { setCant(function (c) { return Math.max(1, c - 1) }) }} style={{ width: 52, height: 52, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 26, cursor: "pointer", fontFamily: ft }}>−</button>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 40, color: navy }}>{cant}</span>
          <button onClick={function () { setCant(function (c) { return c + 1 }) }} style={{ width: 52, height: 52, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 26, cursor: "pointer", fontFamily: ft }}>+</button>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>Estas ya vienen horneadas: no hace falta molde ni tiempos. Arrancan esperando esmalte.</p>
        {err ? <p style={{ margin: 0, color: breakRed, fontSize: 14 }}>{err}</p> : null}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={guardar} disabled={guard || (origen === "comprado" && !desc.trim()) || (origen === "taller" && !pieza && !desc.trim())} style={Object.assign({}, stBtn(copper, white), { opacity: guard ? 0.6 : 1 })}>{guard ? "Guardando…" : "Guardar tanda"}</button>
        <button onClick={function () { setPaso("origen") }} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  if (paso === "cantidad") {
    return (
      <div style={wrap}>
        <p style={stLbl}>Tanda nueva · Molde {molde ? molde.numero : ""}</p>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Cuántas colaste?</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: white, border: "1px solid " + grayBlue, borderRadius: 14, padding: "10px 12px" }}>
          <button onClick={function () { setCant(function (c) { return Math.max(1, c - 1) }) }} style={{ width: 52, height: 52, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 26, cursor: "pointer", fontFamily: ft }}>−</button>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 40, color: navy }}>{cant}</span>
          <button onClick={function () { setCant(function (c) { return c + 1 }) }} style={{ width: 52, height: 52, borderRadius: 13, background: navy, color: cream, border: "none", fontSize: 26, cursor: "pointer", fontFamily: ft }}>+</button>
        </div>
        {props.barros.length ? (<>
          <p style={stLbl}>¿Con qué barro?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {props.barros.map(function (b) {
              return <button key={b.id} onClick={function () { setBarro(barro && barro.id === b.id ? null : b) }} style={stChip(barro && barro.id === b.id)}>{b.nombre || "Barro " + b.numero}</button>;
            })}
          </div>
        </>) : <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>Todavía no hay barros cargados en el Stock. Podés seguir igual.</p>}
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={function () { setPaso("tiempos") }} style={stBtn(copper, white)}>Seguir</button>
        <button onClick={function () { setPaso("molde") }} style={stBtnGhost}>← Volver</button>
      </div>);
  }

  return (
    <div style={wrap}>
      <p style={stLbl}>Tanda nueva · Molde {molde ? molde.numero : ""}</p>
      <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy }}>¿Cuánto tiempo?</p>
      <p style={stLbl}>Cargada con barbotina</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CARGA.map(function (m) { return <button key={m} onClick={function () { setMCarga(mCarga === m ? null : m) }} style={stChip(mCarga === m)}>{m} min</button> })}
      </div>
      <p style={stLbl}>En el molde antes de desmoldar</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {MOLDE_MIN.map(function (m) { return <button key={m} onClick={function () { setMMolde(mMolde === m ? null : m) }} style={stChip(mMolde === m)}>{m >= 60 ? (m / 60) + " h" : m + " min"}</button> })}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>Si no te acordás exacto, poné lo más parecido. Sirve igual. Y si no sabés, dejalo vacío.</p>
      {err ? <p style={{ margin: 0, color: breakRed, fontSize: 14 }}>{err}</p> : null}
      <div style={{ flex: 1, minHeight: 8 }}></div>
      <button onClick={guardar} disabled={guard} style={Object.assign({}, stBtn(copper, white), { opacity: guard ? 0.6 : 1 })}>{guard ? "Guardando…" : "Guardar tanda"}</button>
      <button onClick={function () { setPaso("cantidad") }} style={stBtnGhost}>← Volver</button>
    </div>);
}

function TandaActualizar(props) {
  var t = props.tanda, molde = props.molde;
  var _enteras = useState(t.vivas), enteras = _enteras[0], setEnteras = _enteras[1];
  var _fase = useState("contar"), fase = _fase[0], setFase = _fase[1];
  var _letras = useState([]), letras = _letras[0], setLetras = _letras[1];
  var _motivo = useState(""), motivo = _motivo[0], setMotivo = _motivo[1];
  var _pasoMerma = useState(t.paso), pasoMerma = _pasoMerma[0], setPasoMerma = _pasoMerma[1];
  var _guard = useState(false), guard = _guard[0], setGuard = _guard[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];

  var perdidas = t.vivas - enteras;
  var wrap = { padding: "16px 15px 24px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 11, minHeight: "100%" };
  var diasSinTocar = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 86400000);
  var atrasada = diasSinTocar >= 4 && t.paso > 2;
  var letrasMolde = [];
  if (molde && t.paso === 2) { var n = Math.max(1, Math.round(numStock(molde.cantidad))); if (n > 30) n = 30; for (var i = 0; i < n; i++) letrasMolde.push(letraStock(i)) }

  function toggleLetra(l) { setLetras(function (p) { var i = p.indexOf(l); var c = p.slice(); if (i === -1) c.push(l); else c.splice(i, 1); return c }) }

  async function guardar() {
    setGuard(true); setErr("");
    if (perdidas > 0) {
      var m = await supa("produccion_mermas", "POST", "", {
        tanda_id: t.id, paso: pasoMerma, cantidad: perdidas,
        letras: t.paso === 2 ? letras : [], motivo: motivo.trim() || null, creado_por: props.quien || null
      });
      if (!m) { setGuard(false); setErr("No se pudo guardar. Probá de nuevo."); return }
    }
    var termina = t.paso >= 8 || enteras === 0;
    var upd = { vivas: enteras, paso: termina ? t.paso : t.paso + 1, estado: termina ? (enteras === 0 ? "perdida" : "terminada") : "abierta" };
    var r = await supa("produccion_tandas", "PATCH", "?id=eq." + t.id, upd);
    setGuard(false);
    if (!r) { setErr("No se pudo guardar. Probá de nuevo."); return }
    props.onListo();
  }

  if (fase === "contar") {
    var opciones = []; for (var k = t.vivas; k >= Math.max(0, t.vivas - 8); k--) opciones.push(k);
    return (
      <div style={wrap}>
        <button onClick={props.onVolver} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0, textAlign: "left" }}>← Volver</button>
        <p style={stLbl}>{props.titulo} · paso {t.paso} de 8 · {PASOS_PROD[t.paso]}</p>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 24, color: navy, lineHeight: 1.15 }}>{PREG_PROD[t.paso].replace("{n}", t.vivas)}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {opciones.map(function (v) {
            var on = enteras === v;
            return <button key={v} onClick={function () { setEnteras(v) }} style={{ minWidth: 56, padding: "14px 6px", borderRadius: 11, border: "1px solid " + (on ? (v === t.vivas ? navy : breakRed) : grayBlue), background: on ? (v === t.vivas ? navy : breakRed) : white, color: on ? cream : navy, fontSize: 19, fontFamily: "'Instrument Serif',serif", cursor: "pointer" }}>{v}</button>;
          })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>{enteras === t.vivas ? "Si están todas enteras, tocá " + t.vivas + " y guardá." : "Se perdieron " + perdidas + ". Después te pregunto qué pasó."}</p>
        <div style={{ flex: 1, minHeight: 8 }}></div>
        <button onClick={function () { if (perdidas > 0) setFase("detalle"); else guardar() }} disabled={guard} style={Object.assign({}, stBtn(perdidas > 0 ? breakRed : copper, white), { opacity: guard ? 0.6 : 1 })}>{guard ? "Guardando…" : perdidas > 0 ? "Seguir" : "Guardar"}</button>
        <button onClick={props.onVolver} style={stBtnGhost}>{ESPERA_PROD[t.paso]}</button>
        {err ? <p style={{ margin: 0, color: breakRed, fontSize: 14 }}>{err}</p> : null}
      </div>);
  }

  return (
    <div style={wrap}>
      <button onClick={function () { setFase("contar") }} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0, textAlign: "left" }}>← Volver</button>
      <p style={stLbl}>{props.titulo} · se {perdidas === 1 ? "rompió 1" : "rompieron " + perdidas}</p>
      {letrasMolde.length ? (<>
        <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 23, color: navy }}>{perdidas === 1 ? "¿Cuál se rompió?" : "¿Cuáles se rompieron?"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {letrasMolde.map(function (l) {
            var on = letras.indexOf(l) !== -1;
            return <button key={l} onClick={function () { toggleLetra(l) }} style={{ padding: "8px 13px", borderRadius: 999, border: "1px solid " + (on ? breakRed : grayBlue), background: on ? breakRed : white, color: on ? white : navy, fontSize: 13.5, fontFamily: ft, cursor: "pointer" }}>{molde.numero + "." + l}</button>;
          })}
        </div>
      </>) : null}
      {atrasada ? (<>
        <p style={stLbl}>Hace {diasSinTocar} días que no anotás nada acá. ¿Dónde se rompieron?</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[t.paso, t.paso - 1, t.paso - 2, 0].filter(function (p, i, a) { return p >= 0 && a.indexOf(p) === i && (p === 0 || p >= 2) }).map(function (p) {
            return <button key={p} onClick={function () { setPasoMerma(p) }} style={stChip(pasoMerma === p)}>{pasoNombreProd(p)}</button>;
          })}
        </div>
      </>) : null}
      <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 23, color: navy }}>¿Qué pasó?</p>
      <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>Contámelo con tus palabras, como se lo dirías a alguien.</p>
      <textarea value={motivo} onChange={function (e) { setMotivo(e.target.value) }} placeholder="Escribí acá…" style={Object.assign({}, stField, { minHeight: 66, resize: "vertical" })} />
      {props.motivosPrevios.length ? (<>
        <p style={stLbl}>O tocá algo que ya escribiste antes</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {props.motivosPrevios.map(function (m) { return <button key={m} onClick={function () { setMotivo(m) }} style={stChip(motivo === m)}>{m}</button> })}
        </div>
      </>) : null}
      {err ? <p style={{ margin: 0, color: breakRed, fontSize: 14 }}>{err}</p> : null}
      <div style={{ flex: 1, minHeight: 8 }}></div>
      <button onClick={guardar} disabled={guard} style={Object.assign({}, stBtn(breakRed, white), { opacity: guard ? 0.6 : 1 })}>{guard ? "Guardando…" : "Guardar la rotura"}</button>
    </div>);
}

function ProdResultados(props) {
  var tandas = props.tandas, mermas = props.mermas, prodPorId = props.prodPorId;
  var porTanda = {}; mermas.forEach(function (m) { (porTanda[m.tanda_id] = porTanda[m.tanda_id] || []).push(m) });

  var porModelo = {};
  tandas.forEach(function (t) {
    var key = t.molde_producto_id ? "m" + t.molde_producto_id : (t.pieza_producto_id ? "p" + t.pieza_producto_id : "d" + (t.descripcion || t.id));
    var nom = tandaTituloProd(t, prodPorId);
    var g = porModelo[key] || (porModelo[key] = { nombre: nom, inicial: 0, perdidas: 0, desmolde: 0, secado: 0, hornos: 0, esmaltado: 0, logo: 0, nose: 0 });
    g.inicial += t.cantidad_inicial;
    (porTanda[t.id] || []).forEach(function (m) {
      g.perdidas += m.cantidad;
      var gr = GRUPO_PROD[m.paso] || "no sé";
      if (gr === "desmolde") g.desmolde += m.cantidad;
      else if (gr === "secado") g.secado += m.cantidad;
      else if (gr === "hornos") g.hornos += m.cantidad;
      else if (gr === "esmaltado") g.esmaltado += m.cantidad;
      else if (gr === "logo") g.logo += m.cantidad;
      else g.nose += m.cantidad;
    });
  });
  var filas = Object.keys(porModelo).map(function (k) { return porModelo[k] }).filter(function (g) { return g.inicial > 0 });
  filas.sort(function (a, b) { return (b.perdidas / b.inicial) - (a.perdidas / a.inicial) });

  var porLetra = {};
  mermas.filter(function (m) { return m.paso === 2 && m.letras && m.letras.length }).forEach(function (m) {
    var t = tandas.filter(function (x) { return x.id === m.tanda_id })[0]; if (!t || !t.molde_producto_id) return;
    var mo = prodPorId[t.molde_producto_id]; if (!mo) return;
    m.letras.forEach(function (l) { var k = mo.numero + "." + l; porLetra[k] = (porLetra[k] || 0) + 1 });
  });
  var letrasMal = Object.keys(porLetra).map(function (k) { return { k: k, n: porLetra[k] } }).sort(function (a, b) { return b.n - a.n }).slice(0, 6);

  var totalIni = filas.reduce(function (a, g) { return a + g.inicial }, 0);
  var totalPer = filas.reduce(function (a, g) { return a + g.perdidas }, 0);
  var COL = { desmolde: breakRed, secado: copper, hornos: olive, esmaltado: gold, logo: "#6b7280", nose: "#b9b9ad" };

  return (
    <div style={{ padding: "16px 15px 26px", fontFamily: ft, display: "flex", flexDirection: "column", gap: 11 }}>
      <button onClick={props.onVolver} style={{ background: "none", border: "none", color: grayWarm, fontSize: 14, fontFamily: ft, cursor: "pointer", padding: 0, textAlign: "left" }}>← Volver</button>
      <p style={{ margin: 0, fontFamily: "'Instrument Serif',serif", fontSize: 27, color: navy }}>Resultados</p>
      <p style={{ margin: 0, fontSize: 13, color: grayWarm }}>{totalIni} piezas empezadas · {totalPer} perdidas{totalIni ? " · " + Math.round(totalPer / totalIni * 100) + "% de rotura" : ""}</p>
      {filas.length === 0 ? <p style={{ color: grayWarm, fontSize: 14.5 }}>Todavía no hay tandas cargadas.</p> : null}
      {filas.map(function (g, i) {
        var pct = g.inicial ? Math.round(g.perdidas / g.inicial * 100) : 0;
        var seg = [["desmolde", g.desmolde], ["secado", g.secado], ["esmaltado", g.esmaltado], ["hornos", g.hornos], ["logo", g.logo], ["nose", g.nose]];
        return (
          <div key={i} style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 11, padding: "11px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
              <b style={{ fontSize: 13.5, fontWeight: 600, color: navy }}>{g.nombre}</b>
              <span style={{ fontSize: 15, fontWeight: 700, color: pct > 0 ? breakRed : olive, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
            </div>
            <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", background: "#ecece2" }}>
              {seg.map(function (s, j) { return s[1] > 0 ? <span key={j} style={{ width: (s[1] / g.inicial * 100) + "%", background: COL[s[0]] }}></span> : null })}
              <span style={{ flex: 1, background: "#dcdcd0" }}></span>
            </div>
            <p style={{ margin: "5px 0 0", fontSize: 11, color: grayWarm }}>{g.inicial} empezaron · {g.inicial - g.perdidas} llegaron</p>
          </div>);
      })}
      {filas.length ? (
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 2 }}>
          {[["desmolde", "desmolde"], ["secado", "secado"], ["esmaltado", "esmaltado"], ["hornos", "hornos"], ["logo", "logo"], ["nose", "no sé"]].map(function (l) {
            return <span key={l[0]} style={{ fontSize: 10.5, color: grayWarm, display: "flex", alignItems: "center", gap: 3 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: COL[l[0]], display: "inline-block" }}></i>{l[1]}</span>;
          })}
        </div>) : null}
      {props.esAdmin ? <RendimientoBarros barros={props.barrosTodos || []} tandas={tandas} mermas={mermas} /> : null}
      {letrasMal.length ? (<>
        <p style={stLbl}>Moldes para revisar</p>
        {letrasMal.map(function (l) {
          return (
            <div key={l.k} style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 11, padding: "10px 12px" }}>
              <b style={{ display: "block", fontSize: 14, fontWeight: 600, color: navy }}>Molde {l.k}</b>
              <span style={{ fontSize: 11.5, color: grayWarm }}>se rompió {l.n} {l.n === 1 ? "vez" : "veces"} al desmoldar</span>
            </div>);
        })}
      </>) : null}
    </div>);
}

function RendimientoBarros(props) {
  var barros = props.barros, tandas = props.tandas, mermas = props.mermas;
  var perdidasDe = {};
  mermas.forEach(function (m) { perdidasDe[m.tanda_id] = (perdidasDe[m.tanda_id] || 0) + m.cantidad });

  var filas = barros.map(function (b) {
    var ts = tandas.filter(function (t) { return t.barro_producto_id === b.id });
    if (!ts.length) return null;
    var coladas = 0, llegaron = 0, cerradas = 0;
    ts.forEach(function (t) {
      coladas += t.cantidad_inicial;
      if (t.estado === "terminada" || t.estado === "perdida") { llegaron += t.vivas; cerradas++ }
    });
    var dias = null;
    if (b.agotado_at) dias = Math.max(1, Math.round((new Date(b.agotado_at).getTime() - new Date(b.created_at).getTime()) / 86400000));
    return { b: b, coladas: coladas, llegaron: llegaron, cerradas: cerradas, total: ts.length, dias: dias };
  }).filter(Boolean);

  if (!filas.length) return null;
  filas.sort(function (a, b) { return (b.b.agotado_at ? 1 : 0) - (a.b.agotado_at ? 1 : 0) });

  return (
    <>
      <p style={stLbl}>Rendimiento de los barros · solo lo ves vos</p>
      {filas.map(function (f) {
        var b = f.b;
        var costo = b.costo == null ? null : numStock(b.costo);
        var porColada = costo && f.coladas ? Math.round(costo / f.coladas) : null;
        var porVendible = costo && f.llegaron ? Math.round(costo / f.llegaron) : null;
        return (
          <div key={b.id} style={{ background: white, border: "1px solid " + grayBlue, borderRadius: 11, padding: "11px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <b style={{ fontSize: 13.5, fontWeight: 600, color: navy }}>{b.nombre || "Barro " + b.numero}</b>
              <span style={{ fontSize: 11.5, color: b.agotado_at ? grayWarm : olive }}>{b.agotado_at ? "se terminó" : "en uso"}</span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: grayWarm }}>
              {f.coladas} piezas coladas en {f.total} {f.total === 1 ? "tanda" : "tandas"}
              {f.dias ? " · duró " + f.dias + " días" : ""}
            </p>
            {f.cerradas ? <p style={{ margin: "2px 0 0", fontSize: 12.5, color: grayWarm }}>{f.llegaron} llegaron a estar listas ({f.cerradas} {f.cerradas === 1 ? "tanda cerrada" : "tandas cerradas"})</p> : null}
            {costo ? (
              <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid " + cream }}>
                <p style={{ margin: 0, fontSize: 12.5, color: grayWarm }}>Costó {fmtMoney(costo)}</p>
                {porColada ? <p style={{ margin: "2px 0 0", fontSize: 13, color: navy }}>{fmtMoney(porColada)} por pieza colada</p> : null}
                {porVendible ? <p style={{ margin: "2px 0 0", fontSize: 14, color: breakRed, fontWeight: 600 }}>{fmtMoney(porVendible)} por pieza que llega a vender</p> : null}
                {porColada && porVendible && porVendible > porColada ? <p style={{ margin: "3px 0 0", fontSize: 11.5, color: grayWarm }}>La diferencia es la barbotina de las que se rompieron.</p> : null}
              </div>) :
              <p style={{ margin: "5px 0 0", fontSize: 11.5, color: copper }}>Cargá cuánto costó en el Stock para ver el costo por pieza.</p>}
          </div>);
      })}
    </>);
}

// ====== PROFESORA VIEW ======
function ProfeView(props) {
  var profe = props.profe, als = props.als, refreshData = props.refreshData, listas = props.listas;
  var isEncargada = profe.esEncargada;
  var puedeStock = !!profe.puedeStock;
  var tomaLista = profe.tomaLista !== false;
  var puedeProd = !!profe.puedeProduccion;
  var veRes = !!profe.veResultados;
  var defaultTab = tomaLista ? (isEncargada ? "lista" : "clases") : (isEncargada ? "sede" : (puedeProd ? "produccion" : "clases"));
  var _tab = useState(defaultTab), tab = _tab[0], setTab = _tab[1];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}>
        <p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{profe.nombre}{isEncargada ? " (Encargada)" : ""}</p>
        <p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{profe.sede}</p></div>
      <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
        {!isEncargada ? <button onClick={function () { setTab("clases") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "clases" ? white : cream, color: tab === "clases" ? navy : grayWarm, borderBottom: tab === "clases" ? "2px solid " + copper : "2px solid transparent" }}>Mis clases</button> : null}
        {tomaLista ? <button onClick={function () { setTab("lista") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "lista" ? white : cream, color: tab === "lista" ? navy : grayWarm, borderBottom: tab === "lista" ? "2px solid " + copper : "2px solid transparent" }}>Lista</button> : null}
        {isEncargada ? <button onClick={function () { setTab("sede") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "sede" ? white : cream, color: tab === "sede" ? navy : grayWarm, borderBottom: tab === "sede" ? "2px solid " + copper : "2px solid transparent" }}>Sede</button> : null}
        {isEncargada ? <button onClick={function () { setTab("finanzas") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "finanzas" ? white : cream, color: tab === "finanzas" ? navy : grayWarm, borderBottom: tab === "finanzas" ? "2px solid " + copper : "2px solid transparent" }}>Finanzas</button> : null}
        {puedeStock ? <button onClick={function () { setTab("stock") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "stock" ? white : cream, color: tab === "stock" ? navy : grayWarm, borderBottom: tab === "stock" ? "2px solid " + copper : "2px solid transparent" }}>Stock</button> : null}
        {puedeProd ? <button onClick={function () { setTab("produccion") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: tab === "produccion" ? white : cream, color: tab === "produccion" ? navy : grayWarm, borderBottom: tab === "produccion" ? "2px solid " + copper : "2px solid transparent" }}>Producción</button> : null}
      </div>
      <div style={{ flex: 1, overflow: "auto", background: white }}>
        {tab === "clases" && !isEncargada ? <ProfeClases profe={profe} als={als} /> : null}
        {tab === "lista" && tomaLista ? <ProfeLista profe={profe} als={als} refreshData={refreshData} listas={listas} /> : null}
        {tab === "sede" && isEncargada ? <EncargadaVista profe={profe} als={als} refreshData={refreshData} subTabOverride="cal" /> : null}
        {tab === "finanzas" && isEncargada ? <EncargadaVista profe={profe} als={als} refreshData={refreshData} subTabOverride="finanzas" /> : null}
        {tab === "stock" && puedeStock ? <StockPanel quien={profe.nombre} /> : null}
        {tab === "produccion" && puedeProd ? <ProduccionPanel quien={profe.nombre} veResultados={veRes} /> : null}
      </div></div>);
}

function ProfeClases(props) {
  var profe = props.profe, als = props.als;
  var now = new Date(); var limit = new Date(now); limit.setDate(limit.getDate() + 7);
  var clases = [];
  // Production hours (only for specific profes, not real classes)
  var PRODUCCION = { "Vero": ["martes-16:30", "jueves-16:30"] };
  var profeProduccion = PRODUCCION[profe.nombre] || [];
  profe.horarios.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(now); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      if (argDayName(dd) === dia) { var dt = argDateFor(dd, hora); if (dt > now) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); var fijos = countFijosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected.length, fijos: fijos, feriado: isFeriado(dt), produccion: false }) } }
    }
  });
  // Add production hours
  profeProduccion.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(now); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      if (argDayName(dd) === dia) { var dt = argDateFor(dd, hora); if (dt > now && !isFeriado(dt)) { clases.push({ date: dt, dia: dia, hora: hora, alumnos: 0, fijos: 0, feriado: false, produccion: true }) } }
    }
  });
  clases.sort(function (a, b) { return a.date - b.date });
  var isSI = profe.sede === "San Isidro";
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 14px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Próximas clases (7 días)</h3>
      {clases.length === 0 ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 14 }}>No tenés clases próximas.</p> :
        clases.map(function (c, i) {
          if (c.feriado) return (<div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid #e8d4b0", overflow: "hidden" }}><div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", background: "#fdf6ec" }}><span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{fmtDate(c.date)}</span><span style={{ fontSize: 11, background: "#f59e0b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft, fontWeight: 700 }}>FERIADO</span></div><div style={{ padding: "10px 16px", background: "#fdf6ec" }}><p style={{ margin: 0, fontSize: 13, fontFamily: ft, color: "#92651e" }}>FERIADO — el taller permanece cerrado</p></div></div>);
          if (c.produccion) return (<div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid #c4b5d4", overflow: "hidden" }}><div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", background: "#f5f0fa" }}><span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{fmtDate(c.date)}</span><span style={{ fontSize: 11, background: "#8b5cf6", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft, fontWeight: 700 }}>PRODUCCIÓN</span></div><div style={{ padding: "10px 16px", background: "#f5f0fa" }}><p style={{ margin: 0, fontSize: 13, fontFamily: ft, color: "#6b5080", lineHeight: 1.5 }}>Horario de producción / trabajo de taller</p></div></div>);
          var msgText, msgBg, msgBorder, msgColor;
          if (isSI) { msgText = "¡Que disfrutes mucho de la clase! Por favor, no te olvides de tomar lista."; msgBg = "#f0f5e8"; msgBorder = "#b5c48a"; msgColor = "#5a6a2a"; }
          else if (c.fijos === 0) { msgText = "No hay alumnos en este horario, recuerda hacer producción."; msgBg = "#f5f0fa"; msgBorder = "#c4b5d4"; msgColor = "#6b5080"; }
          else if (c.alumnos < 4) { msgText = "Hay menos de 4 alumnos, recordá hacer producción o trabajo de taller. ¡No te olvides de tomar lista!"; msgBg = "#fdf6ec"; msgBorder = "#e8d4b0"; msgColor = "#92651e"; }
          else { msgText = "¡Que disfrutes mucho de la clase! Por favor, no te olvides de tomar lista."; msgBg = "#f0f5e8"; msgBorder = "#b5c48a"; msgColor = "#5a6a2a"; }
          return (<div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid " + grayBlue, overflow: "hidden" }}><div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", background: "#f8f6f2" }}><span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{fmtDate(c.date)}</span><span style={{ fontSize: 13, color: copper, fontFamily: ft, fontWeight: 600 }}>{c.alumnos + " alumno" + (c.alumnos !== 1 ? "s" : "")}</span></div><div style={{ padding: "10px 16px", background: msgBg, borderTop: "1px solid " + msgBorder }}><p style={{ margin: 0, fontSize: 13, fontFamily: ft, color: msgColor, lineHeight: 1.5 }}>{msgText}</p></div></div>)
        })}</div>);
}

function ProfeLista(props) {
  var profe = props.profe, als = props.als, refreshData = props.refreshData, listas = props.listas;
  var _sel = useState(null), sel = _sel[0], setSel = _sel[1];
  var _marks = useState({}), marks = _marks[0], setMarks = _marks[1];
  var _extras = useState([]), extras = _extras[0], setExtras = _extras[1];
  var _search = useState(""), search = _search[0], setSearch = _search[1];
  var _done = useState(false), done = _done[0], setDone = _done[1];
  var _msg = useState(""), msg = _msg[0], setMsg = _msg[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  var _notes = useState({}), notes = _notes[0], setNotes = _notes[1];
  var _expanded = useState(null), expanded = _expanded[0], setExpanded = _expanded[1];
  var _existingNotas = useState([]), existingNotas = _existingNotas[0], setExistingNotas = _existingNotas[1];

  useEffect(function () { supa("notas_pago", "GET", "?order=created_at.desc&limit=100").then(function (r) { if (r) setExistingNotas(r) }) }, []);
  function getNotasFor(alId) { return existingNotas.filter(function (n) { return n.alumno_id === alId }) }

  var now = new Date(); var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var limit = new Date(now); limit.setDate(limit.getDate() + 7);
  var clases = [];
  profe.horarios.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(monthStart); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      if (argDayName(dd) === dia) { var dt = argDateFor(dd, hora); var iso = dt.toISOString(); var yaTomada = listas.some(function (l) { return l.profe === profe.nombre && matchDay(l.fecha_iso, iso) && l.hora === hora }); if (!yaTomada && !isFeriado(dt)) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected, iso: iso, pendiente: dt < now }) } }
    }
  });
  clases.sort(function (a, b) { return a.date - b.date });

  function selectClass(c) { setSel(c); setMarks({}); setExtras([]); setDone(false); setMsg(""); setSearch(""); setNotes({}); setExpanded(null) }
  function toggleMark(id, val) { setMarks(function (p) { var o = Object.assign({}, p); o[id] = val; return o }) }
  function setNote(id, txt) { setNotes(function (p) { var o = Object.assign({}, p); o[id] = txt; return o }) }
  function addExtra(al) { if (extras.find(function (e) { return e.id === al.id })) return; setExtras(function (p) { return p.concat(al) }); setMarks(function (p) { var o = Object.assign({}, p); o[al.id] = true; return o }); setSearch("") }
  function canSubmit() { if (!sel) return false; var allIds = sel.alumnos.map(function (a) { return a.alumno.id }).concat(extras.map(function (e) { return e.id })); return allIds.every(function (id) { return marks[id] === true || marks[id] === false }) }

  async function submitLista() {
    if (!canSubmit() || busy) return; setBusy(true);
    var faltasSinAviso = []; var clasesExtra = []; var presentes = [];
    for (var ai = 0; ai < sel.alumnos.length; ai++) { var a = sel.alumnos[ai]; if (marks[a.alumno.id] === false) { faltasSinAviso.push(a.alumno); var mk = sel.date.getFullYear() + "-" + sel.date.getMonth(); await supa("cancelaciones", "POST", "", { alumno_id: a.alumno.id, fecha_iso: sel.iso, mes_key: mk, sin_recuperacion: true, sin_aviso: true, is_extra: a.tipo === "recuperacion" }); await supa("historial", "POST", "", { alumno_id: a.alumno.id, accion: "⛔ Falta sin aviso " + fmtDateShort(sel.date) }) } else presentes.push(a.alumno) }
    for (var ei = 0; ei < extras.length; ei++) { var al = extras[ei]; if (marks[al.id] === true) { clasesExtra.push(al); var mk2 = sel.date.getFullYear() + "-" + sel.date.getMonth(); await supa("clases_extra", "POST", "", { alumno_id: al.id, fecha_iso: sel.iso, mes_key: mk2, tipo: "extra" }); await supa("historial", "POST", "", { alumno_id: al.id, accion: "📝 Clase extra " + fmtDateShort(sel.date) }) } }
    await supa("listas", "POST", "", { profe: profe.nombre, sede: profe.sede, dia: sel.dia, hora: sel.hora, fecha_iso: sel.iso });
    // Save payment notes
    var notasSaved = [];
    var allAlIds = sel.alumnos.map(function (a) { return a.alumno }).concat(extras);
    for (var ni = 0; ni < allAlIds.length; ni++) {
      var alNota = allAlIds[ni]; var noteTxt = notes[alNota.id];
      if (noteTxt && noteTxt.trim()) {
        var montoMatch = noteTxt.match(/\$?\s*(\d[\d.,]*)/); var montoVal = montoMatch ? parseFloat(montoMatch[1].replace(/\./g, "").replace(",", ".")) : null;
        await supa("notas_pago", "POST", "", { alumno_id: alNota.id, profe_nombre: profe.nombre, nota: noteTxt.trim(), monto: montoVal, forma_pago: "efectivo" });
        notasSaved.push(alNota.nombre);
      }
    }
    await refreshData(); setBusy(false);
    var m2 = "✦ Lista enviada\nPresentes: " + presentes.length + (clasesExtra.length ? " + " + clasesExtra.length + " extra" : "");
    if (faltasSinAviso.length) m2 += "\nFaltas sin aviso: " + faltasSinAviso.map(function (a) { return a.nombre }).join(", ");
    if (clasesExtra.length) m2 += "\nClase extra: " + clasesExtra.map(function (a) { return a.nombre }).join(", ");
    if (notasSaved.length) m2 += "\n📝 Notas guardadas: " + notasSaved.join(", ");
    setMsg(m2); setDone(true);
  }

  var bS = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: white, color: navy, border: "1px solid " + grayBlue, textAlign: "left" };
  if (done) return (<div style={{ padding: 20 }}><div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, border: "1px solid #b5c48a", whiteSpace: "pre-wrap", fontSize: 14, fontFamily: ft, color: "#5a6a2a", lineHeight: 1.6 }}>{msg}</div><button onClick={function () { setSel(null); setDone(false); setMsg("") }} style={Object.assign({}, bS, { marginTop: 12 })}>← Volver</button></div>);

  if (!sel) return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 14px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Tomar lista</h3>
      {clases.length === 0 ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 14 }}>No hay clases pendientes de lista.</p> :
        clases.map(function (c, i) { return (<button key={i} onClick={function () { selectClass(c) }} style={Object.assign({}, bS, { marginBottom: 8, borderColor: c.pendiente ? "#fca5a5" : grayBlue, background: c.pendiente ? "#fef2f2" : white })}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>{fmtDate(c.date) + " — " + c.alumnos.length + " alumno" + (c.alumnos.length !== 1 ? "s" : "")}</span>{c.pendiente ? <span style={{ fontSize: 10, background: "#991b1b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft, fontWeight: 700 }}>PENDIENTE</span> : null}</div></button>) })}</div>);

  var allIds = sel.alumnos.map(function (a) { return a.alumno.id }).concat(extras.map(function (e) { return e.id }));
  var allMarked = allIds.every(function (id) { return marks[id] === true || marks[id] === false });
  var searchResults = search.length >= 2 ? als.filter(function (a) { return a.nombre.toLowerCase().includes(search.toLowerCase()) && a.sede === profe.sede && !sel.alumnos.find(function (s) { return s.alumno.id === a.id }) && !extras.find(function (e) { return e.id === a.id }) }) : [];

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 4px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 16 }}>{fmtDate(sel.date)}</h3>
      <p style={{ margin: "0 0 16px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{sel.alumnos.length + " esperado" + (sel.alumnos.length !== 1 ? "s" : "")}</p>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, fontSize: 12, fontFamily: ft, color: grayWarm }}><span><span style={{ color: "#5a6a2a", fontWeight: 700 }}>✓</span> Vino</span><span><span style={{ color: "#991b1b", fontWeight: 700 }}>✗</span> Ausente (no se recupera)</span></div>
      {sel.alumnos.map(function (a) { var id = a.alumno.id; var v = marks[id]; var isExp = expanded === id; var alNotas = getNotasFor(id); return (<div key={id} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: isExp ? "10px 10px 0 0" : 10, border: "1px solid " + (isExp ? copper : grayBlue), background: v === true ? "#f0f5e8" : v === false ? "#fef2f2" : white }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <button onClick={function () { setExpanded(isExp ? null : id) }} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid " + (isExp ? copper : "#e8d4b0"), background: isExp ? "#fdf6ec" : "#faf7f2", cursor: "pointer", fontSize: 12, fontFamily: ft, color: copper, fontWeight: 700 }}>📝</button>
            <span style={{ fontFamily: ft, fontSize: 14, color: navy, fontWeight: 500 }}>{a.alumno.nombre}<span style={{ color: grayWarm, fontSize: 12 }}>{a.tipo === "recuperacion" ? " (recup)" : ""}</span>{alNotas.length > 0 ? <span style={{ color: copper, fontSize: 10, marginLeft: 4 }}>{alNotas.length}</span> : null}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={function () { toggleMark(id, true) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === true ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: v === true ? "#5a6a2a" : white, color: v === true ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✓</button>
            <button onClick={function () { toggleMark(id, false) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === false ? "2px solid #991b1b" : "1px solid " + grayBlue, background: v === false ? "#991b1b" : white, color: v === false ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✗</button>
          </div>
        </div>
        {isExp ? (
          <div style={{ border: "1px solid " + copper, borderTop: "none", borderRadius: "0 0 10px 10px", background: "#faf7f2", padding: "12px 14px" }}>
            {alNotas.length > 0 ? (<div style={{ marginBottom: 10 }}><p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: navy, fontFamily: ft }}>Notas anteriores:</p>{alNotas.slice(0, 3).map(function (n) { var d = new Date(n.created_at); return (<div key={n.id} style={{ padding: "6px 10px", marginBottom: 4, background: n.verificado ? "#f0f5e8" : white, borderRadius: 6, border: "1px solid " + (n.verificado ? "#b5c48a" : grayBlue), fontSize: 12, fontFamily: ft, color: navy }}>{n.nota + (n.monto ? " — " + fmtMoney(n.monto) : "") + " · " + n.profe_nombre + " " + d.getDate() + "/" + (d.getMonth() + 1)}{n.verificado ? <span style={{ color: "#5a6a2a", marginLeft: 6 }}>✓</span> : <span style={{ color: "#f59e0b", marginLeft: 6 }}>pendiente</span>}</div>) })}</div>) : null}
            <textarea value={notes[id] || ""} onChange={function (e) { setNote(id, e.target.value) }} placeholder="Ej: pagó $90.000 efectivo, compró tazas, todo ok..." rows={2} style={{ width: "100%", padding: "8px 10px", border: "1px solid " + grayBlue, borderRadius: 6, fontSize: 13, fontFamily: ft, outline: "none", background: white, boxSizing: "border-box", resize: "vertical" }} />
          </div>
        ) : null}
      </div>) })}
      {extras.map(function (al) { var id = al.id; var v = marks[id]; return (<div key={id} style={{ marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: "1px solid #e8d4b0", background: "#fdf6ec" }}><span style={{ fontFamily: ft, fontSize: 14, color: copper, fontWeight: 500 }}>{al.nombre} <span style={{ fontSize: 12 }}>(extra)</span></span><div style={{ display: "flex", gap: 6 }}><button onClick={function () { toggleMark(id, true) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === true ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: v === true ? "#5a6a2a" : white, color: v === true ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✓</button><button onClick={function () { toggleMark(id, false) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === false ? "2px solid #991b1b" : "1px solid " + grayBlue, background: v === false ? "#991b1b" : white, color: v === false ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✗</button></div></div></div>) })}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input value={search} onChange={function (e) { setSearch(e.target.value) }} placeholder="Buscar alumno extra..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, outline: "none", background: cream, boxSizing: "border-box" }} />
        {searchResults.map(function (a) { return (<button key={a.id} onClick={function () { addExtra(a) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", marginTop: 4, borderRadius: 8, border: "1px solid #e8d4b0", background: "#fdf6ec", cursor: "pointer", fontFamily: ft, fontSize: 13, color: copper }}>{"+ " + a.nombre}</button>) })}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={function () { setSel(null); setMarks({}); setExtras([]) }} style={Object.assign({}, bS, { flex: 1 })}>← Volver</button>
        <button disabled={!allMarked || busy} onClick={submitLista} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, cursor: allMarked && !busy ? "pointer" : "default", fontSize: 14, fontWeight: 700, fontFamily: ft, background: allMarked && !busy ? copper : cream, color: allMarked && !busy ? white : grayWarm, border: "none" }}>{busy ? "Enviando..." : "Enviar lista"}</button>
      </div></div>);
}

// ====== ENCARGADA VISTA SEDE ======
function EncargadaVista(props) {
  var profe = props.profe, als = props.als, refreshData = props.refreshData;
  var subTabOverride = props.subTabOverride;
  var sede = profe.sedeEncargada || profe.sede;
  var now = new Date(); var year = now.getFullYear(); var month = now.getMonth();
  var _subTab = useState("cal"), subTabInt = _subTab[0], setSubTab = _subTab[1];
  var subTab = subTabOverride === "finanzas" ? "finanzas" : subTabInt;
  var _selDate = useState(null), selDate = _selDate[0], setSelDate = _selDate[1];
  var _selSlot = useState(null), selSlot = _selSlot[0], setSelSlot = _selSlot[1];

  var _calMonth = useState({ m: month, y: year }), calM = _calMonth[0], setCalM = _calMonth[1];
  var _busyId = useState(null), busyId = _busyId[0], setBusyId = _busyId[1];
  var _notasPago = useState([]), notasPago = _notasPago[0], setNotasPago = _notasPago[1];

  var sched = SCHED[sede] || [];
  var sedeAls = als.filter(function (a) { return a.sede === sede });
  var curMk = now.getFullYear() + "-" + now.getMonth();

  // Build all classes for calMonth
  var allClasses = [];
  sched.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    var dates = classesInMonth(dia, hora, calM.m, calM.y);
    dates.forEach(function (dt) { var cupo = getCupoForSlot(als, sede, dia, hora, dt); allClasses.push({ date: dt, dia: dia, hora: hora, ocupado: cupo.ocupado, libre: cupo.libre, past: dt < now }) })
  });
  var classesOnDate = {};
  allClasses.forEach(function (c) { var k = c.date.getDate(); if (!classesOnDate[k]) classesOnDate[k] = []; classesOnDate[k].push(c) });
  var selClasses = selDate ? (classesOnDate[selDate.getDate()] || []).sort(function (a, b) { return a.date - b.date }) : [];

  function getSlotAlumnos(dia, hora, fecha) {
    var dateStr = fecha.toISOString(); var result = [];
    als.forEach(function (a) { if (a.sede !== sede) return; var matchT1 = a.turno.dia === dia && a.turno.hora === hora; var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora; if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return matchDay(c.iso, dateStr) }); if (!cancelled) result.push({ alumno: a, tipo: "fijo" }); else result.push({ alumno: a, tipo: "canceló" }) } (a.ex || []).forEach(function (e) { if (matchDay(e.date, dateStr) && !result.find(function (r) { return r.alumno.id === a.id })) result.push({ alumno: a, tipo: e.tipo || "recuperacion" }) }) });
    return result;
  }

  // Calendar
  var first = new Date(calM.y, calM.m, 1); var startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  var daysInMonth = new Date(calM.y, calM.m + 1, 0).getDate();
  var cells = []; for (var ci = 0; ci < startDay; ci++) cells.push(null); for (var di = 1; di <= daysInMonth; di++) cells.push(di);
  var dayLabels = ["L", "M", "X", "J", "V", "S", "D"];

  var pendPago = sedeAls.filter(function (a) { return !(a.mp || {})[curMk] });
  var alDia = sedeAls.filter(function (a) { return !!(a.mp || {})[curMk] });

  // Finanzas state
  var _movimientos = useState([]), movs = _movimientos[0], setMovs = _movimientos[1];
  var _movTipo = useState("gasto"), movTipo = _movTipo[0], setMovTipo = _movTipo[1];
  var _movConcepto = useState(""), movConcepto = _movConcepto[0], setMovConcepto = _movConcepto[1];
  var _movMonto = useState(""), movMonto = _movMonto[0], setMovMonto = _movMonto[1];
  var _movForma = useState("efectivo"), movForma = _movForma[0], setMovForma = _movForma[1];
  var _movIva = useState(false), movIva = _movIva[0], setMovIva = _movIva[1];
  var _pagosData = useState([]), pagosData = _pagosData[0], setPagosData = _pagosData[1];
  var _payingAl = useState(null), payingAl = _payingAl[0], setPayingAl = _payingAl[1];
  var _payForma = useState(""), payForma = _payForma[0], setPayForma = _payForma[1];
  var _payMonto = useState(""), payMonto = _payMonto[0], setPayMonto = _payMonto[1];

  useEffect(function () {
    var mk = now.getFullYear() + "-" + now.getMonth();
    supa("movimientos", "GET", "?sede=eq." + encodeURIComponent(sede) + "&mes_key=eq." + mk + "&order=created_at.desc").then(function (r) { if (r) setMovs(r) });
    supa("meses_pagados", "GET", "?order=created_at.desc").then(function (r) { if (r) setPagosData(r) });
    supa("notas_pago", "GET", "?order=created_at.desc&limit=50").then(function (r) { if (r) setNotasPago(r) });
  }, [als]);

  var finMk = now.getFullYear() + "-" + now.getMonth();
  var sedePayments = pagosData.filter(function (p) { if (p.mes_key !== finMk) return false; return sedeAls.find(function (a) { return a.id === p.alumno_id }) });
  var ingTransf = 0, ingEfec = 0;
  sedePayments.forEach(function (p) { var m = p.monto ? Number(p.monto) : 0; if (p.forma_pago === "transferencia") ingTransf += m; else if (p.forma_pago === "efectivo") ingEfec += m });
  var gastoEfec = 0, gastoTransf = 0;
  movs.filter(function (m) { return m.tipo === "gasto" }).forEach(function (m) { var v = Number(m.monto); if (m.forma_pago === "transferencia") gastoTransf += v; else gastoEfec += v });
  var movsIngresos = movs.filter(function (m) { return m.tipo === "ingreso" });
  var ingManualEfec = 0, ingManualTransf = 0, ivaGastos = 0;
  movsIngresos.forEach(function (m) { if (m.forma_pago === "transferencia") ingManualTransf += Number(m.monto); else ingManualEfec += Number(m.monto) });
  movs.filter(function (m) { return m.tipo === "gasto" && m.incluye_iva }).forEach(function (m) { ivaGastos += Number(m.monto) * 0.21 / 1.21 });
  var totalEfec = ingEfec + ingManualEfec;
  var totalTransf = ingTransf + ingManualTransf;
  var saldoEfectivo = totalEfec - gastoEfec;
  var iibb = totalTransf * 0.018;
  var impCheque = totalTransf * 0.006;
  var saldoCuenta = totalTransf - gastoTransf - iibb - impCheque;
  var ivaDebito = totalTransf * 0.21 / 1.21;
  var ivaAPagar = Math.max(0, ivaDebito - ivaGastos);

  async function confirmPay() {
    if (!payingAl || !payForma || !payMonto) return;
    if (!window.confirm("¿Confirmás el pago de " + payingAl.nombre + " por " + fmtMoney(parseFloat(payMonto)) + " en " + payForma + "?")) return;
    setBusyId(payingAl.id);
    await supa("meses_pagados", "POST", "", { alumno_id: payingAl.id, mes_key: curMk, forma_pago: payForma, monto: parseFloat(payMonto), registrado_por: profe.nombre });
    await supa("historial", "POST", "", { alumno_id: payingAl.id, accion: "💳 " + MN[month] + " " + year + " " + payForma + " " + fmtMoney(parseFloat(payMonto)) + " (enc: " + profe.nombre + ")" });
    await refreshData(); setBusyId(null); setPayingAl(null); setPayForma(""); setPayMonto("");
  }
  async function addMov() {
    if (!movConcepto || !movMonto) return; setBusyId("mov");
    await supa("movimientos", "POST", "", { sede: sede, mes_key: finMk, tipo: movTipo, concepto: movConcepto, monto: parseFloat(movMonto), forma_pago: movForma, incluye_iva: movIva });
    var r = await supa("movimientos", "GET", "?sede=eq." + encodeURIComponent(sede) + "&mes_key=eq." + finMk + "&order=created_at.desc"); if (r) setMovs(r);
    setBusyId(null); setMovConcepto(""); setMovMonto(""); setMovIva(false);
  }
  async function deleteMov(id) { setBusyId("del" + id); await supa("movimientos", "DELETE", "?id=eq." + id); var r = await supa("movimientos", "GET", "?sede=eq." + encodeURIComponent(sede) + "&mes_key=eq." + finMk + "&order=created_at.desc"); if (r) setMovs(r); setBusyId(null) }

  var subBtnStyle = function (active) { return { flex: 1, padding: "8px 6px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: ft, background: active ? white : cream, color: active ? navy : grayWarm, borderBottom: active ? "2px solid " + copper : "2px solid transparent", borderTop: "none", borderLeft: "none", borderRight: "none" } };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {subTabOverride !== "finanzas" ? (
        <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
          <button onClick={function () { setSubTab("cal"); setSelSlot(null) }} style={subBtnStyle(subTab === "cal")}>Calendario</button>

          <button onClick={function () { setSubTab("pagos") }} style={subBtnStyle(subTab === "pagos")}>Pagos</button>
          <button onClick={function () { setSubTab("notas") }} style={subBtnStyle(subTab === "notas")}>Notas</button>
        </div>
      ) : null}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

        {subTab === "cal" ? (
          <div>
            <h3 style={{ margin: "0 0 12px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 17 }}>{"📍 " + sede}</h3>
            <div style={{ background: white, borderRadius: 12, border: "1px solid " + grayBlue, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <button onClick={function () { setCalM(function (p) { return p.m === 0 ? { m: 11, y: p.y - 1 } : { m: p.m - 1, y: p.y } }) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>‹</button>
                <span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{MN[calM.m] + " " + calM.y}</span>
                <button onClick={function () { setCalM(function (p) { return p.m === 11 ? { m: 0, y: p.y + 1 } : { m: p.m + 1, y: p.y } }) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>›</button></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
                {dayLabels.map(function (l) { return <div key={l} style={{ fontSize: 11, color: grayWarm, fontFamily: ft, fontWeight: 600, padding: 4 }}>{l}</div> })}
                {cells.map(function (d, i) {
                  var hasCls = d && classesOnDate[d]; var isSel = selDate && d === selDate.getDate() && calM.m === selDate.getMonth();
                  var isToday = d && now.getDate() === d && now.getMonth() === calM.m; var isFer = d && isFeriado(new Date(calM.y, calM.m, d));
                  return (<div key={i} onClick={function () { if (d) { setSelDate(new Date(calM.y, calM.m, d)); setSelSlot(null) } }}
                    style={{ padding: "8px 2px", borderRadius: 8, cursor: d ? "pointer" : "default", background: isSel ? copper : isFer ? "#fdf6ec" : hasCls ? "#f0f5e8" : "transparent", color: isSel ? white : isFer ? "#f59e0b" : hasCls ? "#5a6a2a" : d ? navy : "transparent", fontWeight: isSel || isToday ? 700 : 400, fontSize: 13, fontFamily: ft, border: isToday && !isSel ? "1px solid " + copper : "1px solid transparent", position: "relative" }}>
                    {d || ""}</div>)
                })}</div></div>
            {selDate && !selSlot ? (<div>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>{selDate.getDate() + " de " + MN[selDate.getMonth()]}</p>
              {isFeriado(selDate) ? <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #e8d4b0", background: "#fdf6ec" }}><p style={{ margin: 0, fontSize: 13, fontFamily: ft, color: "#92651e", fontWeight: 600 }}>FERIADO — cerrado</p></div>
                : selClasses.map(function (c, i) { return (<button key={i} onClick={function () { setSelSlot(c) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 6, borderRadius: 10, border: "1px solid " + grayBlue, background: white, cursor: "pointer", fontFamily: ft }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 600, color: navy, fontSize: 14 }}>{c.hora + " — " + c.dia}</span><span style={{ fontSize: 12, color: copper, fontWeight: 600 }}>{c.ocupado + " alum · " + c.libre + " libre"}</span></div></button>) })}
            </div>) : null}
            {selSlot ? (function () {
              var slotAls = getSlotAlumnos(selSlot.dia, selSlot.hora, selSlot.date);
              var fijos = slotAls.filter(function (s) { return s.tipo === "fijo" });
              var recups = slotAls.filter(function (s) { return s.tipo !== "fijo" && s.tipo !== "canceló" });
              var cancels = slotAls.filter(function (s) { return s.tipo === "canceló" });
              return (<div>
                <button onClick={function () { setSelSlot(null) }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: ft, fontSize: 13, color: copper, padding: 0, marginBottom: 10, fontWeight: 600 }}>← Volver</button>
                <p style={{ margin: "0 0 12px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{selSlot.dia + " " + selSlot.hora}</p>
                {fijos.length > 0 ? <div style={{ marginBottom: 10 }}><p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: grayWarm, fontFamily: ft }}>Fijos:</p>{fijos.map(function (s) { return <div key={s.alumno.id} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "#f0f5e8", border: "1px solid #b5c48a" }}><span style={{ fontFamily: ft, fontSize: 13, color: navy }}>{s.alumno.nombre}</span></div> })}</div> : null}
                {recups.length > 0 ? <div style={{ marginBottom: 10 }}><p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: grayWarm, fontFamily: ft }}>Recuperaciones:</p>{recups.map(function (s) { return <div key={s.alumno.id} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "#fdf6ec", border: "1px solid #e8d4b0" }}><span style={{ fontFamily: ft, fontSize: 13, color: copper }}>{s.alumno.nombre}</span></div> })}</div> : null}
                {cancels.length > 0 ? <div style={{ marginBottom: 10 }}><p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: grayWarm, fontFamily: ft }}>Cancelaron:</p>{cancels.map(function (s) { return <div key={s.alumno.id} style={{ padding: "8px 12px", marginBottom: 4, borderRadius: 8, background: "#fef2f2", border: "1px solid #fca5a5" }}><span style={{ fontFamily: ft, fontSize: 13, color: "#991b1b", textDecoration: "line-through" }}>{s.alumno.nombre}</span></div> })}</div> : null}
              </div>)
            })() : null}
            {!selDate ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 13, textAlign: "center", marginTop: 8 }}>Tocá un día para ver las clases</p> : null}
          </div>
        ) : null}

        {subTab === "pagos" ? (
          <div>
            <h3 style={{ margin: "0 0 4px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 17 }}>{"Pagos " + MN[month] + " — " + sede}</h3>
            <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{alDia.length + " al día · " + pendPago.length + " pendiente" + (pendPago.length !== 1 ? "s" : "")}</p>
            {payingAl ? (
              <div style={{ background: "#f8f6f2", borderRadius: 12, padding: 16, border: "1px solid " + gold, marginBottom: 16 }}>
                <p style={{ margin: "0 0 10px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>{"Registrar pago — " + payingAl.nombre}</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button onClick={function () { setPayForma("efectivo") }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: payForma === "efectivo" ? "2px solid " + copper : "1px solid " + grayBlue, background: payForma === "efectivo" ? "#fdf6ec" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Efectivo</button>
                  <button onClick={function () { setPayForma("transferencia") }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: payForma === "transferencia" ? "2px solid " + copper : "1px solid " + grayBlue, background: payForma === "transferencia" ? "#fdf6ec" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Transferencia</button></div>
                <input type="number" value={payMonto} onChange={function (e) { setPayMonto(e.target.value) }} placeholder="Monto ($)" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function () { setPayingAl(null) }} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid " + grayBlue, background: white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
                  <button disabled={!payForma || !payMonto} onClick={confirmPay} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: payForma && payMonto ? copper : cream, color: payForma && payMonto ? white : grayWarm, fontFamily: ft, fontWeight: 700, fontSize: 13, cursor: payForma && payMonto ? "pointer" : "default" }}>Confirmar</button></div></div>
            ) : null}
            {pendPago.length > 0 ? (<div style={{ marginBottom: 16 }}>
              <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: "10px 10px 0 0", border: "1px solid #fca5a5" }}><span style={{ fontWeight: 700, color: "#991b1b", fontFamily: ft, fontSize: 14 }}>{"Pendientes (" + pendPago.length + ")"}</span></div>
              <div style={{ border: "1px solid #fca5a5", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {pendPago.map(function (a) { return (<div key={a.id} style={{ padding: "10px 14px", borderBottom: "1px solid #fca5a5", background: white, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><p style={{ margin: 0, fontFamily: ft, fontSize: 13, color: navy, fontWeight: 500 }}>{a.nombre}</p><p style={{ margin: 0, fontFamily: ft, fontSize: 11, color: grayWarm }}>{a.turno.dia + " " + a.turno.hora}</p></div><button onClick={function () { setPayingAl(a); setPayForma(""); setPayMonto("") }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #b5c48a", background: "#f0f5e8", color: "#5a6a2a", cursor: "pointer", fontFamily: ft, fontSize: 12, fontWeight: 700 }}>Pagó</button></div>) })}
              </div></div>) : null}
            {alDia.length > 0 ? (<div>
              <div style={{ padding: "10px 14px", background: "#f0f5e8", borderRadius: "10px 10px 0 0", border: "1px solid #b5c48a" }}><span style={{ fontWeight: 700, color: "#5a6a2a", fontFamily: ft, fontSize: 14 }}>{"Al día (" + alDia.length + ")"}</span></div>
              <div style={{ border: "1px solid #b5c48a", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {alDia.map(function (a) { var pd = sedePayments.find(function (p) { return p.alumno_id === a.id }); return (<div key={a.id} style={{ padding: "10px 14px", borderBottom: "1px solid #b5c48a", background: white, display: "flex", justifyContent: "space-between" }}><div><p style={{ margin: 0, fontFamily: ft, fontSize: 13, color: navy }}>{a.nombre}</p><p style={{ margin: 0, fontFamily: ft, fontSize: 11, color: grayWarm }}>{a.turno.dia + " " + a.turno.hora}</p></div><span style={{ fontSize: 11, color: "#5a6a2a", fontFamily: ft, fontWeight: 600 }}>{pd && pd.monto ? fmtMoney(pd.monto) : "✓"}</span></div>) })}
              </div></div>) : null}
          </div>
        ) : null}

        {subTab === "notas" ? (
          <div>
            <h3 style={{ margin: "0 0 4px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 17 }}>{"Notas de pago — " + sede}</h3>
            <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 12, fontFamily: ft }}>Notas dejadas por las profesoras. Marcá en verde cuando verifiques el pago.</p>
            {notasPago.filter(function (n) { var al = sedeAls.find(function (a) { return a.id === n.alumno_id }); return !!al }).length === 0 ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 14 }}>No hay notas pendientes.</p> : null}
            {notasPago.filter(function (n) { return !n.verificado && sedeAls.find(function (a) { return a.id === n.alumno_id }) }).length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ padding: "10px 14px", background: "#fdf6ec", borderRadius: "10px 10px 0 0", border: "1px solid #e8d4b0" }}><span style={{ fontWeight: 700, color: copper, fontFamily: ft, fontSize: 14 }}>{"Pendientes de verificar"}</span></div>
                <div style={{ border: "1px solid #e8d4b0", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {notasPago.filter(function (n) { return !n.verificado && sedeAls.find(function (a) { return a.id === n.alumno_id }) }).map(function (n) {
                    var al = sedeAls.find(function (a) { return a.id === n.alumno_id });
                    var d = new Date(n.created_at);
                    return (<div key={n.id} style={{ padding: "12px 14px", borderBottom: "1px solid #e8d4b0", background: white, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: ft, fontSize: 13, color: navy, fontWeight: 600 }}>{al ? al.nombre : "?"}</p>
                        <p style={{ margin: "2px 0 0", fontFamily: ft, fontSize: 12, color: grayWarm }}>{n.nota + (n.monto ? " — " + fmtMoney(n.monto) : "")}</p>
                        <p style={{ margin: "2px 0 0", fontFamily: ft, fontSize: 11, color: grayWarm }}>{n.profe_nombre + " · " + d.getDate() + "/" + (d.getMonth() + 1)}</p>
                      </div>
                      <button disabled={busyId === "ver" + n.id} onClick={function () { setBusyId("ver" + n.id); supa("notas_pago", "PATCH", "?id=eq." + n.id, { verificado: true, verificado_por: profe.nombre, verificado_at: new Date().toISOString() }).then(function () { return supa("notas_pago", "GET", "?order=created_at.desc&limit=50") }).then(function (r) { if (r) setNotasPago(r); setBusyId(null) }) }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #b5c48a", background: "#f0f5e8", color: "#5a6a2a", cursor: "pointer", fontFamily: ft, fontSize: 12, fontWeight: 700 }}>{"✓ Verificar"}</button>
                    </div>)
                  })}
                </div>
              </div>
            ) : null}
            {notasPago.filter(function (n) { return n.verificado && sedeAls.find(function (a) { return a.id === n.alumno_id }) }).length > 0 ? (
              <div>
                <div style={{ padding: "10px 14px", background: "#f0f5e8", borderRadius: "10px 10px 0 0", border: "1px solid #b5c48a" }}><span style={{ fontWeight: 700, color: "#5a6a2a", fontFamily: ft, fontSize: 14 }}>{"Verificados"}</span></div>
                <div style={{ border: "1px solid #b5c48a", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                  {notasPago.filter(function (n) { return n.verificado && sedeAls.find(function (a) { return a.id === n.alumno_id }) }).map(function (n) {
                    var al = sedeAls.find(function (a) { return a.id === n.alumno_id });
                    var d = new Date(n.created_at);
                    return (<div key={n.id} style={{ padding: "10px 14px", borderBottom: "1px solid #b5c48a", background: white }}>
                      <p style={{ margin: 0, fontFamily: ft, fontSize: 13, color: navy }}>{(al ? al.nombre : "?") + " — " + n.nota + (n.monto ? " " + fmtMoney(n.monto) : "")}</p>
                      <p style={{ margin: "2px 0 0", fontFamily: ft, fontSize: 11, color: "#5a6a2a" }}>{"✓ " + (n.verificado_por || "") + " · " + d.getDate() + "/" + (d.getMonth() + 1)}</p>
                    </div>)
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {subTab === "finanzas" ? (
          <div>
            <h3 style={{ margin: "0 0 12px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 17 }}>{"Finanzas " + MN[month] + " — " + sede}</h3>
            <div style={{ background: "#f8f6f2", borderRadius: 12, padding: 16, border: "1px solid " + grayBlue, marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>Efectivo</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: "#f0f5e8", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #b5c48a" }}><p style={{ margin: 0, fontSize: 11, color: "#5a6a2a", fontFamily: ft }}>Ingresos</p><p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#5a6a2a", fontFamily: ft }}>{fmtMoney(totalEfec)}</p></div>
                <div style={{ flex: 1, background: "#fef2f2", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #fca5a5" }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Gastos</p><p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(gastoEfec)}</p></div></div>
              <div style={{ background: saldoEfectivo >= 0 ? "#f0f5e8" : "#fef2f2", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid " + (saldoEfectivo >= 0 ? "#b5c48a" : "#fca5a5") }}><p style={{ margin: 0, fontSize: 12, color: navy, fontFamily: ft }}>Total en efectivo</p><p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: saldoEfectivo >= 0 ? "#5a6a2a" : "#991b1b", fontFamily: ft }}>{fmtMoney(Math.round(saldoEfectivo))}</p></div></div>
            <div style={{ background: "#f8f6f2", borderRadius: 12, padding: 16, border: "1px solid " + grayBlue, marginBottom: 12 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>Cuenta</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: "#f0f5e8", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #b5c48a" }}><p style={{ margin: 0, fontSize: 11, color: "#5a6a2a", fontFamily: ft }}>Ingresos</p><p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#5a6a2a", fontFamily: ft }}>{fmtMoney(totalTransf)}</p></div>
                <div style={{ flex: 1, background: "#fef2f2", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid #fca5a5" }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Gastos + imp</p><p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(Math.round(gastoTransf + iibb + impCheque))}</p></div></div>
              <div style={{ background: saldoCuenta >= 0 ? "#f0f5e8" : "#fef2f2", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid " + (saldoCuenta >= 0 ? "#b5c48a" : "#fca5a5") }}><p style={{ margin: 0, fontSize: 12, color: navy, fontFamily: ft }}>Total en cuenta</p><p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 700, color: saldoCuenta >= 0 ? "#5a6a2a" : "#991b1b", fontFamily: ft }}>{fmtMoney(Math.round(saldoCuenta))}</p></div></div>
            <div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5", marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#991b1b", fontFamily: ft, fontSize: 15 }}>{"IVA estimado — " + MN[month]}</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: ft, fontSize: 13, color: grayWarm }}>IVA débito</span><span style={{ fontFamily: ft, fontSize: 13, fontWeight: 600, color: "#991b1b" }}>{fmtMoney(Math.round(ivaDebito))}</span></div>
              {ivaGastos > 0 ? <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontFamily: ft, fontSize: 13, color: grayWarm }}>IVA crédito</span><span style={{ fontFamily: ft, fontSize: 13, fontWeight: 600, color: "#5a6a2a" }}>{"-" + fmtMoney(Math.round(ivaGastos))}</span></div> : null}
              <div style={{ borderTop: "1px solid #fca5a5", paddingTop: 8, marginTop: 6, display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: ft, fontSize: 18, fontWeight: 700, color: "#991b1b" }}>A pagar</span><span style={{ fontFamily: ft, fontSize: 18, fontWeight: 700, color: "#991b1b" }}>{fmtMoney(Math.round(ivaAPagar))}</span></div></div>
            <div style={{ background: white, borderRadius: 12, padding: 16, border: "1px solid " + grayBlue, marginBottom: 14 }}>
              <p style={{ margin: "0 0 10px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>Cargar ingreso / gasto</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={function () { setMovTipo("ingreso") }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: movTipo === "ingreso" ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: movTipo === "ingreso" ? "#f0f5e8" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>+ Ingreso</button>
                <button onClick={function () { setMovTipo("gasto") }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: movTipo === "gasto" ? "2px solid #991b1b" : "1px solid " + grayBlue, background: movTipo === "gasto" ? "#fef2f2" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>- Gasto</button></div>
              <input value={movConcepto} onChange={function (e) { setMovConcepto(e.target.value) }} placeholder="Concepto" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid " + grayBlue, fontSize: 13, fontFamily: ft, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <input type="number" value={movMonto} onChange={function (e) { setMovMonto(e.target.value) }} placeholder="Monto ($)" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid " + grayBlue, fontSize: 13, fontFamily: ft, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={function () { setMovForma("efectivo") }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: movForma === "efectivo" ? "2px solid " + copper : "1px solid " + grayBlue, background: movForma === "efectivo" ? "#fdf6ec" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Efectivo</button>
                <button onClick={function () { setMovForma("transferencia") }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: movForma === "transferencia" ? "2px solid " + copper : "1px solid " + grayBlue, background: movForma === "transferencia" ? "#fdf6ec" : white, color: navy, fontFamily: ft, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Transferencia</button></div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: ft, fontSize: 13, color: navy, marginBottom: 10, cursor: "pointer" }}><input type="checkbox" checked={movIva} onChange={function (e) { setMovIva(e.target.checked) }} />Incluye IVA (21%)</label>
              <button disabled={!movConcepto || !movMonto} onClick={addMov} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: movConcepto && movMonto ? copper : cream, color: movConcepto && movMonto ? white : grayWarm, fontFamily: ft, fontWeight: 700, fontSize: 13, cursor: movConcepto && movMonto ? "pointer" : "default" }}>Guardar</button></div>
            {movs.length > 0 ? (<div style={{ marginBottom: 14 }}><p style={{ margin: "0 0 8px", fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>Movimientos del mes</p>
              {movs.map(function (m) { var isIng = m.tipo === "ingreso"; return (<div key={m.id} style={{ padding: "10px 14px", marginBottom: 4, borderRadius: 8, background: isIng ? "#f0f5e8" : "#fef2f2", border: "1px solid " + (isIng ? "#b5c48a" : "#fca5a5"), display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><p style={{ margin: 0, fontFamily: ft, fontSize: 13, color: navy, fontWeight: 500 }}>{m.concepto}</p><p style={{ margin: 0, fontFamily: ft, fontSize: 11, color: grayWarm }}>{m.forma_pago + (m.incluye_iva ? " · IVA" : "")}</p></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: ft, fontSize: 14, fontWeight: 700, color: isIng ? "#5a6a2a" : "#991b1b" }}>{(isIng ? "+" : "-") + fmtMoney(m.monto)}</span><button onClick={function () { deleteMov(m.id) }} style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid " + grayBlue, background: white, color: grayWarm, cursor: "pointer", fontSize: 11, fontFamily: ft }}>✗</button></div></div>) })}
            </div>) : null}
          </div>
        ) : null}

      </div>
    </div>);
}

// ====== ALUMNO CALENDAR ======
function AlumnoCal(props) {
  var al = props.al; var cuotas = props.cuotas || [];
  var now = new Date(); var curMk = now.getFullYear() + "-" + now.getMonth();
  var paidCurrent = !!(al.mp || {})[curMk];
  var cuotaInfo = getCuotaInfo(cuotas, al.sede, al.frecuencia || "1x");
  // Next month visible from day 20
  var showNextMonth = now.getDate() >= 20;
  var nxtDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  var nxtMk = nxtDate.getFullYear() + "-" + nxtDate.getMonth();
  var paidNext = !!(al.mp || {})[nxtMk];
  var all = [];
  // Current month classes (always shown)
  var curClasses = allClassesForAlumno(al, now.getMonth(), now.getFullYear());
  var cm = (al.canc || []).filter(function (c) { return c.mk === curMk });
  curClasses.forEach(function (d) {
    var cancelled = cm.some(function (c) { return matchDay(c.iso, d) });
    var cancelInfo = cm.find(function (c) { return matchDay(c.iso, d) });
    var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false; var ausente = cancelInfo ? cancelInfo.sinAviso : false;
    if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup, ausente: ausente });
    else all.push({ date: d, extra: false, feriado: feriado });
  });
  // Next month classes (from day 20)
  if (showNextMonth) {
    var nxtClasses = allClassesForAlumno(al, nxtDate.getMonth(), nxtDate.getFullYear());
    var nxtCanc = (al.canc || []).filter(function (c) { return c.mk === nxtMk });
    nxtClasses.forEach(function (d) {
      var cancelled = nxtCanc.some(function (c) { return matchDay(c.iso, d) });
      var cancelInfo = nxtCanc.find(function (c) { return matchDay(c.iso, d) });
      var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false; var ausente = cancelInfo ? cancelInfo.sinAviso : false;
      if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup, ausente: ausente, nextMonth: true });
      else all.push({ date: d, extra: false, feriado: feriado, nextMonth: true });
    });
  }
  // Other paid months - only show if they have pending recoveries
  var pm = Object.keys(al.mp || {});
  pm.forEach(function (mk) {
    if (mk === curMk || mk === nxtMk) return;
    var p = mk.split("-").map(Number);
    var pastMonth = new Date(p[0], p[1] + 1, 0) < now; // last day of that month < now
    if (pastMonth) {
      // Only include if there are pending recoveries
      var stats = getMonthStats(al, mk);
      if (stats.pendientes === 0) return; // skip - nothing pending
    }
    var mc = allClassesForAlumno(al, p[1], p[0]); var cmk = (al.canc || []).filter(function (c) { return c.mk === mk }); mc.forEach(function (d) { var cancelled = cmk.some(function (c) { return matchDay(c.iso, d) }); var cancelInfo = cmk.find(function (c) { return matchDay(c.iso, d) }); var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false; if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup }); else all.push({ date: d, extra: false, feriado: feriado }) })
  });
  (al.ex || []).forEach(function (e) { all.push({ date: new Date(e.date), extra: true }) });
  all.sort(function (a, b) { return a.date - b.date });
  // Only show stats for current/future months or past months with pendientes
  var statsBlocks = pm.filter(function (mk) {
    if (mk === curMk) return true;
    var p = mk.split("-").map(Number);
    var pastMonth = new Date(p[0], p[1] + 1, 0) < now;
    if (pastMonth) { var stats = getMonthStats(al, mk); return stats.pendientes > 0 }
    return true;
  }).map(function (mk) { var stats = getMonthStats(al, mk); var p = mk.split("-").map(Number); return { label: MN[p[1]] + " " + p[0], stats: stats, mk: mk } });
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Tus clases</h3>
      <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{al.turno.dia + " " + al.turno.hora + (al.turno2 ? " y " + al.turno2.dia + " " + al.turno2.hora : "") + " · " + al.sede}</p>
      {!paidCurrent && cuotaInfo ? (<div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 15, fontFamily: ft }}>{"Cuota de " + MN[now.getMonth()] + " pendiente"}</p>{al.descuento ? <span style={{ background: "#d97706", color: white, fontSize: 11, fontWeight: 700, fontFamily: ft, padding: "3px 9px", borderRadius: 20 }}>{al.descuento + "% OFF 💛"}</span> : null}</div>
        <div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <PrecioConDesc precio={cuotaInfo.efectivo} descuento={al.descuento} label="Efectivo" />
            <PrecioConDesc precio={cuotaInfo.transferencia} descuento={al.descuento} label="Transferencia" /></div>
          {cuotaInfo.diasRestantes ? (<div style={{ marginTop: 10, background: "#fde68a", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e", fontFamily: ft }}>{"Te quedan " + cuotaInfo.diasRestantes + " día" + (cuotaInfo.diasRestantes > 1 ? "s" : "") + " para pagar este precio"}</p>{cuotaInfo.nextAumento ? <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e", fontFamily: ft }}>{"Después: ef. " + fmtMoney(conDesc(cuotaInfo.nextAumento.efectivo, al.descuento)) + " · transf. " + fmtMoney(conDesc(cuotaInfo.nextAumento.transferencia, al.descuento))}</p> : null}</div>) : null}
        </div></div>) : null}
      {showNextMonth && !paidNext ? (<div style={{ background: "#fdf6ec", borderRadius: 12, padding: 14, border: "1px solid #e8d4b0", marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 600, color: copper, fontSize: 14, fontFamily: ft }}>{"📅 " + MN[nxtDate.getMonth()] + " — Ya podés ver tus clases del mes que viene"}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92651e", fontFamily: ft }}>{"Podés cancelar clases, pero para recuperar necesitás tener el pago al día."}</p>
      </div>) : null}
      {statsBlocks.map(function (sb) { return (<div key={sb.mk} style={{ background: "#f8f6f2", borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: "1px solid " + grayBlue }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>{sb.label}</span><span style={{ fontSize: 12, color: copper, fontFamily: ft, fontWeight: 600 }}>{sb.stats.clasesEfectivas + "/" + CLASES_BASE + " clases"}</span></div>{sb.stats.pendientes > 0 ? <div style={{ background: "#fdf6ec", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: copper, fontFamily: ft, border: "1px solid #e8d4b0" }}>{"🔄 " + sb.stats.pendientes + " pendiente(s)"}</div> : null}</div>) })}
      {al.reg > 0 ? <div style={{ background: "#fdf6ec", border: "1px solid #e8d4b0", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: copper, fontFamily: ft }}>{"🎁 " + al.reg + " clase(s) a favor"}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {all.map(function (c, i) { var h = hrsUntil(c.date); var past = h < 0; var fer = c.feriado; var canc = c.cancelled;
          return (<div key={i} style={{ padding: "14px 16px", borderRadius: 10, background: canc ? "#fef2f2" : fer ? "#fdf6ec" : past ? cream : c.nextMonth ? "#f8f6f2" : white, border: "1px solid " + (canc ? "#fca5a5" : fer ? "#e8d4b0" : past ? grayBlue : c.nextMonth ? "#e8d4b0" : gold), opacity: past && !canc ? 0.45 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: canc ? "#991b1b" : navy, fontFamily: ft, fontSize: 14, textDecoration: canc ? "line-through" : "none" }}>{fmtDate(c.date)}</span>
              {canc && fer ? <span style={{ fontSize: 11, background: "#991b1b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>FERIADO</span> : canc && c.ausente ? <span style={{ fontSize: 11, background: "#6b7280", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>AUSENTE</span> : canc ? <span style={{ fontSize: 11, background: "#991b1b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>CANCELADA</span> : fer ? <span style={{ fontSize: 11, background: "#f59e0b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>FERIADO</span> : c.nextMonth ? <span style={{ fontSize: 11, background: copper, color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>{MN[c.date.getMonth()]}</span> : c.extra ? <span style={{ fontSize: 11, background: olive, color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>recuperación</span> : null}</div>
            {canc ? <div style={{ fontSize: 12, color: c.ausente ? "#6b7280" : "#991b1b", marginTop: 5, fontFamily: ft }}>{c.ausente ? "No viniste a esta clase · no se recupera" : c.sinRecup ? "No se recupera" : "Podrás recuperarla"}</div> : null}
            {!past && !fer && !canc && h < 24 ? <div style={{ fontSize: 11, color: copper, marginTop: 5, fontFamily: ft }}>{"⚠ Menos de 24h"}</div> : null}
          </div>) })}</div></div>);
}

// ====== ALUMNO FLOW ======
function AlumnoFlow(props) {
  var al = props.al, allAls = props.allAls, refreshData = props.refreshData, cuotas = props.cuotas || [], horariosExtra = props.horariosExtra || [];
  var pm = Object.keys(al.mp || {}); var paid = pm.length > 0 || al.excepcion;
  var now = new Date(); var curMk = now.getFullYear() + "-" + now.getMonth();
  var paidCurrent = !!(al.mp || {})[curMk] || al.excepcion;
  var cuotaInfo = getCuotaInfo(cuotas, al.sede, al.frecuencia || "1x");
  var _st = useState("menu"), step = _st[0], setStep = _st[1];
  var _sel = useState(null), sel = _sel[0], setSel = _sel[1];
  var _cm = useState(""), cMsg = _cm[0], setCMsg = _cm[1];
  var _cr = useState(true), canRec = _cr[0], setCanRec = _cr[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  var _calDate = useState(null), calDate = _calDate[0], setCalDate = _calDate[1];
  useEffect(function () { setStep("menu"); setSel(null); setCMsg(""); setCalDate(null) }, [al.id]);

  var curStats = (al.mp || {})[curMk] ? getMonthStats(al, curMk) : null;
  var nd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  var nxtMk = nd.getFullYear() + "-" + nd.getMonth();
  var totalPendientes = 0;
  if (curStats) totalPendientes += curStats.pendientes;
  pm.forEach(function (mk) { if (mk !== curMk) { var s = getMonthStats(al, mk); totalPendientes += s.pendientes } });

  // Next month visible from day 20
  var showNextMonth = now.getDate() >= 20;
  var paidNext = !!(al.mp || {})[nxtMk] || al.excepcion;

  function getUp() {
    var cls = [];
    pm.forEach(function (mk) { var p = mk.split("-").map(Number); var mc = allClassesForAlumno(al, p[1], p[0]); var cm2 = (al.canc || []).filter(function (c) { return c.mk === mk }); mc.forEach(function (d) { if (hrsUntil(d) > 0 && !cm2.some(function (c) { return matchDay(c.iso, d) })) cls.push({ date: d, mk: mk, tot: mc.length }) }) });
    // Next month classes (for cancelling, from day 20)
    if (showNextMonth) {
      var nxtClasses = allClassesForAlumno(al, nd.getMonth(), nd.getFullYear());
      var nxtCanc = (al.canc || []).filter(function (c) { return c.mk === nxtMk });
      nxtClasses.forEach(function (d) { if (hrsUntil(d) > 0 && !nxtCanc.some(function (c) { return matchDay(c.iso, d) })) cls.push({ date: d, mk: nxtMk, tot: nxtClasses.length, nextMonth: true }) });
    }
    (al.ex || []).forEach(function (e) { var d = new Date(e.date); if (hrsUntil(d) > 0) { var wasCancelled = (al.canc || []).some(function (c) { return matchDay(c.iso, e.date) && c.isExtra }); if (!wasCancelled) cls.push({ date: d, mk: e.mk, isExtra: true }) } });
    return cls.sort(function (a, b) { return a.date - b.date })
  }
  function getRM() { var months = [curMk]; if ((al.mp || {})[nxtMk]) months.push(nxtMk); return months }
  function getAllAvailableSlots() {
    var sched = SCHED[al.sede]; if (!sched) return [];
    var vm = getRM(); if (!vm.length) return [];
    var alts = [];
    var closedSet = {}; (horariosExtra || []).forEach(function (h) { if (!h.abierto && h.sede === al.sede) closedSet[h.dia + "-" + h.hora + "-" + h.mes_key] = true });
    sched.forEach(function (key) { var parts = key.split("-"); vm.forEach(function (mk) { var p = mk.split("-").map(Number); if (closedSet[parts[0] + "-" + parts[1] + "-" + mk]) return; classesInMonth(parts[0], parts[1], p[1], p[0]).forEach(function (d) { if (hrsUntil(d) > 0 && !isFeriado(d)) { var cupo = getCupoForSlot(allAls, al.sede, parts[0], parts[1], d); if (cupo.libre > 0) alts.push({ date: d, mk: mk, cupoLibre: cupo.libre, dia: parts[0], hora: parts[1] }) } }) }) });
    (horariosExtra || []).forEach(function (h) { if (!h.abierto || h.sede !== al.sede) return; var schedKey = h.dia + "-" + h.hora; if (sched.indexOf(schedKey) !== -1) return; var mk = h.mes_key; if (vm.indexOf(mk) === -1) return; var p = mk.split("-").map(Number); classesInMonth(h.dia, h.hora, p[1], p[0]).forEach(function (d) { if (hrsUntil(d) > 0 && !isFeriado(d)) { var cupo = getCupoForSlot(allAls, al.sede, h.dia, h.hora, d, h.cupos); if (cupo.libre > 0) alts.push({ date: d, mk: mk, cupoLibre: cupo.libre, dia: h.dia, hora: h.hora }) } }) });
    var seen = {}; return alts.filter(function (a) { var k = dayKey(a.date) + a.hora; if (seen[k]) return false; seen[k] = true; return true }).sort(function (a, b) { return a.date - b.date });
  }
  function getSlotsForDate(date) { if (!date) return []; return getAllAvailableSlots().filter(function (s) { return dayKey(s.date) === dayKey(date) }) }
  function getAvailableDates() { var slots = getAllAvailableSlots(); var seen = {}; var dates = []; slots.forEach(function (s) { var k = dayKey(s.date); if (!seen[k]) { seen[k] = true; dates.push(s.date) } }); return dates }

  async function doCanc(ci) {
    setBusy(true);
    if (ci.isExtra) {
      // Check if it was a regalo - need to restore the counter
      var dk = dayKey(ci.date);
      var extraRows = await supa("clases_extra", "GET", "?alumno_id=eq." + al.id + "&fecha_iso=gte." + dk + "T00:00:00.000Z&fecha_iso=lte." + dk + "T23:59:59.999Z");
      var wasRegalo = extraRows && extraRows.length > 0 && extraRows[0].tipo === "regalo";
      await supa("clases_extra", "DELETE", "?alumno_id=eq." + al.id + "&fecha_iso=gte." + dk + "T00:00:00.000Z&fecha_iso=lte." + dk + "T23:59:59.999Z");
      if (wasRegalo) { await supa("alumnos", "PATCH", "?id=eq." + al.id, { clase_regalo: (al.reg || 0) + 1 }) }
      await supa("historial", "POST", "", { alumno_id: al.id, accion: "❌ Canceló " + (wasRegalo ? "regalo" : "recup") + " " + fmtDate(ci.date) });
      await refreshData(); setBusy(false); setCanRec(true); setCMsg("");
    } else {
      var stats = getMonthStats(al, ci.mk);
      var tarde = hrsUntil(ci.date) < 24;                       // avisó con menos de 24 h
      var quinta = stats.is5 && stats.cancTotal === 0;           // es la 5ta clase del mes
      var noR = tarde || quinta;
      await supa("cancelaciones", "POST", "", { alumno_id: al.id, fecha_iso: ci.date.toISOString(), mes_key: ci.mk, sin_recuperacion: noR, sin_aviso: false, is_extra: false });
      await supa("historial", "POST", "", { alumno_id: al.id, accion: (tarde ? "❌(-24h) " : quinta ? "❌(5ta) " : "❌ ") + fmtDate(ci.date) });
      await refreshData(); setBusy(false);
      if (tarde) { setCanRec(false); setCMsg("Avisaste con menos de 24 horas, así que esta clase no se recupera. La próxima, avisando antes, sí.") }
      else if (quinta) { setCanRec(false); setCMsg("Esta clase no se puede recuperar (5ta clase). Las 4 restantes sí.") }
      else { setCanRec(true); setCMsg("") }
    }
  }
  async function doResc(slot, gift) {
    setBusy(true);
    var mkOrigen = pm.reduce(function (found, mk) { return (!found && getMonthStats(al, mk).pendientes > 0) ? mk : found }, null) || slot.mk;
    await supa("clases_extra", "POST", "", { alumno_id: al.id, fecha_iso: slot.date.toISOString(), mes_key: mkOrigen, tipo: gift ? "regalo" : "recuperacion" });
    await supa("historial", "POST", "", { alumno_id: al.id, accion: (gift ? "🎁 " : "🔄 ") + fmtDate(slot.date) });
    if (gift) await supa("alumnos", "PATCH", "?id=eq." + al.id, { clase_regalo: Math.max(0, (al.reg || 0) - 1) });
    await refreshData(); setBusy(false);
  }
  async function doPayNotif() { setBusy(true); await supa("admin_notifs", "POST", "", { tipo: "pago", nombre: al.nombre, sede: al.sede, turno: al.turno.dia + " " + al.turno.hora }); setBusy(false) }
  function reset() { setStep("menu"); setSel(null); setCMsg(""); setCanRec(true); setCalDate(null) }

  var up = getUp();
  var bS = function (dis) { return { padding: "12px 18px", borderRadius: 10, cursor: dis ? "default" : "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: dis ? cream : white, color: dis ? grayWarm : navy, border: "1px solid " + grayBlue, textAlign: "left" } };
  var bD = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", textAlign: "left" };
  var bG = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: "#fdf6ec", color: copper, border: "1px solid #e8d4b0", textAlign: "left" };
  var pendBadge = totalPendientes > 0 ? <div style={{ background: "#fdf6ec", borderRadius: 10, padding: "10px 14px", border: "1px solid #e8d4b0", marginBottom: 4 }}><span style={{ fontSize: 14, color: copper, fontFamily: ft, fontWeight: 600 }}>{"🔄 " + totalPendientes + " pendiente(s)"}</span></div> : null;

  if (!paidCurrent) {
    var upUnpaid = [];
    var curClasses = allClassesForAlumno(al, now.getMonth(), now.getFullYear());
    var curCanc = (al.canc || []).filter(function (c) { return c.mk === curMk });
    curClasses.forEach(function (d) { if (hrsUntil(d) > 0 && !curCanc.some(function (c) { return matchDay(c.iso, d) })) upUnpaid.push({ date: d, mk: curMk, tot: curClasses.length }) });
    return (
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", height: "100%" }}>
        <div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 15, fontFamily: ft }}>{"Cuota de " + MN[now.getMonth()] + " pendiente"}</p>
          {cuotaInfo ? (<div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "12px 14px" }}>{al.descuento ? <div style={{ textAlign: "center", marginBottom: 8 }}><span style={{ background: "#d97706", color: white, fontSize: 11, fontWeight: 700, fontFamily: ft, padding: "3px 9px", borderRadius: 20 }}>{al.descuento + "% OFF 💛"}</span></div> : null}<div style={{ display: "flex", justifyContent: "space-between" }}><PrecioConDesc precio={cuotaInfo.efectivo} descuento={al.descuento} label="Efectivo" /><PrecioConDesc precio={cuotaInfo.transferencia} descuento={al.descuento} label="Transferencia" /></div>{cuotaInfo.diasRestantes ? (<div style={{ marginTop: 10, background: "#fde68a", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e", fontFamily: ft }}>{"Te quedan " + cuotaInfo.diasRestantes + " día" + (cuotaInfo.diasRestantes > 1 ? "s" : "")}</p></div>) : null}<p style={{ margin: "10px 0 0", fontSize: 12, color: "#991b1b", fontFamily: ft }}>Podés cancelar clases, pero no recuperar hasta pagar.</p></div>) : <p style={{ margin: "6px 0 0", color: "#991b1b", fontSize: 13, fontFamily: ft }}>Podés cancelar, pero no recuperar hasta pagar.</p>}
        </div>
        {step === "menu" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={function () { doPayNotif(); setStep("ps") }} disabled={busy} style={{ padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: copper, color: white, border: "none", textAlign: "left" }}>{busy ? "Enviando..." : "Ya hice el pago"}</button>
          {upUnpaid.length > 0 ? <button onClick={function () { setStep("cp_unpaid") }} style={bS(false)}>{"❌ Cancelar una clase"}</button> : null}
          <button disabled style={bS(true)}>{"🔄 Recuperar (pago pendiente)"}</button></div>) : null}
        {step === "ps" ? (<div style={{ background: "#f0f5e8", borderRadius: 10, padding: 16 }}><p style={{ margin: 0, color: "#5a6a2a", fontSize: 14, fontFamily: ft }}>¡Gracias! Le avisamos al equipo.</p><button onClick={function () { setStep("menu") }} style={Object.assign({}, bS(false), { marginTop: 12 })}>← Volver</button></div>) : null}
        {step === "cp_unpaid" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Qué clase cancelar?</p>{upUnpaid.map(function (cl, i) { var h = hrsUntil(cl.date); var blocked = false; var sinRecup = h < 24; return <button key={i} onClick={function () { setSel(cl); setStep("cc_unpaid") }} style={bS(false)}>{fmtDate(cl.date) + (sinRecup ? " · no se recupera" : "")}</button> })}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
        {step === "cc_unpaid" && sel ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Confirmás cancelar?</p>{hrsUntil(sel.date) < 24 ? <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px" }}><p style={{ margin: 0, color: "#991b1b", fontWeight: 700, fontSize: 14, fontFamily: ft }}>Faltan menos de 24 horas</p><p style={{ margin: "4px 0 0", color: "#991b1b", fontSize: 13.5, fontFamily: ft, lineHeight: 1.45 }}>Podés cancelarla igual, pero <b>esta clase no se va a poder recuperar</b>. Si podés avisar con más de 24 horas, sí se recupera.</p></div> : null}<div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}</div><button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd_unpaid") }) }} style={bD}>{busy ? "..." : "Sí, cancelar"}</button><button onClick={function () { setStep("cp_unpaid") }} style={bS(false)}>No, volver</button></div>) : null}
        {step === "cd_unpaid" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}><p style={{ fontSize: 36, margin: 0 }}>✓</p><p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>Clase cancelada</p><p style={{ margin: "4px 0 0", color: grayWarm, fontSize: 13, fontFamily: ft }}>Cuando pagues, podrás recuperarla.</p></div><button onClick={reset} style={bS(false)}>Volver</button></div>) : null}
      </div>);
  }

  var availDates = getAvailableDates();
  var slotsForDate = getSlotsForDate(calDate);

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", height: "100%" }}>
      {step === "menu" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, color: navy, fontWeight: 700, fontSize: 17, fontFamily: ft }}>{"Hola " + al.nombre.split(" ")[0] + " ✦"}</p>
        <p style={{ margin: "0 0 4px", color: grayWarm, fontSize: 14, fontFamily: ft }}>¿Qué necesitás?</p>
        {pendBadge}
        <button onClick={function () { setStep("cp") }} style={bS(false)}>{"❌ Cancelar una clase"}</button>
        {totalPendientes > 0 ? <button onClick={function () { setStep("rp"); setCalDate(null) }} style={bS(false)}>{"🔄 Recuperar (" + totalPendientes + " pend.)"}</button> : <button disabled style={bS(true)}>{"🔄 Recuperar (0 pendientes)"}</button>}
        {al.reg > 0 ? <button onClick={function () { setStep("go"); setCalDate(null) }} style={bG}>{"🎁 Clase a favor (" + al.reg + ")"}</button> : null}
      </div>) : null}
      {step === "cp" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Qué clase cancelar?</p>{up.map(function (cl, i) { var h = hrsUntil(cl.date); var blocked = false; var sinRecup = h < 24; return <button key={i} onClick={function () { setSel(cl); setStep("cc") }} style={bS(false)}>{fmtDate(cl.date) + (cl.isExtra ? " (recup)" : "") + (sinRecup ? " · no se recupera" : "")}</button> })}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
      {step === "cc" && sel ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Confirmás cancelar?</p>{hrsUntil(sel.date) < 24 ? <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px" }}><p style={{ margin: 0, color: "#991b1b", fontWeight: 700, fontSize: 14, fontFamily: ft }}>Faltan menos de 24 horas</p><p style={{ margin: "4px 0 0", color: "#991b1b", fontSize: 13.5, fontFamily: ft, lineHeight: 1.45 }}>Podés cancelarla igual, pero <b>esta clase no se va a poder recuperar</b>. Si podés avisar con más de 24 horas, sí se recupera.</p></div> : null}<div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}</div><button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd") }) }} style={bD}>{busy ? "..." : "Sí, cancelar"}</button><button onClick={function () { setStep("cp") }} style={bS(false)}>No, volver</button></div>) : null}
      {step === "cd" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{canRec ? (<div><div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}><p style={{ fontSize: 36, margin: 0 }}>✓</p><p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>Clase cancelada</p></div><div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}><button onClick={function () { setStep("rp"); setCalDate(null) }} style={bS(false)}>🔄 Recuperar ahora</button><button onClick={reset} style={bS(false)}>No, dejarlo así</button></div></div>) : (<div><div style={{ background: "#fdf6ec", borderRadius: 12, padding: 20, border: "1px solid #e8d4b0" }}><p style={{ margin: "10px 0 0", color: navy, fontSize: 14, fontFamily: ft, lineHeight: 1.6 }}>{cMsg}</p></div><button onClick={reset} style={Object.assign({}, bS(false), { marginTop: 10 })}>Entendido</button></div>)}</div>) : null}
      {step === "rp" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>Elegí un día para recuperar:</p><MiniCalendar onSelect={setCalDate} selectedDate={calDate} availableDates={availDates} />{calDate ? (slotsForDate.length > 0 ? slotsForDate.map(function (s, i) { return <button key={i} disabled={busy} onClick={function () { doResc(s).then(function () { setStep("rd") }) }} style={bS(false)}>{s.hora + " (" + s.cupoLibre + " lugar" + (s.cupoLibre > 1 ? "es" : "") + ")"}</button> }) : <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0" }}>No hay horarios este día</div>) : null}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
      {step === "rd" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}><p style={{ fontSize: 36, margin: 0 }}>✓</p><p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>¡Clase recuperada!</p></div><button onClick={reset} style={bS(false)}>Volver al menú</button></div>) : null}
      {step === "go" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>🎁 Elegí un día para tu clase a favor:</p><MiniCalendar onSelect={setCalDate} selectedDate={calDate} availableDates={availDates} />{calDate ? (slotsForDate.length > 0 ? slotsForDate.map(function (s, i) { return <button key={i} disabled={busy} onClick={function () { doResc(s, true).then(function () { setStep("gd") }) }} style={bG}>{s.hora + " (" + s.cupoLibre + " lugar" + (s.cupoLibre > 1 ? "es" : "") + ")"}</button> }) : <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0" }}>No hay horarios este día</div>) : null}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
      {step === "gd" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ background: "#fdf6ec", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #e8d4b0" }}><p style={{ fontSize: 36, margin: 0 }}>🎁</p><p style={{ margin: "8px 0 0", color: copper, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>¡Clase a favor confirmada!</p></div><button onClick={reset} style={bS(false)}>Volver al menú</button></div>) : null}
    </div>);
}

function MiniCalendar(props) {
  var onSelect = props.onSelect, selectedDate = props.selectedDate, availableDates = props.availableDates;
  var _month = useState(function () { var n = new Date(); return { m: n.getMonth(), y: n.getFullYear() } }), cm = _month[0], setCm = _month[1];
  var first = new Date(cm.y, cm.m, 1); var startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  var daysInMonth = new Date(cm.y, cm.m + 1, 0).getDate();
  var cells = []; for (var i = 0; i < startDay; i++) cells.push(null); for (var d = 1; d <= daysInMonth; d++) cells.push(d);
  var dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  var availSet = {}; (availableDates || []).forEach(function (dt) { availSet[dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate()] = true });
  function isSel(d) { if (!selectedDate || !d) return false; return selectedDate.getDate() === d && selectedDate.getMonth() === cm.m && selectedDate.getFullYear() === cm.y }
  function hasSlots(d) { if (!d) return false; return availSet[cm.y + "-" + cm.m + "-" + d] }
  return (
    <div style={{ background: white, borderRadius: 12, border: "1px solid " + grayBlue, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={function () { setCm(function (p) { return p.m === 0 ? { m: 11, y: p.y - 1 } : { m: p.m - 1, y: p.y } }) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>‹</button>
        <span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{MN[cm.m] + " " + cm.y}</span>
        <button onClick={function () { setCm(function (p) { return p.m === 11 ? { m: 0, y: p.y + 1 } : { m: p.m + 1, y: p.y } }) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>›</button></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
        {dayLabels.map(function (l) { return <div key={l} style={{ fontSize: 11, color: grayWarm, fontFamily: ft, fontWeight: 600, padding: 4 }}>{l}</div> })}
        {cells.map(function (d, i) { var sel = isSel(d); var avail = hasSlots(d); var today = new Date(); var isToday = d && today.getDate() === d && today.getMonth() === cm.m; return (<div key={i} onClick={function () { if (d) onSelect(new Date(cm.y, cm.m, d)) }} style={{ padding: "8px 2px", borderRadius: 8, cursor: d ? "pointer" : "default", background: sel ? copper : avail ? "#f0f5e8" : "transparent", color: sel ? white : avail ? "#5a6a2a" : d ? navy : "transparent", fontWeight: sel || isToday ? 700 : 400, fontSize: 13, fontFamily: ft, border: isToday && !sel ? "1px solid " + copper : "1px solid transparent" }}>{d || ""}</div>) })}
      </div></div>);
}

// ====== MAIN ======
var VAPID_PUBLIC = "BG0lGJXc7dfJK-KnmcSBQcsVleGBfbZwv4weG63gGSkxOOlcb3hqVH0BypoDExFVjZ0Ud33x6ttwOmw_Qc6MQZM";

function urlB64ToUint8(base64) {
  var padding = "=".repeat((4 - base64.length % 4) % 4);
  var b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  var raw = window.atob(b64); var arr = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Filtra mensajes que le corresponden a una alumna (general, por día, hora, sede, deuda o dirigido)
function mensajesParaAlumna(mensajes, al) {
  if (!al) return [];
  return (mensajes || []).filter(function (m) {
    if (m.alumno_id === al.id) return true;
    if (m.alumno_id) return false; // dirigido a otra
    // segmentados
    if (m.filtro_deuda) { /* deuda calc externa, se maneja aparte */ }
    if (m.filtro_dia && m.filtro_dia !== al.turno.dia) return false;
    if (m.filtro_hora && m.filtro_hora !== al.turno.hora) return false;
    if (m.filtro_sede && m.filtro_sede !== al.sede) return false;
    return true; // general o cumple todos los filtros presentes
  });
}

function TabMensajes(props) {
  var mensajes = props.mensajes, al = props.al;
  var lista = mensajesParaAlumna(mensajes, al).slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at) });
  if (!lista.length) return (
    <div style={{ padding: 36, textAlign: "center" }}>
      <p style={{ fontSize: 40, opacity: 0.35, margin: 0 }}>✉️</p>
      <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft, margin: "10px 0 0" }}>No tenés mensajes por ahora.</p>
    </div>
  );
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      {lista.map(function (m) {
        var etiqueta = m.alumno_id ? "Para vos" : (m.filtro_dia || m.filtro_hora || m.filtro_sede ? "Aviso de tu grupo" : "Aviso del taller");
        var fecha = new Date(m.created_at);
        return (
          <div key={m.id} style={{ padding: "14px 16px", background: white, borderRadius: 12, border: "1px solid " + gold }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: copper, fontFamily: ft, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600 }}>{etiqueta}</span>
              <span style={{ fontSize: 10, color: grayWarm, fontFamily: ft }}>{String(fecha.getDate()).padStart(2, "0") + "/" + String(fecha.getMonth() + 1).padStart(2, "0")}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: navy, fontFamily: ft, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.texto}</p>
          </div>
        );
      })}
    </div>
  );
}

function TabNotificaciones(props) {
  var al = props.al;
  var _prefs = useState(null), prefs = _prefs[0], setPrefs = _prefs[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _saving = useState(false), saving = _saving[0], setSaving = _saving[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];

  useEffect(function () {
    var cancelled = false;
    (async function () {
      setLoading(true);
      var rows = await supa("push_subs", "GET", "?alumno_id=eq." + al.id);
      if (cancelled) return;
      if (rows && rows.length) setPrefs(rows[0]);
      else setPrefs({ alumno_id: al.id, subscription: null, notif_generales: false, notif_promos: false, notif_48h: false, notif_2h: false });
      setLoading(false);
    })();
    return function () { cancelled = true };
  }, [al.id]);

  async function ensureSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Tu navegador no soporta notificaciones. En iPhone, agregá la app a la pantalla de inicio primero.");
    }
    var perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Necesitás permitir las notificaciones en tu navegador.");
    var reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC) });
    }
    return JSON.parse(JSON.stringify(sub));
  }

  async function toggle(campo) {
    setErr(""); setSaving(true);
    try {
      var nuevoValor = !prefs[campo];
      var subJson = prefs.subscription;
      // Si prende cualquier notificación y no hay subscription, pedirla
      if (nuevoValor && !subJson) { subJson = await ensureSubscription(); }
      var payload = Object.assign({}, prefs, { subscription: subJson }); payload[campo] = nuevoValor;
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      // upsert
      var existing = await supa("push_subs", "GET", "?alumno_id=eq." + al.id);
      if (existing && existing.length) {
        await supa("push_subs", "PATCH", "?alumno_id=eq." + al.id, { subscription: subJson, notif_generales: payload.notif_generales, notif_promos: payload.notif_promos, notif_48h: payload.notif_48h, notif_2h: payload.notif_2h, updated_at: new Date().toISOString() });
      } else {
        await supa("push_subs", "POST", "", payload);
      }
      setPrefs(Object.assign({}, prefs, { subscription: subJson, [campo]: nuevoValor }));
    } catch (e) { setErr(e.message || "No se pudo activar."); }
    setSaving(false);
  }

  if (loading || !prefs) return <div style={{ padding: 36, textAlign: "center", color: grayWarm, fontFamily: ft, fontSize: 14 }}>Cargando…</div>;

  var rows = [
    { campo: "notif_generales", titulo: "Avisos importantes", desc: "Si se suspende tu clase o cambia algo del taller. Te recomendamos dejarlo prendido.", destacado: true },
    { campo: "notif_promos", titulo: "Promos y novedades", desc: "Descuentos, talleres especiales y novedades. Podés apagarlo sin perderte los avisos importantes." },
    { campo: "notif_48h", titulo: "Aviso 48 h antes de tu clase", desc: "Para que tengas tiempo de cancelar si no podés ir. Si no hacés nada, tu clase queda confirmada." },
    { campo: "notif_2h", titulo: "Aviso 2 h antes", desc: "Un recordatorio corto para que no se te pase." }
  ];

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fdf6ec", borderRadius: 10, padding: "12px 14px", border: "1px solid #e8d4b0" }}>
        <p style={{ margin: 0, fontSize: 12, color: navy, fontFamily: ft, lineHeight: 1.5 }}>Elegí qué querés recibir. Solo te llega lo que actives — y podés cambiarlo cuando quieras.</p>
      </div>
      {rows.map(function (r) {
        var on = !!prefs[r.campo];
        var borde = r.destacado ? copper : grayBlue;
        return (
          <div key={r.campo} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: white, borderRadius: 12, border: (r.destacado ? "2px solid " + borde : "1px solid " + (on ? gold : grayBlue)) }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, color: navy, fontFamily: ft, fontSize: 14 }}>{r.titulo}</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: grayWarm, fontFamily: ft, lineHeight: 1.4 }}>{r.desc}</p>
            </div>
            <button onClick={function () { if (!saving) toggle(r.campo) }} disabled={saving}
              style={{ width: 48, height: 28, borderRadius: 14, border: "none", cursor: saving ? "default" : "pointer", background: on ? olive : grayBlue, position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: white, transition: "left .2s" }} />
            </button>
          </div>
        );
      })}
      {err ? <p style={{ color: "#991b1b", fontSize: 13, fontFamily: ft, margin: "4px 0 0", lineHeight: 1.5 }}>{err}</p> : null}
      <p style={{ fontSize: 11, color: grayWarm, fontFamily: ft, textAlign: "center", lineHeight: 1.6, margin: "6px 0 0" }}>
        En iPhone, agregá la app a tu pantalla de inicio para recibir notificaciones.
      </p>
    </div>
  );
}

function vistosKey(al) { return "ep_avisos_vistos_" + (al && al.id ? al.id : "x") }
function leerVistos(al) { try { return JSON.parse(window.localStorage.getItem(vistosKey(al)) || "{}") } catch (e) { return {} } }
function guardarVisto(al, id) { try { var v = leerVistos(al); v[id] = 1; window.localStorage.setItem(vistosKey(al), JSON.stringify(v)) } catch (e) {} }

function MensajesBanner(props) {
  var mensajes = props.mensajes, al = props.al;
  var _dismissed = useState(function () { return leerVistos(al) }), dismissed = _dismissed[0], setDismissed = _dismissed[1];
  useEffect(function () { setDismissed(leerVistos(al)) }, [al && al.id]);
  var relevantes = mensajesParaAlumna(mensajes, al).filter(function (m) { return !dismissed[m.id] });
  if (!relevantes.length) return null;
  async function marcarLeido(m) {
    guardarVisto(al, m.id);
    setDismissed(function (p) { var o = Object.assign({}, p); o[m.id] = true; return o });
    if (!m.es_general) { await supa("mensajes", "PATCH", "?id=eq." + m.id, { leido: true }) }
  }
  return (
    <div style={{ padding: "10px 14px", background: "#fdf6ec", borderBottom: "1px solid #e8d4b0" }}>
      {relevantes.map(function (m) {
        return (
          <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: white, borderRadius: 10, border: "1px solid " + gold, marginBottom: 6 }}>
            <span style={{ fontSize: 18, lineHeight: 1.2 }}>💛</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 10, color: copper, fontFamily: ft, letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600 }}>{m.alumno_id ? "Mensaje para vos" : "Aviso del taller"}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: navy, fontFamily: ft, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.texto}</p>
            </div>
            <button onClick={function () { marcarLeido(m) }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: grayWarm, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
function AppArgentina() {
  var hash = useHash();
  var _als = useState([]), als = _als[0], setAls = _als[1];
  var _profes = useState([]), profes = _profes[0], setProfes = _profes[1];
  var _listas = useState([]), listas = _listas[0], setListas = _listas[1];
  var _cuotas = useState([]), cuotas = _cuotas[0], setCuotas = _cuotas[1];
  var _horariosExtra = useState([]), horariosExtra = _horariosExtra[0], setHorariosExtra = _horariosExtra[1];
  var _mensajes = useState([]), mensajes = _mensajes[0], setMensajes = _mensajes[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _adminAuth = useState(false), adminAuth = _adminAuth[0], setAdminAuth = _adminAuth[1];
  var _adminView = useState("chat"), adminView = _adminView[0], setAdminView = _adminView[1];
  var _logged = useState(null), logged = _logged[0], setLogged = _logged[1];
  var _loggedProfe = useState(null), loggedProfe = _loggedProfe[0], setLoggedProfe = _loggedProfe[1];
  var _tab = useState("cal"), tab = _tab[0], setTab = _tab[1];

  // Persistencia de sesión de alumna: guardar/restaurar el id
  function saveSession(al) { try { if (al && al.id) window.localStorage.setItem("ep_alumna_id", String(al.id)); else window.localStorage.removeItem("ep_alumna_id"); } catch (e) {} }
  useEffect(function () {
    if (route === "alumna" && !logged && als && als.length) {
      try {
        var savedId = window.localStorage.getItem("ep_alumna_id");
        if (savedId) { var a = als.find(function (x) { return String(x.id) === savedId }); if (a) { setLogged(a); setTab("cal") } }
      } catch (e) {}
    }
  }, [route, als]);

  var loadData = useCallback(async function () {
    try {
      var [alRows, profeRows, pagos, cancs, extras, listasRows, cuotasRows, horariosExtraRows, mensajesRows] = await Promise.all([
        supa("alumnos", "GET", "?estado=eq.activo&order=nombre&select=id,nombre,tel,email,sede,turno_dia,turno_hora,clase_regalo,estado,pend_arrastre,created_at,frecuencia,turno2_dia,turno2_hora,excepcion,descuento"), supa("profesoras", "GET", "?order=nombre&select=id,nombre,sedes,horarios,encargada,created_at,puede_stock,toma_lista,puede_produccion,ve_resultados"), supa("meses_pagados", "GET"), supa("cancelaciones", "GET"), supa("clases_extra", "GET"), supa("listas", "GET"), supa("cuotas", "GET"), supa("horarios_extra", "GET"), supa("mensajes", "GET", "?order=created_at.desc")
      ]);
      setAls((alRows || []).map(function (r) { return buildAlumnoFromRow(r, pagos || [], cancs || [], extras || []) }));
      setProfes((profeRows || []).map(buildProfeFromRow));
      setListas(listasRows || []); setCuotas(cuotasRows || []); setHorariosExtra(horariosExtraRows || []); setMensajes(mensajesRows || []);
    } catch (e) { console.error("Load error:", e) }
    setLoading(false);
  }, []);

  useEffect(function () { loadData() }, [loadData]);
  async function refreshData() { await loadData() }

  var cur = logged ? als.find(function (a) { return a.id === logged.id }) : null;
  var curProfe = loggedProfe ? profes.find(function (p) { return p.id === loggedProfe.id }) : null;
  useEffect(function () { if (logged && cur) setLogged(function (prev) { return prev && prev.id === cur.id ? cur : prev }) }, [als]);

  var route = "alumna";
  if (hash.includes("/admin")) route = "admin";
  else if (hash.includes("/profesora")) route = "profesora";

  var adminBtnStyle = function (active) { return { padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: active ? gold : "rgba(255,255,255,0.1)", color: active ? navy : grayBlue } };

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: ft, background: cream }}>
      <div style={{ background: navy, color: cream, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 19, letterSpacing: "0.5px", fontFamily: "'Instrument Serif',serif" }}>EVES POTTERY</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {route === "admin" && adminAuth ? (<>
            {(adminView === "alumna" && logged) || (adminView === "profe" && loggedProfe) ? <button onClick={function () { setLogged(null); setLoggedProfe(null); setAdminView("chat") }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue, marginRight: 4 }}>← Admin</button> : null}
            <button onClick={function () { setAdminView("chat"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "chat")}>Admin</button>
            <button onClick={function () { setAdminView("sede"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "sede")}>Palermo</button>
            <button onClick={function () { setAdminView("alumna"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "alumna")}>Alumna</button>
            <button onClick={function () { setAdminView("profe"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "profe")}>Profe</button>
            <button onClick={function () { setAdminView("stock"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "stock")}>Stock</button>
            <button onClick={function () { setAdminView("produccion"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "produccion")}>Producción</button>
            <button onClick={function () { setAdminAuth(false); setAdminView("chat"); setLogged(null); setLoggedProfe(null) }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: "#fca5a5", marginLeft: 4 }}>Salir</button>
          </>) : route === "alumna" && logged ? (<button onClick={function () { setLogged(null); saveSession(null); setTab("cal") }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue }}>Salir</button>
          ) : route === "profesora" && loggedProfe ? (<button onClick={function () { setLoggedProfe(null) }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue }}>Salir</button>) : null}
        </div></div>

      {route === "admin" ? (
        !adminAuth ? <AdminLogin onLogin={function () { setAdminAuth(true) }} /> :
          adminView === "chat" ? <div style={{ flex: 1, overflow: "hidden" }}><AdminChat als={als} refreshData={refreshData} profes={profes} listas={listas} cuotas={cuotas} horariosExtra={horariosExtra} /></div>
          : adminView === "alumna" ? (
            !logged ? <GenericLogin table="alumnos" onLogin={function (row) { var a = als.find(function (x) { return x.id === row.id }); setLogged(a || row); setTab("cal") }} subtitle="Seleccioná alumna" skipPw={true} refreshData={refreshData} />
            : (<div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}><p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{cur ? cur.nombre : ""}</p><p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{cur ? cur.sede + " · " + cur.turno.dia + " " + cur.turno.hora : ""}</p></div>
                <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
                  <button onClick={function () { setTab("cal") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "cal" ? white : cream, color: tab === "cal" ? navy : grayWarm, borderBottom: tab === "cal" ? "2px solid " + copper : "2px solid transparent" }}>Mis clases</button>
                  <button onClick={function () { setTab("gest") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "gest" ? white : cream, color: tab === "gest" ? navy : grayWarm, borderBottom: tab === "gest" ? "2px solid " + copper : "2px solid transparent" }}>Gestionar</button></div>
                <div style={{ flex: 1, overflow: "auto", background: white }}>
                  {tab === "cal" && cur ? <AlumnoCal al={cur} cuotas={cuotas} /> : null}
                  {tab === "gest" && cur ? <AlumnoFlow al={cur} allAls={als} refreshData={refreshData} cuotas={cuotas} horariosExtra={horariosExtra} /> : null}
                </div></div>)
          ) : adminView === "sede" ? (
            <div style={{ flex: 1, overflow: "auto", background: white }}><EncargadaVista profe={{ nombre: "Admin", sede: "Palermo", sedeEncargada: "Palermo", esEncargada: true }} als={als} refreshData={refreshData} /></div>
          ) : adminView === "produccion" ? (
            <div style={{ flex: 1, overflow: "auto", background: white }}><ProduccionPanel quien="" veResultados={true} esAdmin={true} /></div>
          ) : adminView === "stock" ? (
            <div style={{ flex: 1, overflow: "auto", background: white }}><StockPanel quien="" esAdmin={true} /></div>
          ) : adminView === "profe" ? (
            !loggedProfe ? <GenericLogin table="profesoras" onLogin={function (row) { var p = profes.find(function (x) { return x.id === row.id }); setLoggedProfe(p || row) }} subtitle="Seleccioná profesora" skipPw={true} refreshData={refreshData} />
            : curProfe ? <ProfeView profe={curProfe} als={als} refreshData={refreshData} listas={listas} /> : null
          ) : null
      ) : route === "profesora" ? (
        !loggedProfe ? <GenericLogin table="profesoras" onLogin={function (row) { var p = profes.find(function (x) { return x.id === row.id }); if (p) setLoggedProfe(p); else refreshData().then(function () { setLoggedProfe(row) }) }} subtitle="Acceso profesoras" refreshData={refreshData} />
        : curProfe ? <ProfeView profe={curProfe} als={als} refreshData={refreshData} listas={listas} /> : null
      ) : (
        !logged ? <GenericLogin table="alumnos" onLogin={function (row) { var a = als.find(function (x) { return x.id === row.id }); if (a) { setLogged(a); saveSession(a); setTab("cal") } else refreshData().then(function () { setLogged(row); saveSession(row); setTab("cal") }) }} subtitle="Accedé a tus clases" refreshData={refreshData} />
        : (<div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}><p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{cur ? cur.nombre : ""}</p><p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{cur ? cur.sede + " · " + cur.turno.dia + " " + cur.turno.hora : ""}</p></div>
            <MensajesBanner mensajes={mensajes} al={cur} />
            <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue, overflowX: "auto" }}>
              <button onClick={function () { setTab("cal") }} style={{ flex: "1 0 auto", padding: "11px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: tab === "cal" ? white : cream, color: tab === "cal" ? navy : grayWarm, borderBottom: tab === "cal" ? "2px solid " + copper : "2px solid transparent", whiteSpace: "nowrap" }}>Mis clases</button>
              <button onClick={function () { setTab("gest") }} style={{ flex: "1 0 auto", padding: "11px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: tab === "gest" ? white : cream, color: tab === "gest" ? navy : grayWarm, borderBottom: tab === "gest" ? "2px solid " + copper : "2px solid transparent", whiteSpace: "nowrap" }}>Gestionar</button>
              <button onClick={function () { setTab("msg") }} style={{ flex: "1 0 auto", padding: "11px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: tab === "msg" ? white : cream, color: tab === "msg" ? navy : grayWarm, borderBottom: tab === "msg" ? "2px solid " + copper : "2px solid transparent", whiteSpace: "nowrap" }}>Mensajes</button>
              <button onClick={function () { setTab("notif") }} style={{ flex: "1 0 auto", padding: "11px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: ft, background: tab === "notif" ? white : cream, color: tab === "notif" ? navy : grayWarm, borderBottom: tab === "notif" ? "2px solid " + copper : "2px solid transparent", whiteSpace: "nowrap" }}>🔔</button></div>
            <div style={{ flex: 1, overflow: "auto", background: white }}>
              {tab === "cal" && cur ? <AlumnoCal al={cur} cuotas={cuotas} /> : null}
              {tab === "gest" && cur ? <AlumnoFlow al={cur} allAls={als} refreshData={refreshData} cuotas={cuotas} horariosExtra={horariosExtra} /> : null}
              {tab === "msg" && cur ? <TabMensajes mensajes={mensajes} al={cur} /> : null}
              {tab === "notif" && cur ? <TabNotificaciones al={cur} /> : null}
            </div></div>)
      )}
    </div>);
}


export default function App() {
  // Una sola app: Argentina. #/admin, #/profesora y el resto entran directo.
  return <AppArgentina />;
}
