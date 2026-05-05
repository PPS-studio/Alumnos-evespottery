import { useState, useEffect, useRef, useCallback } from "react";

// ====== SUPABASE CONFIG ======
var SUPA_URL = "https://rwlfbbmbustxpuvbakbo.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3bGZiYm1idXN0eHB1dmJha2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTIwNDUsImV4cCI6MjA4NzY2ODA0NX0.9T_ia_s0XkVNz9P_nEtOsNzxWVVh-docYpOqLc8lgBU";
var SUPA_REST = SUPA_URL + "/rest/v1";
var HEADERS = { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

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
var ADMIN_PW = "Clases2026";
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
  var k = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
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
function classesInMonth(day, time, month, year) {
  var tgt = DAYS.indexOf(day); var res = []; var d = new Date(year, month, 1);
  while (d.getMonth() === month) { var dow = d.getDay(); var idx = dow === 0 ? 6 : dow - 1; if (idx === tgt) { var cl = new Date(d); var pp = time.split(":"); cl.setHours(parseInt(pp[0]), parseInt(pp[1]), 0, 0); res.push(cl) } d.setDate(d.getDate() + 1) } return res
}
function hrsUntil(d) { return (d.getTime() - Date.now()) / 3600000 }
function fmtDate(d) { var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; var mn = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]; return dn[d.getDay()] + " " + d.getDate() + " " + mn[d.getMonth()] + " · " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") }
function fmtDateShort(d) { var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; return dn[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") }
function genPw(prefix) { return prefix + String(Math.floor(1000 + Math.random() * 9000)) }
function fmtMoney(n) { return "$" + Number(n).toLocaleString("es-AR") }
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
  return { id: row.id, nombre: row.nombre, tel: row.tel || "", email: row.email || "", sede: row.sede, turno: { dia: row.turno_dia, hora: row.turno_hora }, turno2: turno2, mp: mp, hist: [], ex: ex, canc: canc, reg: row.clase_regalo || 0, pw: row.password, estado: row.estado || "activo", pendArrastre: row.pend_arrastre || 0, frecuencia: row.frecuencia || "1x" }
}
function buildProfeFromRow(row) {
  var sedes = row.sedes || [];
  var sede = sedes.length > 0 ? sedes[0] : "Palermo";
  return { id: row.id, nombre: row.nombre, sede: sede, sedes: sedes, horarios: row.horarios || [], pw: row.password, esEncargada: row.encargada || false, sedeEncargada: row.encargada ? sede : null }
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
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) fijos++ }
    (a.ex || []).forEach(function (e) { if (e.date === dateStr) recups++ })
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
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) result.push({ alumno: a, tipo: "fijo" }) }
    (a.ex || []).forEach(function (e) { if (e.date === dateStr && !result.find(function (r) { return r.alumno.id === a.id })) result.push({ alumno: a, tipo: "recuperacion" }) })
  });
  return result;
}
function countFijosForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var count = 0;
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    var matchT1 = a.turno.dia === dia && a.turno.hora === hora;
    var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora;
    if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) count++ }
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
  return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: cream, flexDirection: "column", gap: 12 }}>
    <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy }}>EVES POTTERY</p>
    <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft }}>Cargando datos...</p>
    <div style={{ width: 40, height: 40, border: "3px solid " + grayBlue, borderTop: "3px solid " + copper, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>);
}

function AdminLogin(props) {
  var _pw = useState(""), pw = _pw[0], setPw = _pw[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];
  function doLogin() { if (pw === ADMIN_PW) { props.onLogin(); setErr("") } else setErr("Contraseña incorrecta.") }
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
  var welcomeMsg = "¡Hola! Asistente Eves Pottery ✦\n\nComandos:\n• Alta alumno: Nombre / Sede / día hora\n• Baja: Nombre\n• Pago recibido: Nombre (mes año)\n• Pagos mes año: nombre1, nombre2...\n• Consulta: Nombre\n• Clase a favor: Nombre\n• Contraseña: Nombre\n• Resetear pw: Nombre\n• Resetear todas [P|SI]\n• Ver contraseñas [P|SI]\n• Alumnos [P|SI] hoy/martes/mañana\n• Ver alumnos [P|SI]\n• Pagos pendientes [P|SI]\n• Cancelar clase: Nombre / fecha\n• Cancelar clases: fecha\n• Agendar clase: Nombre / día hora fecha\n• Alta profe / Baja profe / Ver profes\n• Notificaciones\n• Ver cuotas\n• Cuota: Sede / 1x|2x / forma / v1 / v2 / v3\n• Frecuencia: Nombre / 2x\n• Abrir horario / Cerrar horario / Ver horarios";
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
      return "Profesoras:\n" + profes.map(function (p) { return "• " + p.nombre + " — " + p.sede + (p.esEncargada ? " (Enc)" : "") + " — " + p.horarios.map(function (h) { return h.replace("-", " ") }).join(", ") + " — pw: " + (p.pw || "sin pw") }).join("\n")
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
      var filtered = filterBySede(als, sedeFilter);
      if (!filtered.length) return "No hay alumnos" + sedeLabel;
      return "Contraseñas" + sedeLabel + ":\n" + filtered.map(function (a) { return "• " + a.nombre + " — " + a.sede + " — " + (a.pw || "sin pw") }).join("\n") + "\nTotal: " + filtered.length;
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
      return als[idx3].nombre + " — Contraseña: " + (als[idx3].pw || "sin pw");
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
      filterBySede(als, sedeFilter).forEach(function (a) { if (a.turno.dia !== dayN) return; if (!(a.mp || {})[mk2]) return; var dateObj = new Date(td); var pp = a.turno.hora.split(":"); dateObj.setHours(parseInt(pp[0]), parseInt(pp[1]), 0, 0); var cancelled = (a.canc || []).some(function (c) { return c.iso === dateObj.toISOString() }); if (!cancelled) list.push(a) });
      filterBySede(als, sedeFilter).forEach(function (a) { (a.ex || []).forEach(function (e) { var exD = new Date(e.date); if (exD.toDateString() === td.toDateString() && !list.find(function (x) { return x.id === a.id })) list.push(Object.assign({}, a, { isRec: true })) }) });
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
      r4 += "\n🔑 Contraseña: " + (a6.pw || "sin pw");
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
    return "No entendí. Probá: ver alumnos, alta, baja, pago recibido, pagos masivo, consulta, clase a favor, contraseña, resetear pw, ver contraseñas, alumnos de hoy, pagos pendientes, alta profe, ver profes, notificaciones, ver cuotas, cuota, frecuencia"
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
    var queryParams = "?order=nombre&limit=1000" + (table === "alumnos" ? "&estado=eq.activo" : "");
    var rows = await supa(table, "GET", queryParams);
    setBusy(false);
    if (!rows || rows.length === 0) { setErr("Error al conectar. Intentá de nuevo."); return }
    var found = rows.find(function (item) { return item.nombre.toLowerCase() === searchName }) || rows.find(function (item) { return item.nombre.toLowerCase().includes(searchName) });
    if (!found) { setErr("No encontramos ese nombre."); return }
    if (skipPw) { onLogin(found); return }
    if (!found.password) { setErr("Tu cuenta aún no tiene contraseña. Contactá al equipo."); return }
    if (found.password !== pw) { setErr("Contraseña incorrecta."); return }
    onLogin(found);
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

// ====== PROFESORA VIEW ======
function ProfeView(props) {
  var profe = props.profe, als = props.als, refreshData = props.refreshData, listas = props.listas;
  var isEncargada = profe.esEncargada;
  var defaultTab = isEncargada ? "lista" : "clases";
  var _tab = useState(defaultTab), tab = _tab[0], setTab = _tab[1];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}>
        <p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{profe.nombre}{isEncargada ? " (Encargada)" : ""}</p>
        <p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{profe.sede}</p></div>
      <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
        {!isEncargada ? <button onClick={function () { setTab("clases") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "clases" ? white : cream, color: tab === "clases" ? navy : grayWarm, borderBottom: tab === "clases" ? "2px solid " + copper : "2px solid transparent" }}>Mis clases</button> : null}
        <button onClick={function () { setTab("lista") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "lista" ? white : cream, color: tab === "lista" ? navy : grayWarm, borderBottom: tab === "lista" ? "2px solid " + copper : "2px solid transparent" }}>Lista</button>
        {isEncargada ? <button onClick={function () { setTab("sede") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "sede" ? white : cream, color: tab === "sede" ? navy : grayWarm, borderBottom: tab === "sede" ? "2px solid " + copper : "2px solid transparent" }}>Sede</button> : null}
        {isEncargada ? <button onClick={function () { setTab("finanzas") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "finanzas" ? white : cream, color: tab === "finanzas" ? navy : grayWarm, borderBottom: tab === "finanzas" ? "2px solid " + copper : "2px solid transparent" }}>Finanzas</button> : null}
      </div>
      <div style={{ flex: 1, overflow: "auto", background: white }}>
        {tab === "clases" && !isEncargada ? <ProfeClases profe={profe} als={als} /> : null}
        {tab === "lista" ? <ProfeLista profe={profe} als={als} refreshData={refreshData} listas={listas} /> : null}
        {tab === "sede" && isEncargada ? <EncargadaVista profe={profe} als={als} refreshData={refreshData} subTabOverride="cal" /> : null}
        {tab === "finanzas" && isEncargada ? <EncargadaVista profe={profe} als={als} refreshData={refreshData} subTabOverride="finanzas" /> : null}
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
      var dow = dd.getDay(); var dayIdx = dow === 0 ? 6 : dow - 1;
      if (DAYS[dayIdx] === dia) { var dt = new Date(dd); var tp = hora.split(":"); dt.setHours(parseInt(tp[0]), parseInt(tp[1]), 0, 0); if (dt > now) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); var fijos = countFijosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected.length, fijos: fijos, feriado: isFeriado(dt), produccion: false }) } }
    }
  });
  // Add production hours
  profeProduccion.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(now); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      var dow = dd.getDay(); var dayIdx = dow === 0 ? 6 : dow - 1;
      if (DAYS[dayIdx] === dia) { var dt = new Date(dd); var tp = hora.split(":"); dt.setHours(parseInt(tp[0]), parseInt(tp[1]), 0, 0); if (dt > now && !isFeriado(dt)) { clases.push({ date: dt, dia: dia, hora: hora, alumnos: 0, fijos: 0, feriado: false, produccion: true }) } }
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
      var dow = dd.getDay(); var dayIdx = dow === 0 ? 6 : dow - 1;
      if (DAYS[dayIdx] === dia) { var dt = new Date(dd); var tp = hora.split(":"); dt.setHours(parseInt(tp[0]), parseInt(tp[1]), 0, 0); var iso = dt.toISOString(); var yaTomada = listas.some(function (l) { return l.profe === profe.nombre && l.fecha_iso === iso }); if (!yaTomada && !isFeriado(dt)) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected, iso: iso, pendiente: dt < now }) } }
    }
  });
  clases.sort(function (a, b) { return a.date - b.date });

  function selectClass(c) { setSel(c); setMarks({}); setExtras([]); setDone(false); setMsg(""); setSearch(""); setNotes({}) }
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
      {sel.alumnos.map(function (a) { var id = a.alumno.id; var v = marks[id]; var isExp = expanded === id; var alNotas = getNotasFor(id); return (<div key={id} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: isExp ? "10px 10px 0 0" : 10, border: "1px solid " + grayBlue, background: v === true ? "#f0f5e8" : v === false ? "#fef2f2" : white }}>
          <span onClick={function () { setExpanded(isExp ? null : id) }} style={{ fontFamily: ft, fontSize: 14, color: navy, fontWeight: 500, cursor: "pointer", flex: 1 }}>{a.alumno.nombre}<span style={{ color: grayWarm, fontSize: 12 }}>{a.tipo === "recuperacion" ? " (recup)" : ""}</span>{alNotas.length > 0 || notes[id] ? <span style={{ color: copper, fontSize: 11, marginLeft: 4 }}>📝</span> : null}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={function () { toggleMark(id, true) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === true ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: v === true ? "#5a6a2a" : white, color: v === true ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✓</button>
            <button onClick={function () { toggleMark(id, false) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === false ? "2px solid #991b1b" : "1px solid " + grayBlue, background: v === false ? "#991b1b" : white, color: v === false ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✗</button>
          </div>
        </div>
        {isExp ? (
          <div style={{ border: "1px solid " + copper, borderTop: "none", borderRadius: "0 0 10px 10px", background: "#faf7f2", padding: "12px 14px" }}>
            {alNotas.length > 0 ? (<div style={{ marginBottom: 10 }}><p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: navy, fontFamily: ft }}>Notas anteriores:</p>{alNotas.slice(0, 3).map(function (n) { var d = new Date(n.created_at); return (<div key={n.id} style={{ padding: "6px 10px", marginBottom: 4, background: n.verificado ? "#f0f5e8" : white, borderRadius: 6, border: "1px solid " + (n.verificado ? "#b5c48a" : grayBlue), fontSize: 12, fontFamily: ft, color: navy }}>{n.nota + (n.monto ? " — " + fmtMoney(n.monto) : "") + " · " + n.profe_nombre + " " + d.getDate() + "/" + (d.getMonth() + 1)}{n.verificado ? <span style={{ color: "#5a6a2a", marginLeft: 6 }}>✓</span> : <span style={{ color: "#f59e0b", marginLeft: 6 }}>pendiente</span>}</div>) })}</div>) : null}
            <textarea value={notes[id] || ""} onChange={function (e) { setNote(id, e.target.value) }} placeholder="Ej: pagó $95.000 efectivo, todo ok, debe clase anterior..." rows={2} style={{ width: "100%", padding: "8px 10px", border: "1px solid " + grayBlue, borderRadius: 6, fontSize: 13, fontFamily: ft, outline: "none", background: white, boxSizing: "border-box", resize: "vertical" }} />
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
    als.forEach(function (a) { if (a.sede !== sede) return; var matchT1 = a.turno.dia === dia && a.turno.hora === hora; var matchT2 = a.turno2 && a.turno2.dia === dia && a.turno2.hora === hora; if (matchT1 || matchT2) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) result.push({ alumno: a, tipo: "fijo" }); else result.push({ alumno: a, tipo: "canceló" }) } (a.ex || []).forEach(function (e) { if (e.date === dateStr && !result.find(function (r) { return r.alumno.id === a.id })) result.push({ alumno: a, tipo: e.tipo || "recuperacion" }) }) });
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
    if (!payingAl || !payForma || !payMonto) return; setBusyId(payingAl.id);
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
    var cancelled = cm.some(function (c) { return c.iso === d.toISOString() });
    var cancelInfo = cm.find(function (c) { return c.iso === d.toISOString() });
    var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false;
    if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup });
    else all.push({ date: d, extra: false, feriado: feriado });
  });
  // Next month classes (from day 20)
  if (showNextMonth) {
    var nxtClasses = allClassesForAlumno(al, nxtDate.getMonth(), nxtDate.getFullYear());
    var nxtCanc = (al.canc || []).filter(function (c) { return c.mk === nxtMk });
    nxtClasses.forEach(function (d) {
      var cancelled = nxtCanc.some(function (c) { return c.iso === d.toISOString() });
      var cancelInfo = nxtCanc.find(function (c) { return c.iso === d.toISOString() });
      var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false;
      if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup, nextMonth: true });
      else all.push({ date: d, extra: false, feriado: feriado, nextMonth: true });
    });
  }
  // Other paid months
  var pm = Object.keys(al.mp || {});
  pm.forEach(function (mk) { if (mk === curMk || mk === nxtMk) return; var p = mk.split("-").map(Number); var mc = allClassesForAlumno(al, p[1], p[0]); var cmk = (al.canc || []).filter(function (c) { return c.mk === mk }); mc.forEach(function (d) { var cancelled = cmk.some(function (c) { return c.iso === d.toISOString() }); var cancelInfo = cmk.find(function (c) { return c.iso === d.toISOString() }); var feriado = isFeriado(d); var sinRecup = cancelInfo ? cancelInfo.noR : false; if (cancelled) all.push({ date: d, extra: false, feriado: feriado, cancelled: true, sinRecup: sinRecup }); else all.push({ date: d, extra: false, feriado: feriado }) }) });
  (al.ex || []).forEach(function (e) { all.push({ date: new Date(e.date), extra: true }) });
  all.sort(function (a, b) { return a.date - b.date });
  var statsBlocks = pm.map(function (mk) { var stats = getMonthStats(al, mk); var p = mk.split("-").map(Number); return { label: MN[p[1]] + " " + p[0], stats: stats, mk: mk } });
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Tus clases</h3>
      <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{al.turno.dia + " " + al.turno.hora + (al.turno2 ? " y " + al.turno2.dia + " " + al.turno2.hora : "") + " · " + al.sede}</p>
      {!paidCurrent && cuotaInfo ? (<div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5", marginBottom: 14 }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 15, fontFamily: ft }}>{"Cuota de " + MN[now.getMonth()] + " pendiente"}</p>
        <div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Efectivo</p><p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(cuotaInfo.efectivo)}</p></div>
            <div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Transferencia</p><p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(cuotaInfo.transferencia)}</p></div></div>
          {cuotaInfo.diasRestantes ? (<div style={{ marginTop: 10, background: "#fde68a", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e", fontFamily: ft }}>{"Te quedan " + cuotaInfo.diasRestantes + " día" + (cuotaInfo.diasRestantes > 1 ? "s" : "") + " para pagar este precio"}</p>{cuotaInfo.nextAumento ? <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e", fontFamily: ft }}>{"Después: ef. " + fmtMoney(cuotaInfo.nextAumento.efectivo) + " · transf. " + fmtMoney(cuotaInfo.nextAumento.transferencia)}</p> : null}</div>) : null}
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
              {canc && fer ? <span style={{ fontSize: 11, background: "#991b1b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>FERIADO</span> : canc ? <span style={{ fontSize: 11, background: "#991b1b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>CANCELADA</span> : fer ? <span style={{ fontSize: 11, background: "#f59e0b", color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>FERIADO</span> : c.nextMonth ? <span style={{ fontSize: 11, background: copper, color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>{MN[c.date.getMonth()]}</span> : c.extra ? <span style={{ fontSize: 11, background: olive, color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>recuperación</span> : null}</div>
            {canc ? <div style={{ fontSize: 12, color: "#991b1b", marginTop: 5, fontFamily: ft }}>{c.sinRecup ? "No se recupera" : "Podrás recuperarla"}</div> : null}
            {!past && !fer && !canc && h < 24 ? <div style={{ fontSize: 11, color: copper, marginTop: 5, fontFamily: ft }}>{"⚠ Menos de 24h"}</div> : null}
          </div>) })}</div></div>);
}

// ====== ALUMNO FLOW ======
function AlumnoFlow(props) {
  var al = props.al, allAls = props.allAls, refreshData = props.refreshData, cuotas = props.cuotas || [], horariosExtra = props.horariosExtra || [];
  var pm = Object.keys(al.mp || {}); var paid = pm.length > 0;
  var now = new Date(); var curMk = now.getFullYear() + "-" + now.getMonth();
  var paidCurrent = !!(al.mp || {})[curMk];
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
  var paidNext = !!(al.mp || {})[nxtMk];

  function getUp() {
    var cls = [];
    pm.forEach(function (mk) { var p = mk.split("-").map(Number); var mc = allClassesForAlumno(al, p[1], p[0]); var cm2 = (al.canc || []).filter(function (c) { return c.mk === mk }); mc.forEach(function (d) { if (hrsUntil(d) > 0 && !cm2.some(function (c) { return c.iso === d.toISOString() })) cls.push({ date: d, mk: mk, tot: mc.length }) }) });
    // Next month classes (for cancelling, from day 20)
    if (showNextMonth) {
      var nxtClasses = allClassesForAlumno(al, nd.getMonth(), nd.getFullYear());
      var nxtCanc = (al.canc || []).filter(function (c) { return c.mk === nxtMk });
      nxtClasses.forEach(function (d) { if (hrsUntil(d) > 0 && !nxtCanc.some(function (c) { return c.iso === d.toISOString() })) cls.push({ date: d, mk: nxtMk, tot: nxtClasses.length, nextMonth: true }) });
    }
    (al.ex || []).forEach(function (e) { var d = new Date(e.date); if (hrsUntil(d) > 0) { var wasCancelled = (al.canc || []).some(function (c) { return c.iso === e.date && c.isExtra }); if (!wasCancelled) cls.push({ date: d, mk: e.mk, isExtra: true }) } });
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
    var seen = {}; return alts.filter(function (a) { var k = a.date.toISOString(); if (seen[k]) return false; seen[k] = true; return true }).sort(function (a, b) { return a.date - b.date });
  }
  function getSlotsForDate(date) { if (!date) return []; return getAllAvailableSlots().filter(function (s) { return s.date.toDateString() === date.toDateString() }) }
  function getAvailableDates() { var slots = getAllAvailableSlots(); var seen = {}; var dates = []; slots.forEach(function (s) { var k = s.date.toDateString(); if (!seen[k]) { seen[k] = true; dates.push(s.date) } }); return dates }

  async function doCanc(ci) {
    setBusy(true);
    if (ci.isExtra) { await supa("clases_extra", "DELETE", "?alumno_id=eq." + al.id + "&fecha_iso=eq." + encodeURIComponent(ci.date.toISOString())); await supa("historial", "POST", "", { alumno_id: al.id, accion: "❌ Canceló recup " + fmtDate(ci.date) }); await refreshData(); setBusy(false); setCanRec(true); setCMsg("") }
    else { var stats = getMonthStats(al, ci.mk); var noR = stats.is5 && stats.cancTotal === 0; await supa("cancelaciones", "POST", "", { alumno_id: al.id, fecha_iso: ci.date.toISOString(), mes_key: ci.mk, sin_recuperacion: noR, sin_aviso: false, is_extra: false }); await supa("historial", "POST", "", { alumno_id: al.id, accion: (noR ? "❌(5ta) " : "❌ ") + fmtDate(ci.date) }); await refreshData(); setBusy(false); if (noR) { setCanRec(false); setCMsg("Esta clase no se puede recuperar (5ta clase). Las 4 restantes sí.") } else { setCanRec(true); setCMsg("") } }
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
    curClasses.forEach(function (d) { if (hrsUntil(d) > 0 && !curCanc.some(function (c) { return c.iso === d.toISOString() })) upUnpaid.push({ date: d, mk: curMk, tot: curClasses.length }) });
    return (
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", height: "100%" }}>
        <div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#991b1b", fontSize: 15, fontFamily: ft }}>{"Cuota de " + MN[now.getMonth()] + " pendiente"}</p>
          {cuotaInfo ? (<div style={{ marginTop: 10, background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "12px 14px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Efectivo</p><p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(cuotaInfo.efectivo)}</p></div><div style={{ textAlign: "center", flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: "#991b1b", fontFamily: ft }}>Transferencia</p><p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#991b1b", fontFamily: ft }}>{fmtMoney(cuotaInfo.transferencia)}</p></div></div>{cuotaInfo.diasRestantes ? (<div style={{ marginTop: 10, background: "#fde68a", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e", fontFamily: ft }}>{"Te quedan " + cuotaInfo.diasRestantes + " día" + (cuotaInfo.diasRestantes > 1 ? "s" : "")}</p></div>) : null}<p style={{ margin: "10px 0 0", fontSize: 12, color: "#991b1b", fontFamily: ft }}>Podés cancelar clases, pero no recuperar hasta pagar.</p></div>) : <p style={{ margin: "6px 0 0", color: "#991b1b", fontSize: 13, fontFamily: ft }}>Podés cancelar, pero no recuperar hasta pagar.</p>}
        </div>
        {step === "menu" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={function () { doPayNotif(); setStep("ps") }} disabled={busy} style={{ padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: copper, color: white, border: "none", textAlign: "left" }}>{busy ? "Enviando..." : "Ya hice el pago"}</button>
          {upUnpaid.length > 0 ? <button onClick={function () { setStep("cp_unpaid") }} style={bS(false)}>{"❌ Cancelar una clase"}</button> : null}
          <button disabled style={bS(true)}>{"🔄 Recuperar (pago pendiente)"}</button></div>) : null}
        {step === "ps" ? (<div style={{ background: "#f0f5e8", borderRadius: 10, padding: 16 }}><p style={{ margin: 0, color: "#5a6a2a", fontSize: 14, fontFamily: ft }}>¡Gracias! Le avisamos al equipo.</p><button onClick={function () { setStep("menu") }} style={Object.assign({}, bS(false), { marginTop: 12 })}>← Volver</button></div>) : null}
        {step === "cp_unpaid" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Qué clase cancelar?</p>{upUnpaid.map(function (cl, i) { var h = hrsUntil(cl.date); var blocked = h < 24; return <button key={i} disabled={blocked} onClick={function () { setSel(cl); setStep("cc_unpaid") }} style={bS(blocked)}>{fmtDate(cl.date) + (blocked ? " · ⚠ <24h" : "")}</button> })}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
        {step === "cc_unpaid" && sel ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Confirmás cancelar?</p><div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}</div><button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd_unpaid") }) }} style={bD}>{busy ? "..." : "Sí, cancelar"}</button><button onClick={function () { setStep("cp_unpaid") }} style={bS(false)}>No, volver</button></div>) : null}
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
      {step === "cp" ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Qué clase cancelar?</p>{up.map(function (cl, i) { var h = hrsUntil(cl.date); var blocked = h < 24; return <button key={i} disabled={blocked} onClick={function () { setSel(cl); setStep("cc") }} style={bS(blocked)}>{fmtDate(cl.date) + (cl.isExtra ? " (recup)" : "") + (blocked ? " · ⚠ <24h" : "")}</button> })}<button onClick={reset} style={bS(false)}>← Volver</button></div>) : null}
      {step === "cc" && sel ? (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}><p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>¿Confirmás cancelar?</p><div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}</div><button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd") }) }} style={bD}>{busy ? "..." : "Sí, cancelar"}</button><button onClick={function () { setStep("cp") }} style={bS(false)}>No, volver</button></div>) : null}
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
export default function App() {
  var hash = useHash();
  var _als = useState([]), als = _als[0], setAls = _als[1];
  var _profes = useState([]), profes = _profes[0], setProfes = _profes[1];
  var _listas = useState([]), listas = _listas[0], setListas = _listas[1];
  var _cuotas = useState([]), cuotas = _cuotas[0], setCuotas = _cuotas[1];
  var _horariosExtra = useState([]), horariosExtra = _horariosExtra[0], setHorariosExtra = _horariosExtra[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _adminAuth = useState(false), adminAuth = _adminAuth[0], setAdminAuth = _adminAuth[1];
  var _adminView = useState("chat"), adminView = _adminView[0], setAdminView = _adminView[1];
  var _logged = useState(null), logged = _logged[0], setLogged = _logged[1];
  var _loggedProfe = useState(null), loggedProfe = _loggedProfe[0], setLoggedProfe = _loggedProfe[1];
  var _tab = useState("cal"), tab = _tab[0], setTab = _tab[1];

  var loadData = useCallback(async function () {
    try {
      var [alRows, profeRows, pagos, cancs, extras, listasRows, cuotasRows, horariosExtraRows] = await Promise.all([
        supa("alumnos", "GET", "?estado=eq.activo&order=nombre"), supa("profesoras", "GET", "?order=nombre"), supa("meses_pagados", "GET"), supa("cancelaciones", "GET"), supa("clases_extra", "GET"), supa("listas", "GET"), supa("cuotas", "GET"), supa("horarios_extra", "GET")
      ]);
      if (alRows) { for (var ai = 0; ai < alRows.length; ai++) { if (!alRows[ai].password || alRows[ai].password === "" || alRows[ai].password === "null") { var newPw = genPw("eves"); await supa("alumnos", "PATCH", "?id=eq." + alRows[ai].id, { password: newPw }); alRows[ai].password = newPw } } }
      if (profeRows) { for (var pi = 0; pi < profeRows.length; pi++) { if (!profeRows[pi].password || profeRows[pi].password === "" || profeRows[pi].password === "null") { var newPwP = genPw("prof"); await supa("profesoras", "PATCH", "?id=eq." + profeRows[pi].id, { password: newPwP }); profeRows[pi].password = newPwP } } }
      setAls((alRows || []).map(function (r) { return buildAlumnoFromRow(r, pagos || [], cancs || [], extras || []) }));
      setProfes((profeRows || []).map(buildProfeFromRow));
      setListas(listasRows || []); setCuotas(cuotasRows || []); setHorariosExtra(horariosExtraRows || []);
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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: ft, background: cream }}>
      <div style={{ background: navy, color: cream, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: 19, letterSpacing: "0.5px", fontFamily: "'Instrument Serif',serif" }}>EVES POTTERY</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {route === "admin" && adminAuth ? (<>
            {(adminView === "alumna" && logged) || (adminView === "profe" && loggedProfe) ? <button onClick={function () { setLogged(null); setLoggedProfe(null); setAdminView("chat") }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue, marginRight: 4 }}>← Admin</button> : null}
            <button onClick={function () { setAdminView("chat"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "chat")}>Admin</button>
            <button onClick={function () { setAdminView("sede"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "sede")}>Palermo</button>
            <button onClick={function () { setAdminView("alumna"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "alumna")}>Alumna</button>
            <button onClick={function () { setAdminView("profe"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "profe")}>Profe</button>
            <button onClick={function () { setAdminAuth(false); setAdminView("chat"); setLogged(null); setLoggedProfe(null) }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: "#fca5a5", marginLeft: 4 }}>Salir</button>
          </>) : route === "alumna" && logged ? (<button onClick={function () { setLogged(null); setTab("cal") }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue }}>Salir</button>
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
          ) : adminView === "profe" ? (
            !loggedProfe ? <GenericLogin table="profesoras" onLogin={function (row) { var p = profes.find(function (x) { return x.id === row.id }); setLoggedProfe(p || row) }} subtitle="Seleccioná profesora" skipPw={true} refreshData={refreshData} />
            : curProfe ? <ProfeView profe={curProfe} als={als} refreshData={refreshData} listas={listas} /> : null
          ) : null
      ) : route === "profesora" ? (
        !loggedProfe ? <GenericLogin table="profesoras" onLogin={function (row) { var p = profes.find(function (x) { return x.id === row.id }); if (p) setLoggedProfe(p); else refreshData().then(function () { setLoggedProfe(row) }) }} subtitle="Acceso profesoras" refreshData={refreshData} />
        : curProfe ? <ProfeView profe={curProfe} als={als} refreshData={refreshData} listas={listas} /> : null
      ) : (
        !logged ? <GenericLogin table="alumnos" onLogin={function (row) { var a = als.find(function (x) { return x.id === row.id }); if (a) { setLogged(a); setTab("cal") } else refreshData().then(function () { setLogged(row); setTab("cal") }) }} subtitle="Accedé a tus clases" refreshData={refreshData} />
        : (<div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}><p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{cur ? cur.nombre : ""}</p><p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{cur ? cur.sede + " · " + cur.turno.dia + " " + cur.turno.hora : ""}</p></div>
            <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
              <button onClick={function () { setTab("cal") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "cal" ? white : cream, color: tab === "cal" ? navy : grayWarm, borderBottom: tab === "cal" ? "2px solid " + copper : "2px solid transparent" }}>Mis clases</button>
              <button onClick={function () { setTab("gest") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "gest" ? white : cream, color: tab === "gest" ? navy : grayWarm, borderBottom: tab === "gest" ? "2px solid " + copper : "2px solid transparent" }}>Gestionar</button></div>
            <div style={{ flex: 1, overflow: "auto", background: white }}>
              {tab === "cal" && cur ? <AlumnoCal al={cur} cuotas={cuotas} /> : null}
              {tab === "gest" && cur ? <AlumnoFlow al={cur} allAls={als} refreshData={refreshData} cuotas={cuotas} horariosExtra={horariosExtra} /> : null}
            </div></div>)
      )}
    </div>);
}
