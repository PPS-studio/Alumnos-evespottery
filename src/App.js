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
  "San Isidro": ["lunes-18:00", "martes-09:30", "martes-14:00", "martes-18:30", "miércoles-18:30", "jueves-18:30", "viernes-18:00", "sábado-10:00"],
  "Palermo": ["lunes-10:00", "lunes-18:30", "martes-14:30", "martes-18:30", "miércoles-18:30", "jueves-14:30", "jueves-18:30", "viernes-10:00", "viernes-18:30"]
};
var MAX_CUPO = 8; var CLASES_BASE = 4;
var DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
var MN = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function parseMes(s) { var low = s.toLowerCase(); for (var i = 0; i < MN.length; i++) { if (low.includes(MN[i])) { var ym = low.match(/\d{4}/); var y = ym ? parseInt(ym[0]) : new Date().getFullYear(); return { month: i, year: y, key: y + "-" + i } } } return null }
function classesInMonth(day, time, month, year) {
  var tgt = DAYS.indexOf(day); var res = []; var d = new Date(year, month, 1);
  while (d.getMonth() === month) { var dow = d.getDay(); var idx = dow === 0 ? 6 : dow - 1; if (idx === tgt) { var cl = new Date(d); var pp = time.split(":"); cl.setHours(parseInt(pp[0]), parseInt(pp[1]), 0, 0); res.push(cl) } d.setDate(d.getDate() + 1) } return res
}
function hrsUntil(d) { return (d.getTime() - Date.now()) / 3600000 }
function fmtDate(d) { var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; var mn = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]; return dn[d.getDay()] + " " + d.getDate() + " " + mn[d.getMonth()] + " · " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") }
function fmtDateShort(d) { var dn = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]; return dn[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") }
function genPw(prefix) { return prefix + String(Math.floor(1000 + Math.random() * 9000)) }

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
  return { id: row.id, nombre: row.nombre, tel: row.tel || "", email: row.email || "", sede: row.sede, turno: { dia: row.turno_dia, hora: row.turno_hora }, mp: mp, hist: [], ex: ex, canc: canc, reg: row.clase_regalo || 0, pw: row.password, estado: row.estado || "activo", pendArrastre: row.pend_arrastre || 0 }
}
function buildProfeFromRow(row) {
  var sedes = row.sedes || [];
  var sede = sedes.length > 0 ? sedes[0] : "Palermo";
  return { id: row.id, nombre: row.nombre, sede: sede, sedes: sedes, horarios: row.horarios || [], pw: row.password, esEncargada: row.encargada || false, sedeEncargada: row.encargada ? sede : null }
}

function getMonthStats(al, mk) {
  var p = mk.split("-").map(Number);
  var totalInMonth = classesInMonth(al.turno.dia, al.turno.hora, p[1], p[0]).length;
  var is5 = totalInMonth === 5;
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

// Calcular pendientes de arrastre del mes anterior
function calcArrastre(al) {
  var now = new Date();
  var prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  var prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  var prevMk = prevYear + "-" + prevMonth;
  var curMk = now.getFullYear() + "-" + now.getMonth();
  // Solo arrastra si pagó el mes actual
  if (!(al.mp || {})[curMk]) return 0;
  // Si no tenía el mes anterior pagado, no hay arrastre
  if (!(al.mp || {})[prevMk]) return al.pendArrastre || 0;
  var stats = getMonthStats(al, prevMk);
  // Clases no hechas = pendientes sin recuperar del mes anterior
  var pendPrev = stats.pendientes;
  // Sumar pendArrastre guardado en DB (por si se calculó manualmente)
  return Math.max(pendPrev, al.pendArrastre || 0);
}

function getCupoForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var fijos = 0; var recups = 0;
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    if (a.turno.dia === dia && a.turno.hora === hora) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) fijos++ }
    (a.ex || []).forEach(function (e) { if (e.date === dateStr) recups++ })
  });
  return { ocupado: fijos + recups, libre: MAX_CUPO - fijos - recups };
}
function getAlumnosForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var result = [];
  allAls.forEach(function (a) {
    if (a.sede !== sede) return;
    var mk = fecha.getFullYear() + "-" + fecha.getMonth();
    if (!(a.mp || {})[mk]) return;
    if (a.turno.dia === dia && a.turno.hora === hora) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) result.push({ alumno: a, tipo: "fijo" }) }
    (a.ex || []).forEach(function (e) { if (e.date === dateStr && !result.find(function (r) { return r.alumno.id === a.id })) result.push({ alumno: a, tipo: "recuperacion" }) })
  });
  return result;
}
function countFijosForSlot(allAls, sede, dia, hora, fecha) {
  var dateStr = fecha.toISOString(); var mk = fecha.getFullYear() + "-" + fecha.getMonth(); var count = 0;
  allAls.forEach(function (a) { if (a.sede !== sede) return; if (!(a.mp || {})[mk]) return; if (a.turno.dia === dia && a.turno.hora === hora) { var cancelled = (a.canc || []).some(function (c) { return c.iso === dateStr }); if (!cancelled) count++ } });
  return count;
}

// ====== HASH ROUTER ======
function useHash() {
  var _h = useState(window.location.hash || "#/alumna"); var hash = _h[0], setHash = _h[1];
  useEffect(function () { function onHash() { setHash(window.location.hash) } window.addEventListener("hashchange", onHash); return function () { window.removeEventListener("hashchange", onHash) } }, []);
  return hash;
}

// ====== LOADING SCREEN ======
function LoadingScreen() {
  return (<div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: cream, flexDirection: "column", gap: 12 }}>
    <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy }}>EVES POTTERY</p>
    <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft }}>Cargando datos...</p>
    <div style={{ width: 40, height: 40, border: "3px solid " + grayBlue, borderTop: "3px solid " + copper, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>);
}

// ====== ADMIN LOGIN ======
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
  var als = props.als, refreshData = props.refreshData, profes = props.profes, listas = props.listas;
  var ref = useRef(null);
  var welcomeMsg = "¡Hola! Asistente Eves Pottery ✦\n\nComandos:\n• Alta alumno: Nombre / Sede / día hora\n• Baja: Nombre\n• Suspender: Nombre\n• Reactivar: Nombre\n• Pago recibido: Nombre (mes año)\n• Pagos mes año: nombre1, nombre2...\n• Consulta: Nombre\n• Clase regalo: Nombre\n• Alumnos [P|SI] hoy/martes/mañana\n• Ver alumnos [P|SI]\n• Pagos pendientes [P|SI]\n• Alta profe: Nombre / Sede / día hora, día hora\n• Baja profe: Nombre\n• Ver profes\n• Notificaciones";
  var _m = useState([{ from: "bot", text: welcomeMsg }]), msgs = _m[0], setMsgs = _m[1];
  var _i = useState(""), inp = _i[0], setInp = _i[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  useEffect(function () { if (ref.current) ref.current.scrollIntoView({ behavior: "smooth" }) }, [msgs]);

  function findA(name) { var low = name.toLowerCase().trim(); return als.findIndex(function (a) { return a.nombre.toLowerCase().includes(low) }) }
  function parseSede(t) { var m = t.match(/\b(si|san\s*isidro)\b/i); if (m) return "San Isidro"; var mp = t.match(/\bP\b/); if (mp) return "Palermo"; return null; }
  function filterBySede(list, sede) { if (!sede) return list; return list.filter(function (a) { return a.sede === sede }) }

  async function respond(txt) {
    var t = txt.toLowerCase().trim();
    var sedeFilter = parseSede(t);
    var sedeLabel = sedeFilter ? " (" + sedeFilter + ")" : "";

    // NOTIFICACIONES
    if (t.startsWith("notificacion") || t.startsWith("notif")) {
      var r = "✦ Notificaciones\n\n";
      var notifs = await supa("admin_notifs", "GET", "?order=created_at.desc&limit=20");
      if (notifs && notifs.length) {
        r += notifs.map(function (n) { return "• [" + n.tipo + "] " + n.nombre + (n.sede ? " (" + n.sede + ")" : "") + (n.turno ? " — " + n.turno : "") }).join("\n");
      } else r += "Sin notificaciones pendientes ✓";
      return r;
    }

    // VER PROFES
    if (t.includes("ver profe") || t === "profes") {
      if (!profes.length) return "No hay profes cargadas.";
      return "✦ Profesoras:\n\n" + profes.map(function (p) { return "• " + p.nombre + " — " + p.sede + (p.esEncargada ? " (Encargada)" : "") + "\n  Horarios: " + p.horarios.map(function (h) { return h.replace("-", " ") }).join(", ") }).join("\n")
    }

    // ALTA PROFE
    if (t.startsWith("alta profe")) {
      var raw = txt.replace(/alta\s*profe\s*:?\s*/i, "").trim();
      var parts = raw.split("/").map(function (s) { return s.trim() });
      if (parts.length < 3) return "Formato: Alta profe: Nombre / Sede / día hora, día hora";
      var nom = parts[0]; var sede = parts[1].toLowerCase().includes("palermo") ? "Palermo" : "San Isidro";
      var horStr = parts.slice(2).join("/");
      var dayFix = { "lunes": "lunes", "martes": "martes", "miercoles": "miércoles", "miércoles": "miércoles", "jueves": "jueves", "viernes": "viernes", "sabado": "sábado", "sábado": "sábado" };
      var hors = horStr.split(",").map(function (h) { var m = h.trim().toLowerCase().match(/([a-záéíóúñü]+)\s+(\d{1,2}:\d{2})/); if (!m) return null; var dayNorm = dayFix[m[1]]; if (!dayNorm) return null; return dayNorm + "-" + m[2] }).filter(Boolean);
      if (!hors.length) return "No entendí los horarios. Ej: martes 14:30, jueves 18:30";
      var newPwP = genPw("prof");
      var res = await supa("profesoras", "POST", "", { nombre: nom, sedes: [sede], horarios: hors, password: newPwP, encargada: false });
      if (res) { await refreshData(); return "✓ Profe " + nom + " — " + sede + "\nHorarios: " + hors.map(function (h) { return h.replace("-", " ") }).join(", ") + "\n🔑 Contraseña: " + newPwP }
      return "✗ Error al crear profe."
    }

    // BAJA PROFE
    if (t.startsWith("baja profe")) {
      var n = txt.replace(/baja\s*profe\s*:?\s*/i, "").trim();
      var idx = profes.findIndex(function (p) { return p.nombre.toLowerCase().includes(n.toLowerCase()) });
      if (idx === -1) return "✗ No encontré esa profesora.";
      var pr = profes[idx];
      await supa("profesoras", "DELETE", "?id=eq." + pr.id);
      await refreshData();
      return "✓ " + pr.nombre + " dada de baja."
    }

    // SUSPENDER ALUMNA
    if (t.startsWith("suspender")) {
      var n = txt.replace(/suspender\s*:?\s*/i, "").trim(); if (!n) return "Formato: Suspender: Nombre";
      var idx = findA(n); if (idx === -1) return "✗ No encontré ese nombre.";
      var al = als[idx];
      await supa("alumnos", "PATCH", "?id=eq." + al.id, { estado: "suspendida" });
      await supa("historial", "POST", "", { alumno_id: al.id, accion: "⏸ Suspendida" });
      await refreshData();
      return "✓ " + al.nombre + " suspendida. No podrá ingresar hasta ser reactivada."
    }

    // REACTIVAR ALUMNA
    if (t.startsWith("reactivar")) {
      var n2 = txt.replace(/reactivar\s*:?\s*/i, "").trim(); if (!n2) return "Formato: Reactivar: Nombre";
      // Buscar en TODAS las alumnas (incluyendo baja/suspendida)
      var allRows = await supa("alumnos", "GET", "?nombre=ilike.*" + encodeURIComponent(n2) + "*");
      if (!allRows || !allRows.length) return "✗ No encontré ese nombre.";
      var row = allRows[0];
      await supa("alumnos", "PATCH", "?id=eq." + row.id, { estado: "activo" });
      await supa("historial", "POST", "", { alumno_id: row.id, accion: "✅ Reactivada" });
      await refreshData();
      return "✓ " + row.nombre + " reactivada. Estado: activo."
    }

    // PAGOS PENDIENTES
    if (t.includes("pagos pendiente") || t.includes("pago pendiente")) {
      var now2 = new Date(); var mk = now2.getFullYear() + "-" + now2.getMonth();
      var pend = filterBySede(als, sedeFilter).filter(function (a) { return !(a.mp || {})[mk] });
      if (!pend.length) return "✓ Todos al día" + sedeLabel;
      return "✦ Pagos pendientes " + MN[now2.getMonth()] + " " + now2.getFullYear() + sedeLabel + ":\n\n" + pend.map(function (a) { return "• " + a.nombre + " — " + a.sede + " — " + a.turno.dia + " " + a.turno.hora }).join("\n") + "\n\nTotal: " + pend.length
    }

    // PAGO MASIVO
    var masMatch = txt.match(/pagos\s+([\wéáíóú]+)\s+(\d{4})\s*:\s*(.+)/i);
    if (masMatch) {
      var parsed = parseMes(masMatch[1] + " " + masMatch[2]);
      if (!parsed) return "No entendí el mes.";
      var nombres = masMatch[3].split(",").map(function (s) { return s.trim() }).filter(Boolean);
      var ok = [], nf = [];
      for (var ni = 0; ni < nombres.length; ni++) {
        var nom2 = nombres[ni];
        var idx2 = als.findIndex(function (a) { return a.nombre.toLowerCase().includes(nom2.toLowerCase()) });
        if (idx2 === -1) { nf.push(nom2); continue }
        var al2 = als[idx2];
        // Calcular arrastre al registrar pago
        var arrastre = calcArrastre(al2);
        await supa("meses_pagados", "POST", "", { alumno_id: al2.id, mes_key: parsed.key });
        if (arrastre > 0) await supa("alumnos", "PATCH", "?id=eq." + al2.id, { pend_arrastre: arrastre });
        await supa("historial", "POST", "", { alumno_id: al2.id, accion: "💳 " + MN[parsed.month] + " " + parsed.year + (arrastre > 0 ? " (+"+arrastre+" arrastre)" : "") });
        ok.push(al2.nombre + (arrastre > 0 ? " (+"+arrastre+" arrastre)" : ""));
      }
      await refreshData();
      var r2 = "✦ Pago masivo " + MN[parsed.month] + " " + parsed.year + ":\n\n";
      if (ok.length) r2 += "✓ Registrados (" + ok.length + "):\n" + ok.map(function (n3) { return "  • " + n3 }).join("\n") + "\n";
      if (nf.length) r2 += "\n✗ No encontrados (" + nf.length + "):\n" + nf.map(function (n3) { return "  • " + n3 }).join("\n");
      return r2
    }

    // VER ALUMNOS
    if (t.includes("ver alumno") || t === "alumnos" || t === "lista") {
      var filtered = filterBySede(als, sedeFilter);
      if (!filtered.length) return "No hay alumnos" + sedeLabel + ".";
      return "✦ Alumnos" + sedeLabel + ":\n\n" + filtered.map(function (a) {
        var meses = Object.keys(a.mp || {}).map(function (k) { return MN[parseInt(k.split("-")[1])] }).join(", ") || "—";
        return "• " + a.nombre + " — " + a.sede + " — " + a.turno.dia + " " + a.turno.hora + " — Pagó: " + meses
      }).join("\n")
    }

    // ALUMNOS DE HOY/DIA
    if (t.includes("alumnos de") || t.includes("alumnos del") || t.includes("planilla")) {
      var td = new Date(); var label = "hoy";
      if (t.includes("mañana")) { td = new Date(); td.setDate(td.getDate() + 1); label = "mañana" }
      else { var dm = t.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/); if (dm) { var ti = DAYS.indexOf(dm[1]); var ci = td.getDay(); var cx = ci === 0 ? 6 : ci - 1; var diff = ti - cx; if (diff <= 0) diff += 7; td = new Date(); td.setDate(td.getDate() + diff); label = dm[1] } }
      var dow = td.getDay(); var dayN = DAYS[dow === 0 ? 6 : dow - 1]; var mk2 = td.getFullYear() + "-" + td.getMonth();
      var list = [];
      filterBySede(als, sedeFilter).forEach(function (a) {
        if (a.turno.dia !== dayN) return; if (!(a.mp || {})[mk2]) return;
        var dateObj = new Date(td); var pp = a.turno.hora.split(":"); dateObj.setHours(parseInt(pp[0]), parseInt(pp[1]), 0, 0);
        var cancelled = (a.canc || []).some(function (c) { return c.iso === dateObj.toISOString() });
        if (!cancelled) list.push(a)
      });
      filterBySede(als, sedeFilter).forEach(function (a) {
        (a.ex || []).forEach(function (e) { var exD = new Date(e.date); if (exD.toDateString() === td.toDateString() && !list.find(function (x) { return x.id === a.id })) list.push(Object.assign({}, a, { isRec: true })) })
      });
      if (!list.length) return "No hay alumnos el " + label + " (" + dayN + ")" + sedeLabel + ".";
      var r3 = "✦ " + label + " (" + dayN + " " + td.getDate() + "/" + (td.getMonth() + 1) + ")" + sedeLabel + ":\n\n";
      list.sort(function (a, b) { return a.turno.hora.localeCompare(b.turno.hora) });
      list.forEach(function (a) { r3 += "• " + a.turno.hora + " — " + a.nombre + (a.isRec ? " (recup)" : "") + " (" + a.sede + ")\n" });
      r3 += "\nTotal: " + list.length; return r3
    }

    // BAJA ALUMNO
    if (t.startsWith("baja") && !t.startsWith("baja profe")) {
      var n3 = txt.replace(/baja\s*:?\s*/i, "").trim(); if (!n3) return "Formato: Baja: Nombre";
      var idx3 = findA(n3); if (idx3 === -1) return "✗ No encontré ese nombre.";
      var al3 = als[idx3];
      await supa("alumnos", "PATCH", "?id=eq." + al3.id, { estado: "baja" });
      await supa("historial", "POST", "", { alumno_id: al3.id, accion: "⛔ Baja" });
      await refreshData();
      return "✓ " + al3.nombre + " dado de baja. Para reactivar: Reactivar: " + al3.nombre
    }

    // CONSULTA
    if (t.startsWith("consulta")) {
      var n4 = txt.replace(/consulta\s*:?\s*/i, "").trim(); if (!n4) return "Formato: Consulta: Nombre";
      var idx4 = findA(n4); if (idx4 === -1) return "✗ No encontré ese nombre."; var a4 = als[idx4];
      var meses4 = Object.keys(a4.mp || {});
      var arrastre4 = calcArrastre(a4);
      var r4 = "✦ " + a4.nombre + "\n📍 " + a4.sede + " · " + a4.turno.dia + " " + a4.turno.hora;
      r4 += "\n📌 Estado: " + (a4.estado || "activo");
      r4 += "\n💳 Pagó: " + (meses4.length ? meses4.map(function (k) { var p = k.split("-"); return MN[parseInt(p[1])] + " " + p[0] }).join(", ") : "—");
      r4 += "\n🎁 Regalo: " + (a4.reg || 0);
      if (arrastre4 > 0) r4 += "\n🔄 Arrastre mes anterior: " + arrastre4 + " clase(s)";
      meses4.forEach(function (mk3) {
        var stats = getMonthStats(a4, mk3); var p = mk3.split("-").map(Number);
        r4 += "\n\n📅 " + MN[p[1]] + " " + p[0] + ":";
        r4 += "\n  Clases en mes: " + stats.totalInMonth + (stats.is5 ? " (5ta regalo)" : "");
        r4 += "\n  Cancelaciones: " + stats.cancTotal + (stats.cancSinRecup > 0 ? " (" + stats.cancSinRecup + " sin recup)" : "");
        r4 += "\n  Recuperaciones: " + stats.recuperaciones;
        r4 += "\n  Pendientes: " + stats.pendientes;
        r4 += "\n  Clases efectivas: " + stats.clasesEfectivas + "/" + CLASES_BASE
      });
      return r4
    }

    // CLASE REGALO
    if (t.includes("clase regalo") || t.includes("regalar clase")) {
      var n5 = txt.replace(/clase\s*(de\s*)?regalo\s*:?\s*/i, "").replace(/regalar\s*clase\s*:?\s*/i, "").trim();
      if (!n5) return "Formato: Clase regalo: Nombre"; var idx5 = findA(n5); if (idx5 === -1) return "✗ No encontré ese nombre.";
      var al5 = als[idx5];
      await supa("alumnos", "PATCH", "?id=eq." + al5.id, { clase_regalo: (al5.reg || 0) + 1 });
      await supa("historial", "POST", "", { alumno_id: al5.id, accion: "🎁 Regalo" });
      await refreshData();
      return "✓ Regalo para " + al5.nombre
    }

    // ALTA ALUMNO
    var hasSlashes = txt.includes("/");
    var looksLikeAlta = t.includes("alta") || (hasSlashes && (t.includes("palermo") || t.includes("san isidro") || t.includes("isidro")));
    if (looksLikeAlta && !t.startsWith("alta profe")) {
      var parts2 = txt.split("/").map(function (s) { return s.trim() });
      if (parts2.length < 3) return "Formato: Nombre / Sede / día hora";
      var nom3, tel2 = "", email2 = "", sedePart, turnoPart;
      if (parts2.length >= 5) { nom3 = parts2[0].replace(/alta\s*(de\s*)?alumno\s*:?\s*/i, "").trim(); tel2 = parts2[1]; email2 = parts2[2]; sedePart = parts2[3]; turnoPart = parts2[4] }
      else if (parts2.length === 4) {
        nom3 = parts2[0].replace(/alta\s*(de\s*)?alumno\s*:?\s*/i, "").trim();
        if (parts2[1].toLowerCase().includes("palermo") || parts2[1].toLowerCase().includes("isidro")) { sedePart = parts2[1]; turnoPart = parts2[2] + " " + parts2[3] }
        else { tel2 = parts2[1]; sedePart = parts2[2]; turnoPart = parts2[3] }
      } else { nom3 = parts2[0].replace(/alta\s*(de\s*)?alumno\s*:?\s*/i, "").trim(); sedePart = parts2[1]; turnoPart = parts2[2] }
      var sede2 = sedePart.toLowerCase().includes("palermo") ? "Palermo" : "San Isidro";
      var tm = turnoPart.toLowerCase().match(/(lunes|martes|miércoles|jueves|viernes|sábado)\s+(\d{1,2}:\d{2})/);
      if (!tm) return "No entendí el turno. Ej: martes 14:30"; var sk = tm[1] + "-" + tm[2];
      if (SCHED[sede2].indexOf(sk) === -1) return "✗ No existe ese horario en " + sede2 + ".\nDisponibles: " + SCHED[sede2].map(function (s) { return s.replace("-", " ") }).join(", ");
      var newPw = genPw("eves");
      var res2 = await supa("alumnos", "POST", "", { nombre: nom3, tel: tel2, email: email2, sede: sede2, turno_dia: tm[1], turno_hora: tm[2], password: newPw, clase_regalo: 0, estado: "activo", pend_arrastre: 0 });
      if (res2) { await refreshData(); return "✓ Alta: " + nom3 + " — " + sede2 + " " + tm[1] + " " + tm[2] + "\n🔑 Contraseña: " + newPw }
      return "✗ Error al crear alumno."
    }

    // PAGO INDIVIDUAL
    if (t.includes("pago")) {
      var match = txt.match(/pago\s*(recibido|confirmado|ok)\s*:?\s*(.+)/i);
      if (!match) return "Formato: Pago recibido: Nombre (marzo 2026)";
      var rest = match[2].trim(); var mesM = rest.match(/\(([^)]+)\)/);
      if (!mesM) return "Incluí el mes entre paréntesis.";
      var parsed2 = parseMes(mesM[1]); if (!parsed2) return "No entendí el mes.";
      var n6 = rest.replace(/\([^)]+\)/, "").trim(); var idx6 = findA(n6);
      if (idx6 === -1) return "✗ No encontré ese nombre."; var al6 = als[idx6];
      var tc = classesInMonth(al6.turno.dia, al6.turno.hora, parsed2.month, parsed2.year).length;
      var arrastre6 = calcArrastre(al6);
      await supa("meses_pagados", "POST", "", { alumno_id: al6.id, mes_key: parsed2.key });
      if (arrastre6 > 0) await supa("alumnos", "PATCH", "?id=eq." + al6.id, { pend_arrastre: arrastre6 });
      await supa("historial", "POST", "", { alumno_id: al6.id, accion: "💳 " + MN[parsed2.month] + " " + parsed2.year });
      await refreshData();
      var totalClases = CLASES_BASE + arrastre6;
      return "✓ " + al6.nombre + " — " + MN[parsed2.month] + " " + parsed2.year + " (" + tc + " clases" + (tc === 5 ? " — 5ta regalo" : "") + ")\nDerecho a " + totalClases + " clases" + (arrastre6 > 0 ? " (" + CLASES_BASE + " del mes + " + arrastre6 + " arrastre)" : "") + "."
    }

    return "No entendí. Probá: ver alumnos, alta alumno, baja, suspender, reactivar, pago recibido, pagos masivo, consulta, clase regalo, alumnos de hoy, pagos pendientes, alta profe, ver profes, notificaciones"
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
        <div ref={ref} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid " + grayBlue, display: "flex", gap: 8, background: white }}>
        <input value={inp} onChange={function (e) { setInp(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") send() }} placeholder="Escribí un comando..." style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, outline: "none", fontFamily: ft, background: cream }} />
        <button onClick={send} disabled={busy} style={{ padding: "11px 22px", borderRadius: 10, background: busy ? grayWarm : copper, color: white, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 700, fontFamily: ft }}>Enviar</button>
      </div>
    </div>);
}

// ====== LOGIN GENERICO (con Supabase) ======
function GenericLogin(props) {
  var table = props.table, onLogin = props.onLogin, subtitle = props.subtitle, skipPw = props.skipPw, refreshData = props.refreshData;
  var _step = useState("login"), step = _step[0], setStep = _step[1];
  var _nom = useState(""), nom = _nom[0], setNom = _nom[1];
  var _pw = useState(""), pw = _pw[0], setPw = _pw[1];
  var _pw2 = useState(""), pw2 = _pw2[0], setPw2 = _pw2[1];
  var _err = useState(""), err = _err[0], setErr = _err[1];
  var _found = useState(null), found = _found[0], setFound = _found[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];

  async function doLogin() {
    setErr(""); setBusy(true);
    var query = "?nombre=ilike." + encodeURIComponent(nom.trim());
    if (table === "alumnos" && !skipPw) {
      // Para login de alumnas, traer todos los estados para dar mensaje correcto
      var allRows = await supa(table, "GET", "?nombre=ilike." + encodeURIComponent(nom.trim()));
      setBusy(false);
      if (!allRows || allRows.length === 0) { setErr("No encontramos ese nombre."); return }
      var item = allRows[0];
      // Verificar estado
      if (item.estado === "baja") { setErr("Tu cuenta fue dada de baja. Contactá al taller para más info."); return }
      if (item.estado === "suspendida") { setErr("Tu cuenta está suspendida. Contactá al taller para más info."); return }
      if (!item.password) { setFound(item); setStep("setup"); setPw(""); setPw2(""); return }
      if (item.password !== pw) { setErr("Contraseña incorrecta."); return }
      onLogin(item); return;
    }
    if (table === "profesoras" && !skipPw) {
      var rows = await supa(table, "GET", query);
      setBusy(false);
      if (!rows || rows.length === 0) { setErr("No encontramos ese nombre."); return }
      var item2 = rows[0];
      if (!item2.password) { setFound(item2); setStep("setup"); setPw(""); setPw2(""); return }
      if (item2.password !== pw) { setErr("Contraseña incorrecta."); return }
      onLogin(item2); return;
    }
    // skipPw (admin viendo vistas)
    var rows2 = await supa(table, "GET", query + (table === "alumnos" ? "&estado=eq.activo" : ""));
    setBusy(false);
    if (!rows2 || rows2.length === 0) { setErr("No encontramos ese nombre."); return }
    onLogin(rows2[0]);
  }

  async function doSetup() {
    setErr(""); if (pw.length < 4) { setErr("Mínimo 4 caracteres."); return }
    if (pw !== pw2) { setErr("No coinciden."); return }
    setBusy(true);
    await supa(table, "PATCH", "?id=eq." + found.id, { password: pw });
    setBusy(false);
    if (refreshData) await refreshData();
    onLogin(Object.assign({}, found, { password: pw }));
  }

  var iStyle = { width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, background: white, outline: "none", boxSizing: "border-box" };
  var lStyle = { fontSize: 12, fontWeight: 600, color: navy, fontFamily: ft, marginBottom: 4, display: "block" };
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: cream }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 28, fontFamily: "'Instrument Serif',serif", fontWeight: 700, color: navy, margin: "0 0 4px" }}>EVES POTTERY</p>
          <p style={{ color: grayWarm, fontSize: 14, fontFamily: ft, margin: 0 }}>{subtitle || "Accedé a tus clases"}</p>
        </div>
        {step === "login" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={lStyle}>Nombre completo</label>
              <input value={nom} onChange={function (e) { setNom(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") doLogin() }} placeholder="Tu nombre" style={iStyle} /></div>
            {!skipPw ? <div><label style={lStyle}>Contraseña</label>
              <input type="password" value={pw} onChange={function (e) { setPw(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") doLogin() }} placeholder="Tu contraseña" style={iStyle} /></div> : null}
            {err ? <p style={{ color: "#991b1b", fontSize: 13, margin: 0, fontFamily: ft }}>{err}</p> : null}
            <button onClick={doLogin} disabled={busy} style={{ padding: "12px", borderRadius: 10, background: copper, color: white, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ft, fontSize: 14, width: "100%" }}>{busy ? "Verificando..." : "Entrar"}</button>
            {!skipPw ? <p style={{ color: grayWarm, fontSize: 12, fontFamily: ft, margin: 0, textAlign: "center" }}>Primera vez? Ingresá tu nombre y te pedirá crear contraseña.</p> : null}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#f0f5e8", borderRadius: 10, padding: 14, border: "1px solid #b5c48a" }}>
              <p style={{ margin: 0, color: "#5a6a2a", fontSize: 14, fontFamily: ft }}>{"¡Hola " + found.nombre.split(" ")[0] + "! Creá tu contraseña."}</p></div>
            <div><label style={lStyle}>Contraseña</label>
              <input type="password" value={pw} onChange={function (e) { setPw(e.target.value) }} placeholder="Mínimo 4 caracteres" style={iStyle} /></div>
            <div><label style={lStyle}>Repetí</label>
              <input type="password" value={pw2} onChange={function (e) { setPw2(e.target.value) }} onKeyDown={function (e) { if (e.key === "Enter") doSetup() }} placeholder="Repetí" style={iStyle} /></div>
            {err ? <p style={{ color: "#991b1b", fontSize: 13, margin: 0, fontFamily: ft }}>{err}</p> : null}
            <button onClick={doSetup} disabled={busy} style={{ padding: "12px", borderRadius: 10, background: copper, color: white, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ft, fontSize: 14, width: "100%" }}>{busy ? "Guardando..." : "Crear y entrar"}</button>
            <button onClick={function () { setStep("login"); setPw(""); setPw2(""); setErr("") }} style={{ padding: "12px", borderRadius: 10, background: white, color: navy, border: "1px solid " + grayBlue, cursor: "pointer", fontWeight: 600, fontFamily: ft, fontSize: 14, width: "100%" }}>{"← Volver"}</button>
          </div>
        )}
      </div>
    </div>);
}

// ====== PROFESORA VIEW ======
function ProfeView(props) {
  var profe = props.profe, als = props.als, refreshData = props.refreshData, listas = props.listas;
  var _tab = useState("clases"), tab = _tab[0], setTab = _tab[1];
  var isEncargada = profe.esEncargada;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", background: white, borderBottom: "1px solid " + grayBlue }}>
        <p style={{ margin: 0, fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{profe.nombre}{isEncargada ? " (Encargada)" : ""}</p>
        <p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{profe.sede}</p>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid " + grayBlue }}>
        <button onClick={function () { setTab("clases") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "clases" ? white : cream, color: tab === "clases" ? navy : grayWarm, borderBottom: tab === "clases" ? "2px solid " + copper : "2px solid transparent" }}>{"📅 Mis clases"}</button>
        <button onClick={function () { setTab("lista") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "lista" ? white : cream, color: tab === "lista" ? navy : grayWarm, borderBottom: tab === "lista" ? "2px solid " + copper : "2px solid transparent" }}>{"✋ Tomar lista"}</button>
        {isEncargada ? <button onClick={function () { setTab("sede") }} style={{ flex: 1, padding: "11px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: ft, background: tab === "sede" ? white : cream, color: tab === "sede" ? navy : grayWarm, borderBottom: tab === "sede" ? "2px solid " + copper : "2px solid transparent" }}>{"🏠 Vista sede"}</button> : null}
      </div>
      <div style={{ flex: 1, overflow: "auto", background: white }}>
        {tab === "clases" ? <ProfeClases profe={profe} als={als} /> : null}
        {tab === "lista" ? <ProfeLista profe={profe} als={als} refreshData={refreshData} listas={listas} /> : null}
        {tab === "sede" && isEncargada ? <EncargadaVista profe={profe} als={als} /> : null}
      </div>
    </div>);
}

function ProfeClases(props) {
  var profe = props.profe, als = props.als;
  var now = new Date(); var limit = new Date(now); limit.setDate(limit.getDate() + 7);
  var clases = [];
  profe.horarios.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(now); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      var dow = dd.getDay(); var dayIdx = dow === 0 ? 6 : dow - 1;
      if (DAYS[dayIdx] === dia) {
        var dt = new Date(dd); var tp = hora.split(":"); dt.setHours(parseInt(tp[0]), parseInt(tp[1]), 0, 0);
        if (dt > now) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); var fijos = countFijosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected.length, fijos: fijos }) }
      }
    }
  });
  clases.sort(function (a, b) { return a.date - b.date });
  var isSI = profe.sede === "San Isidro";
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 14px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Próximas clases (7 días)</h3>
      {clases.length === 0 ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 14 }}>No tenés clases próximas.</p> :
        clases.map(function (c, i) {
          var msgText, msgBg, msgBorder, msgColor;
          if (isSI) { msgText = "☀️ ¡Que disfrutes mucho de la clase! Por favor, no te olvides de tomar lista. ¡Gracias! 😊"; msgBg = "#f0f5e8"; msgBorder = "#b5c48a"; msgColor = "#5a6a2a"; }
          else if (c.fijos === 0) { msgText = "🔧 No hay alumnos en este horario, recuerda hacer producción por favor. ¡Que lo disfrutes!"; msgBg = "#f5f0fa"; msgBorder = "#c4b5d4"; msgColor = "#6b5080"; }
          else if (c.alumnos < 4) { msgText = "⚠️ Hay menos de 4 alumnos, recordá por favor hacer producción o trabajo de taller. ¡Disfrutá mucho de la clase y por favor no te olvides de tomar lista! Gracias 😊"; msgBg = "#fdf6ec"; msgBorder = "#e8d4b0"; msgColor = "#92651e"; }
          else { msgText = "☀️ ¡Que disfrutes mucho de la clase! Por favor, no te olvides de tomar lista. ¡Gracias! 😊"; msgBg = "#f0f5e8"; msgBorder = "#b5c48a"; msgColor = "#5a6a2a"; }
          return (<div key={i} style={{ marginBottom: 12, borderRadius: 12, border: "1px solid " + grayBlue, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f6f2" }}>
              <span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{fmtDate(c.date)}</span>
              <span style={{ fontSize: 13, color: c.fijos === 0 ? grayWarm : copper, fontFamily: ft, fontWeight: 600 }}>{c.alumnos + " alumno" + (c.alumnos !== 1 ? "s" : "")}{c.fijos === 0 ? " (cerrado)" : ""}</span>
            </div>
            <div style={{ padding: "10px 16px", background: msgBg, borderTop: "1px solid " + msgBorder }}>
              <p style={{ margin: 0, fontSize: 13, fontFamily: ft, color: msgColor, lineHeight: 1.5 }}>{msgText}</p>
            </div>
          </div>)
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

  var now = new Date(); var limit = new Date(now); limit.setDate(limit.getDate() + 7);
  var clases = [];
  profe.horarios.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    for (var dd = new Date(now); dd <= limit; dd = new Date(dd.getTime() + 86400000)) {
      var dow = dd.getDay(); var dayIdx = dow === 0 ? 6 : dow - 1;
      if (DAYS[dayIdx] === dia) {
        var dt = new Date(dd); var tp = hora.split(":"); dt.setHours(parseInt(tp[0]), parseInt(tp[1]), 0, 0);
        var iso = dt.toISOString();
        var yaTomada = listas.some(function (l) { return l.profe === profe.nombre && l.fecha_iso === iso });
        if (!yaTomada) { var expected = getAlumnosForSlot(als, profe.sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected, iso: iso }) }
      }
    }
  });
  clases.sort(function (a, b) { return a.date - b.date });

  function selectClass(c) { setSel(c); setMarks({}); setExtras([]); setDone(false); setMsg(""); setSearch("") }
  function toggleMark(id, val) { setMarks(function (p) { var o = Object.assign({}, p); o[id] = val; return o }) }
  function addExtra(al) { if (extras.find(function (e) { return e.id === al.id })) return; setExtras(function (p) { return p.concat(al) }); setMarks(function (p) { var o = Object.assign({}, p); o[al.id] = true; return o }); setSearch("") }

  function canSubmit() {
    if (!sel) return false;
    var allIds = sel.alumnos.map(function (a) { return a.alumno.id }).concat(extras.map(function (e) { return e.id }));
    return allIds.every(function (id) { return marks[id] === true || marks[id] === false })
  }

  async function submitLista() {
    if (!canSubmit() || busy) return;
    setBusy(true);
    var faltasSinAviso = []; var clasesExtra = []; var presentes = [];

    for (var ai = 0; ai < sel.alumnos.length; ai++) {
      var a = sel.alumnos[ai];
      if (marks[a.alumno.id] === false) {
        faltasSinAviso.push(a.alumno);
        var mk = sel.date.getFullYear() + "-" + sel.date.getMonth();
        await supa("cancelaciones", "POST", "", { alumno_id: a.alumno.id, fecha_iso: sel.iso, mes_key: mk, sin_recuperacion: true, sin_aviso: true, is_extra: a.tipo === "recuperacion" });
        await supa("historial", "POST", "", { alumno_id: a.alumno.id, accion: "⛔ Falta sin aviso " + fmtDateShort(sel.date) });
      } else presentes.push(a.alumno);
    }

    for (var ei = 0; ei < extras.length; ei++) {
      var al = extras[ei];
      if (marks[al.id] === true) {
        clasesExtra.push(al);
        var mk2 = sel.date.getFullYear() + "-" + sel.date.getMonth();
        await supa("clases_extra", "POST", "", { alumno_id: al.id, fecha_iso: sel.iso, mes_key: mk2, tipo: "extra" });
        await supa("historial", "POST", "", { alumno_id: al.id, accion: "📌 Clase extra " + fmtDateShort(sel.date) });
      }
    }

    await supa("listas", "POST", "", { profe: profe.nombre, sede: profe.sede, dia: sel.dia, hora: sel.hora, fecha_iso: sel.iso });
    await refreshData();
    setBusy(false);

    var m2 = "✓ Lista enviada\n\n";
    m2 += "Presentes: " + presentes.length + (clasesExtra.length ? " + " + clasesExtra.length + " extra" : "") + "\n";
    if (faltasSinAviso.length) m2 += "Faltas sin aviso: " + faltasSinAviso.map(function (a) { return a.nombre }).join(", ") + "\n";
    if (clasesExtra.length) m2 += "Clase extra: " + clasesExtra.map(function (a) { return a.nombre }).join(", ");
    setMsg(m2); setDone(true);
  }

  var bS = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: white, color: navy, border: "1px solid " + grayBlue, textAlign: "left" };
  if (done) return (<div style={{ padding: 20 }}><div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, border: "1px solid #b5c48a", whiteSpace: "pre-wrap", fontSize: 14, fontFamily: ft, color: "#5a6a2a", lineHeight: 1.6 }}>{msg}</div><button onClick={function () { setSel(null); setDone(false); setMsg("") }} style={Object.assign({}, bS, { marginTop: 12 })}>{"← Volver"}</button></div>);

  if (!sel) return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 14px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Tomar lista</h3>
      {clases.length === 0 ? <p style={{ color: grayWarm, fontFamily: ft, fontSize: 14 }}>No hay clases pendientes de lista.</p> :
        clases.map(function (c, i) { return (<button key={i} onClick={function () { selectClass(c) }} style={Object.assign({}, bS, { marginBottom: 8 })}>{fmtDate(c.date) + " — " + c.alumnos.length + " alumno" + (c.alumnos.length !== 1 ? "s" : "")}</button>) })}</div>);

  var allIds = sel.alumnos.map(function (a) { return a.alumno.id }).concat(extras.map(function (e) { return e.id }));
  var allMarked = allIds.every(function (id) { return marks[id] === true || marks[id] === false });
  var searchResults = search.length >= 2 ? als.filter(function (a) { return a.nombre.toLowerCase().includes(search.toLowerCase()) && a.sede === profe.sede && !sel.alumnos.find(function (s) { return s.alumno.id === a.id }) && !extras.find(function (e) { return e.id === a.id }) }) : [];

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 4px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 16 }}>{fmtDate(sel.date)}</h3>
      <p style={{ margin: "0 0 16px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{sel.alumnos.length + " esperado" + (sel.alumnos.length !== 1 ? "s" : "")}</p>
      {sel.alumnos.map(function (a) {
        var id = a.alumno.id; var v = marks[id]; return (
          <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", marginBottom: 6, borderRadius: 10, border: "1px solid " + grayBlue, background: v === true ? "#f0f5e8" : v === false ? "#fef2f2" : white }}>
            <span style={{ fontFamily: ft, fontSize: 14, color: navy, fontWeight: 500 }}>{a.alumno.nombre}<span style={{ color: grayWarm, fontSize: 12 }}>{a.tipo === "recuperacion" ? " (recup)" : ""}</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function () { toggleMark(id, true) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === true ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: v === true ? "#5a6a2a" : white, color: v === true ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>{"✓"}</button>
              <button onClick={function () { toggleMark(id, false) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === false ? "2px solid #991b1b" : "1px solid " + grayBlue, background: v === false ? "#991b1b" : white, color: v === false ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>{"✗"}</button>
            </div>
          </div>)
      })}
      {extras.map(function (al) {
        var id = al.id; var v = marks[id]; return (
          <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", marginBottom: 6, borderRadius: 10, border: "1px solid #e8d4b0", background: "#fdf6ec" }}>
            <span style={{ fontFamily: ft, fontSize: 14, color: copper, fontWeight: 500 }}>{al.nombre} <span style={{ fontSize: 12 }}>(extra)</span></span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function () { toggleMark(id, true) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === true ? "2px solid #5a6a2a" : "1px solid " + grayBlue, background: v === true ? "#5a6a2a" : white, color: v === true ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>{"✓"}</button>
              <button onClick={function () { toggleMark(id, false) }} style={{ width: 36, height: 36, borderRadius: 8, border: v === false ? "2px solid #991b1b" : "1px solid " + grayBlue, background: v === false ? "#991b1b" : white, color: v === false ? white : navy, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>{"✗"}</button>
            </div>
          </div>)
      })}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <input value={search} onChange={function (e) { setSearch(e.target.value) }} placeholder="Buscar alumno extra..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid " + grayBlue, fontSize: 14, fontFamily: ft, outline: "none", background: cream, boxSizing: "border-box" }} />
        {searchResults.map(function (a) { return (<button key={a.id} onClick={function () { addExtra(a) }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", marginTop: 4, borderRadius: 8, border: "1px solid #e8d4b0", background: "#fdf6ec", cursor: "pointer", fontFamily: ft, fontSize: 13, color: copper }}>{"+ " + a.nombre}</button>) })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={function () { setSel(null); setMarks({}); setExtras([]) }} style={Object.assign({}, bS, { flex: 1 })}>{"← Volver"}</button>
        <button disabled={!allMarked || busy} onClick={submitLista} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, cursor: allMarked && !busy ? "pointer" : "default", fontSize: 14, fontWeight: 700, fontFamily: ft, background: allMarked && !busy ? copper : cream, color: allMarked && !busy ? white : grayWarm, border: "none" }}>{busy ? "Enviando..." : "Enviar lista"}</button>
      </div>
    </div>);
}

// ====== ENCARGADA VISTA SEDE ======
function EncargadaVista(props) {
  var profe = props.profe, als = props.als;
  var sede = profe.sedeEncargada;
  var now = new Date(); var year = now.getFullYear(); var month = now.getMonth();
  var sched = SCHED[sede] || [];
  var clases = [];
  sched.forEach(function (h) {
    var parts = h.split("-"); var dia = parts[0], hora = parts[1];
    var dates = classesInMonth(dia, hora, month, year);
    dates.forEach(function (dt) { var expected = getCupoForSlot(als, sede, dia, hora, dt); clases.push({ date: dt, dia: dia, hora: hora, alumnos: expected.ocupado, past: dt < now }) })
  });
  clases.sort(function (a, b) { return a.date - b.date });
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 4px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Vista sede: {sede}</h3>
      <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{MN[month] + " " + year + " — Todas las clases"}</p>
      {clases.map(function (c, i) { return (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", marginBottom: 6, borderRadius: 10, border: "1px solid " + grayBlue, background: c.past ? "#f5f5f0" : white, opacity: c.past ? 0.5 : 1 }}><span style={{ fontFamily: ft, fontSize: 14, color: navy, fontWeight: 500 }}>{fmtDateShort(c.date)}</span><span style={{ fontFamily: ft, fontSize: 13, color: copper, fontWeight: 600 }}>{c.alumnos + " alumno" + (c.alumnos !== 1 ? "s" : "")}</span></div>) })}</div>);
}

// ====== ALUMNO CALENDAR ======
function AlumnoCal(props) {
  var al = props.al;
  var pm = Object.keys(al.mp || {});
  var now = new Date(); var curMk = now.getFullYear() + "-" + now.getMonth();
  var mesActualPagado = (al.mp || {})[curMk];
  var arrastre = calcArrastre(al);

  if (!pm.length) return (<div style={{ padding: 36, textAlign: "center" }}><p style={{ fontSize: 44, opacity: 0.5 }}>{"🔒"}</p><h3 style={{ color: navy, fontFamily: ft }}>Calendario no disponible</h3><p style={{ color: grayWarm, fontSize: 14, fontFamily: ft }}>No tenés meses pagados.</p></div>);
  var all = [];
  pm.forEach(function (mk) { var p = mk.split("-").map(Number); var mc = classesInMonth(al.turno.dia, al.turno.hora, p[1], p[0]); var cm = (al.canc || []).filter(function (c) { return c.mk === mk }); mc.forEach(function (d) { if (!cm.some(function (c) { return c.iso === d.toISOString() })) all.push({ date: d, extra: false, tot: mc.length }) }) });
  (al.ex || []).forEach(function (e) { all.push({ date: new Date(e.date), extra: true, tot: 0 }) });
  all.sort(function (a, b) { return a.date - b.date });
  var statsBlocks = pm.map(function (mk) { var stats = getMonthStats(al, mk); var p = mk.split("-").map(Number); return { label: MN[p[1]] + " " + p[0], stats: stats, mk: mk } });
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: "0 0 2px", color: navy, fontFamily: ft, fontWeight: 700, fontSize: 18 }}>Tus clases</h3>
      <p style={{ margin: "0 0 14px", color: grayWarm, fontSize: 13, fontFamily: ft }}>{al.turno.dia + " " + al.turno.hora + " · " + al.sede}</p>
      {arrastre > 0 && mesActualPagado ? <div style={{ background: "#f0f5e8", border: "1px solid #b5c48a", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#5a6a2a", fontFamily: ft }}>{"🔄 Tenés " + arrastre + " clase(s) de arrastre del mes anterior"}</div> : null}
      {statsBlocks.map(function (sb) { return (<div key={sb.mk} style={{ background: "#f8f6f2", borderRadius: 10, padding: "12px 14px", marginBottom: 14, border: "1px solid " + grayBlue }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 14 }}>{sb.label}</span><span style={{ fontSize: 12, color: copper, fontFamily: ft, fontWeight: 600 }}>{sb.stats.clasesEfectivas + "/" + CLASES_BASE + " clases"}</span></div>{sb.stats.pendientes > 0 ? <div style={{ background: "#fdf6ec", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: copper, fontFamily: ft, border: "1px solid #e8d4b0" }}>{"🔄 " + sb.stats.pendientes + " clase(s) pendiente(s) de recuperar"}</div> : null}{sb.stats.is5 && sb.stats.cancTotal === 0 ? <div style={{ fontSize: 12, color: olive, fontFamily: ft, marginTop: 4 }}>{"✦ 5ta clase regalo activa"}</div> : null}</div>) })}
      {al.reg > 0 ? <div style={{ background: "#fdf6ec", border: "1px solid #e8d4b0", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: copper, fontFamily: ft }}>{"🎁 Tenés " + al.reg + " clase(s) de regalo"}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {all.map(function (c, i) { var h = hrsUntil(c.date); var past = h < 0; return (<div key={i} style={{ padding: "14px 16px", borderRadius: 10, background: past ? cream : white, border: "1px solid " + (past ? grayBlue : gold), opacity: past ? 0.45 : 1 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 600, color: navy, fontFamily: ft, fontSize: 14 }}>{fmtDate(c.date)}</span>{c.extra ? <span style={{ fontSize: 11, background: olive, color: white, padding: "2px 8px", borderRadius: 8, fontFamily: ft }}>recuperación</span> : null}</div>{!past && h < 24 ? <div style={{ fontSize: 11, color: copper, marginTop: 5, fontFamily: ft }}>{"⚠ Menos de 24h"}</div> : null}</div>) })}</div></div>);
}

// ====== MINI CALENDAR COMPONENT ======
function MiniCalendar(props) {
  var onSelect = props.onSelect, selectedDate = props.selectedDate, availableDates = props.availableDates;
  var _month = useState(function () { var n = new Date(); return { m: n.getMonth(), y: n.getFullYear() } }), cm = _month[0], setCm = _month[1];
  var first = new Date(cm.y, cm.m, 1); var startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  var daysInMonth = new Date(cm.y, cm.m + 1, 0).getDate();
  var cells = [];
  for (var i = 0; i < startDay; i++) cells.push(null);
  for (var d = 1; d <= daysInMonth; d++) cells.push(d);
  var dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  var availSet = {};
  (availableDates || []).forEach(function (dt) { var k = dt.getFullYear() + "-" + dt.getMonth() + "-" + dt.getDate(); availSet[k] = true });
  function isSel(d) { if (!selectedDate || !d) return false; return selectedDate.getDate() === d && selectedDate.getMonth() === cm.m && selectedDate.getFullYear() === cm.y }
  function hasSlots(d) { if (!d) return false; return availSet[cm.y + "-" + cm.m + "-" + d] }
  function prev() { setCm(function (p) { return p.m === 0 ? { m: 11, y: p.y - 1 } : { m: p.m - 1, y: p.y } }) }
  function next() { setCm(function (p) { return p.m === 11 ? { m: 0, y: p.y + 1 } : { m: p.m + 1, y: p.y } }) }
  return (
    <div style={{ background: white, borderRadius: 12, border: "1px solid " + grayBlue, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>{"‹"}</button>
        <span style={{ fontWeight: 700, color: navy, fontFamily: ft, fontSize: 15 }}>{MN[cm.m] + " " + cm.y}</span>
        <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: navy, padding: "4px 8px" }}>{"›"}</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center" }}>
        {dayLabels.map(function (l) { return <div key={l} style={{ fontSize: 11, color: grayWarm, fontFamily: ft, fontWeight: 600, padding: 4 }}>{l}</div> })}
        {cells.map(function (d, i) {
          var sel = isSel(d); var avail = hasSlots(d); var today = new Date(); var isToday = d && today.getDate() === d && today.getMonth() === cm.m && today.getFullYear() === cm.y;
          return (<div key={i} onClick={function () { if (d) { var dt = new Date(cm.y, cm.m, d); onSelect(dt) } }} style={{ padding: "8px 2px", borderRadius: 8, cursor: d ? "pointer" : "default", background: sel ? copper : avail ? "#f0f5e8" : "transparent", color: sel ? white : avail ? "#5a6a2a" : d ? navy : "transparent", fontWeight: sel || isToday ? 700 : 400, fontSize: 13, fontFamily: ft, border: isToday && !sel ? "1px solid " + copper : "1px solid transparent" }}>{d || ""}</div>)
        })}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, fontFamily: ft, color: grayWarm }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#f0f5e8", marginRight: 4, verticalAlign: "middle" }} />Con horarios</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: copper, marginRight: 4, verticalAlign: "middle" }} />Seleccionado</span>
      </div>
    </div>);
}

// ====== ALUMNO FLOW ======
function AlumnoFlow(props) {
  var al = props.al, allAls = props.allAls, refreshData = props.refreshData;
  var pm = Object.keys(al.mp || {});
  var now = new Date(); var curMk = now.getFullYear() + "-" + now.getMonth();
  var mesActualPagado = (al.mp || {})[curMk];
  var arrastre = calcArrastre(al);

  var _st = useState("menu"), step = _st[0], setStep = _st[1];
  var _sel = useState(null), sel = _sel[0], setSel = _sel[1];
  var _cm = useState(""), cMsg = _cm[0], setCMsg = _cm[1];
  var _cr = useState(true), canRec = _cr[0], setCanRec = _cr[1];
  var _busy = useState(false), busy = _busy[0], setBusy = _busy[1];
  var _calDate = useState(null), calDate = _calDate[0], setCalDate = _calDate[1];

  useEffect(function () { setStep("menu"); setSel(null); setCMsg(""); setCalDate(null) }, [al.id]);

  var curStats = mesActualPagado ? getMonthStats(al, curMk) : null;
  var nd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  var nxtMk = nd.getFullYear() + "-" + nd.getMonth();
  var nxtStats = (al.mp || {})[nxtMk] ? getMonthStats(al, nxtMk) : null;
  var totalPendientes = 0;
  if (curStats) totalPendientes += curStats.pendientes;
  if (nxtStats) totalPendientes += nxtStats.pendientes;
  totalPendientes += arrastre; // Sumar arrastre

  function getUp() {
    var cls = [];
    pm.forEach(function (mk) {
      var p = mk.split("-").map(Number);
      var mc = classesInMonth(al.turno.dia, al.turno.hora, p[1], p[0]);
      var cm2 = (al.canc || []).filter(function (c) { return c.mk === mk });
      mc.forEach(function (d) { if (hrsUntil(d) > 0 && !cm2.some(function (c) { return c.iso === d.toISOString() })) cls.push({ date: d, mk: mk, tot: mc.length, cc: cm2.length }) })
    });
    // Include recuperaciones that can be cancelled
    (al.ex || []).forEach(function (e) {
      var d = new Date(e.date);
      if (hrsUntil(d) > 0) {
        var wasCancelled = (al.canc || []).some(function (c) { return c.iso === e.date && c.isExtra });
        if (!wasCancelled) cls.push({ date: d, mk: e.mk, isExtra: true })
      }
    });
    return cls.sort(function (a, b) { return a.date - b.date })
  }

  function getRM() { return [curMk, nxtMk].filter(function (k) { return (al.mp || {})[k] }) }

  function getAllAvailableSlots() {
    var sched = SCHED[al.sede]; if (!sched) return [];
    var vm = getRM(); if (!vm.length) return [];
    var alts = []; var isPalermo = al.sede === "Palermo";
    sched.forEach(function (key) {
      var parts = key.split("-");
      vm.forEach(function (mk) {
        var p = mk.split("-").map(Number);
        classesInMonth(parts[0], parts[1], p[1], p[0]).forEach(function (d) {
          if (hrsUntil(d) > 24) {
            if (isPalermo) { var fijos = countFijosForSlot(allAls, al.sede, parts[0], parts[1], d); if (fijos === 0) return }
            var cupo = getCupoForSlot(allAls, al.sede, parts[0], parts[1], d);
            if (cupo.libre > 0) alts.push({ date: d, mk: mk, cupoLibre: cupo.libre, dia: parts[0], hora: parts[1] })
          }
        })
      })
    });
    var seen = {}; return alts.filter(function (a) { var k = a.date.toISOString(); if (seen[k]) return false; seen[k] = true; return true }).sort(function (a, b) { return a.date - b.date });
  }

  function getSlotsForDate(date) {
    if (!date) return [];
    return getAllAvailableSlots().filter(function (s) { return s.date.toDateString() === date.toDateString() })
  }

  function getAvailableDates() {
    var slots = getAllAvailableSlots(); var seen = {}; var dates = [];
    slots.forEach(function (s) { var k = s.date.toDateString(); if (!seen[k]) { seen[k] = true; dates.push(s.date) } });
    return dates;
  }

  async function doCanc(ci) {
    setBusy(true);
    if (ci.isExtra) {
      await supa("clases_extra", "DELETE", "?alumno_id=eq." + al.id + "&fecha_iso=eq." + encodeURIComponent(ci.date.toISOString()));
      await supa("historial", "POST", "", { alumno_id: al.id, accion: "❌ Canceló recup " + fmtDate(ci.date) });
      await refreshData(); setBusy(false);
      setCanRec(true); setCMsg("");
    } else {
      var stats = getMonthStats(al, ci.mk); var noR = stats.is5 && stats.cancTotal === 0;
      await supa("cancelaciones", "POST", "", { alumno_id: al.id, fecha_iso: ci.date.toISOString(), mes_key: ci.mk, sin_recuperacion: noR, sin_aviso: false, is_extra: false });
      await supa("historial", "POST", "", { alumno_id: al.id, accion: (noR ? "❌(5ta) " : "❌ ") + fmtDate(ci.date) });
      await refreshData(); setBusy(false);
      if (noR) { setCanRec(false); setCMsg("¡Gracias por cancelar tu clase! Te comentamos que esta clase no podrías recuperarla ya que era tu 5ta clase, que es de regalo siempre y cuando no faltes a ninguna clase en el mes.\n\nEso sí, si cancelás alguna de tus 4 clases restantes con 24 hs de antelación, podrás recuperarla sin problema.") }
      else { setCanRec(true); setCMsg("") }
    }
  }

  async function doResc(slot, gift) {
    setBusy(true);
    await supa("clases_extra", "POST", "", { alumno_id: al.id, fecha_iso: slot.date.toISOString(), mes_key: slot.mk, tipo: gift ? "regalo" : "recuperacion" });
    await supa("historial", "POST", "", { alumno_id: al.id, accion: (gift ? "🎁 " : "🔄 ") + fmtDate(slot.date) });
    if (gift) await supa("alumnos", "PATCH", "?id=eq." + al.id, { clase_regalo: Math.max(0, (al.reg || 0) - 1) });
    // Si usa arrastre, decrementar
    if (!gift && arrastre > 0 && curStats && curStats.pendientes === 0) {
      await supa("alumnos", "PATCH", "?id=eq." + al.id, { pend_arrastre: Math.max(0, (al.pendArrastre || 0) - 1) });
    }
    await refreshData(); setBusy(false);
  }

  async function doPayNotif() {
    setBusy(true);
    await supa("admin_notifs", "POST", "", { tipo: "pago", nombre: al.nombre, sede: al.sede, turno: al.turno.dia + " " + al.turno.hora });
    setBusy(false);
  }

  function reset() { setStep("menu"); setSel(null); setCMsg(""); setCanRec(true); setCalDate(null) }

  var up = getUp();
  var bS = function (dis) { return { padding: "12px 18px", borderRadius: 10, cursor: dis ? "default" : "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: dis ? cream : white, color: dis ? grayWarm : navy, border: "1px solid " + grayBlue, textAlign: "left" } };
  var bD = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5", textAlign: "left" };
  var bG = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: "#fdf6ec", color: copper, border: "1px solid #e8d4b0", textAlign: "left" };
  var bP = { padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%", fontFamily: ft, background: copper, color: white, border: "none", textAlign: "left" };

  // === IMPAGO: puede cancelar pero NO recuperar/reagendar ===
  if (!mesActualPagado) {
    var hasFutureClasses = up.length > 0;
    return (
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", height: "100%" }}>
        <p style={{ margin: 0, color: navy, fontWeight: 700, fontSize: 17, fontFamily: ft }}>{"Hola " + al.nombre.split(" ")[0] + " ✦"}</p>
        {/* Cartel de impago */}
        <div style={{ background: "#fef2f2", borderRadius: 12, padding: 16, border: "1px solid #fca5a5" }}>
          <p style={{ margin: 0, color: "#991b1b", fontSize: 14, fontFamily: ft, lineHeight: 1.6 }}>
            {"No obtuvimos tu pago todavía. Podés cancelar clases, pero no reagendar una nueva hasta regularizar el pago."}
          </p>
        </div>
        {/* Cancelar clase */}
        {step === "menu" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hasFutureClasses ? <button onClick={function () { setStep("cp") }} style={bS(false)}>{"❌  Cancelar una clase"}</button> : null}
            <button disabled style={bS(true)}>{"🔄  Recuperar una clase (pago pendiente)"}</button>
            <button onClick={function () { doPayNotif(); setStep("ps") }} disabled={busy} style={bP}>{busy ? "Enviando..." : "💳  Ya hice el pago"}</button>
          </div>
        ) : null}
        {step === "ps" ? (<div style={{ background: "#f0f5e8", borderRadius: 10, padding: 16 }}><p style={{ margin: 0, color: "#5a6a2a", fontSize: 14, fontFamily: ft }}>{"👍 ¡Gracias! Le avisamos al equipo. Una vez confirmado, se habilitarán tus reservas."}</p><div style={{ marginTop: 12 }}><button onClick={function () { setStep("menu") }} style={bS(false)}>{"← Volver"}</button></div></div>) : null}
        {step === "cp" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"¿Qué clase querés cancelar?"}</p>
            {up.filter(function(c){return !c.isExtra}).map(function (cl, i) {
              var h = hrsUntil(cl.date); var blocked = h < 24;
              return <button key={i} disabled={blocked} onClick={function () { if (!blocked) { setSel(cl); setStep("cc") } }} style={bS(blocked)}>{fmtDate(cl.date) + (blocked ? "  ·  ⚠ menos de 24h" : "")}</button>
            })}
            {up.filter(function (c) { return !c.isExtra && hrsUntil(c.date) < 24 && hrsUntil(c.date) > 0 }).length > 0 ? (
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: 12, fontSize: 13, color: "#991b1b", fontFamily: ft, border: "1px solid #fca5a5", lineHeight: 1.5 }}>
                {"Lo siento mucho, no podés cancelar esas clases ya que faltan menos de 24 hs."}
              </div>) : null}
            <button onClick={reset} style={bS(false)}>{"← Volver al menú"}</button>
          </div>) : null}
        {step === "cc" && sel ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"¿Confirmás cancelar?"}</p>
            <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}</div>
            <div style={{ background: "#fef2f2", borderRadius: 10, padding: 12, fontSize: 13, color: "#991b1b", fontFamily: ft, border: "1px solid #fca5a5", lineHeight: 1.5 }}>
              {"⚠ Recordá que no podrás recuperar esta clase hasta que se confirme tu pago."}
            </div>
            <button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd_nopay") }) }} style={bD}>{busy ? "Cancelando..." : "Sí, cancelar"}</button>
            <button onClick={function () { setStep("cp") }} style={bS(false)}>{"No, volver"}</button>
          </div>) : null}
        {step === "cd_nopay" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}>
              <p style={{ fontSize: 36, margin: 0 }}>{"✓"}</p>
              <p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>Clase cancelada</p>
              <p style={{ margin: "4px 0 0", color: grayWarm, fontSize: 13, fontFamily: ft }}>{"Podrás recuperarla una vez confirmado tu pago."}</p></div>
            <button onClick={reset} style={bS(false)}>{"Volver al menú"}</button>
          </div>) : null}
      </div>);
  }

  // === MES PAGADO: flujo normal ===
  var pendBadge = totalPendientes > 0 ? (<div style={{ background: "#fdf6ec", borderRadius: 10, padding: "10px 14px", border: "1px solid #e8d4b0", marginBottom: 4 }}><span style={{ fontSize: 14, color: copper, fontFamily: ft, fontWeight: 600 }}>{"🔄 " + totalPendientes + " clase(s) pendiente(s) de recuperar" + (arrastre > 0 ? " (" + arrastre + " de arrastre)" : "")}</span></div>) : null;
  var availDates = getAvailableDates();
  var slotsForDate = getSlotsForDate(calDate);

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", height: "100%" }}>
      {step === "menu" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, color: navy, fontWeight: 700, fontSize: 17, fontFamily: ft }}>{"Hola " + al.nombre.split(" ")[0] + " ✦"}</p>
          <p style={{ margin: "0 0 4px", color: grayWarm, fontSize: 14, fontFamily: ft }}>{"¿Qué necesitás?"}</p>
          {pendBadge}
          <button onClick={function () { setStep("cp") }} style={bS(false)}>{"❌  Cancelar una clase"}</button>
          {totalPendientes > 0 ? <button onClick={function () { setStep("rp"); setCalDate(null) }} style={bS(false)}>{"🔄  Recuperar una clase (" + totalPendientes + " pendiente" + (totalPendientes > 1 ? "s" : "") + ")"}</button>
            : <button disabled style={bS(true)}>{"🔄  Recuperar una clase (0 pendientes)"}</button>}
          {al.reg > 0 ? <button onClick={function () { setStep("go"); setCalDate(null) }} style={bG}>{"🎁  Usar clase de regalo (" + al.reg + ")"}</button> : null}
        </div>) : null}

      {step === "cp" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"¿Qué clase querés cancelar?"}</p>
          {up.map(function (cl, i) {
            var h = hrsUntil(cl.date); var blocked = h < 24;
            return <button key={i} disabled={blocked} onClick={function () { if (!blocked) { setSel(cl); setStep("cc") } }} style={bS(blocked)}>{fmtDate(cl.date) + (cl.isExtra ? " (recup)" : "") + (blocked ? "  ·  ⚠ menos de 24h" : "")}</button>
          })}
          {up.filter(function (c) { return hrsUntil(c.date) < 24 && hrsUntil(c.date) > 0 }).length > 0 ? (
            <div style={{ background: "#fef2f2", borderRadius: 10, padding: 12, fontSize: 13, color: "#991b1b", fontFamily: ft, border: "1px solid #fca5a5", lineHeight: 1.5 }}>
              {"Lo siento mucho, no podés cancelar esas clases ya que faltan menos de 24 hs."}
            </div>) : null}
          <button onClick={reset} style={bS(false)}>{"← Volver al menú"}</button>
        </div>) : null}

      {step === "cc" && sel ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"¿Confirmás cancelar?"}</p>
          <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 14, textAlign: "center", fontSize: 15, color: copper, fontWeight: 600, fontFamily: ft, border: "1px solid #e8d4b0" }}>{fmtDate(sel.date)}{sel.isExtra ? " (recuperación)" : ""}</div>
          {!sel.isExtra && (function () { var stats = getMonthStats(al, sel.mk); return stats.is5 && stats.cancTotal === 0 ? (<div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0", lineHeight: 1.5 }}>{"⚠ Este mes tiene 5 clases. Si cancelás esta, no podrás recuperarla (5ta regalo)."}</div>) : null })()}
          <button disabled={busy} onClick={function () { doCanc(sel).then(function () { setStep("cd") }) }} style={bD}>{busy ? "Cancelando..." : "Sí, cancelar"}</button>
          <button onClick={function () { setStep("cp") }} style={bS(false)}>{"No, volver"}</button>
        </div>) : null}

      {step === "cd" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {canRec ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}>
                <p style={{ fontSize: 36, margin: 0 }}>{"✓"}</p>
                <p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>Clase cancelada</p>
                <p style={{ margin: "4px 0 0", color: grayWarm, fontSize: 13, fontFamily: ft }}>{"Podés recuperarla eligiendo un nuevo horario"}</p></div>
              <p style={{ margin: 0, color: navy, fontWeight: 600, fontFamily: ft, fontSize: 14 }}>{"¿Querés recuperarla ahora?"}</p>
              <MiniCalendar onSelect={setCalDate} selectedDate={calDate} availableDates={availDates} />
              {calDate ? (slotsForDate.length > 0 ? slotsForDate.map(function (s, i) { return <button key={i} disabled={busy} onClick={function () { doResc(s).then(function () { setStep("rd") }) }} style={bS(false)}>{s.hora + " (" + s.cupoLibre + " lugar" + (s.cupoLibre > 1 ? "es" : "") + ")"}</button> }) : <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0" }}>{"No hay opciones de clases para recuperar hoy"}</div>) : null}
              <button onClick={reset} style={bS(false)}>{"No, dejarlo así"}</button>
            </div>
          ) : (<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#fdf6ec", borderRadius: 12, padding: 20, border: "1px solid #e8d4b0" }}>
              <p style={{ fontSize: 32, margin: 0, textAlign: "center" }}>{"ℹ️"}</p>
              <p style={{ margin: "10px 0 0", color: navy, fontSize: 14, fontFamily: ft, lineHeight: 1.6 }}>{cMsg}</p></div>
            <button onClick={reset} style={bS(false)}>{"Entendido"}</button></div>)}
        </div>) : null}

      {step === "rp" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"Elegí un día para recuperar:"}</p>
          <p style={{ margin: 0, color: grayWarm, fontSize: 12, fontFamily: ft }}>{"Cupo máx: " + MAX_CUPO + " · Los días verdes tienen horarios disponibles"}</p>
          <MiniCalendar onSelect={setCalDate} selectedDate={calDate} availableDates={availDates} />
          {calDate ? (slotsForDate.length > 0 ? slotsForDate.map(function (s, i) { return <button key={i} disabled={busy} onClick={function () { doResc(s).then(function () { setStep("rd") }) }} style={bS(false)}>{s.hora + " (" + s.cupoLibre + " lugar" + (s.cupoLibre > 1 ? "es" : "") + ")"}</button> }) : <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0" }}>{"No hay opciones de clases para recuperar hoy"}</div>) : null}
          <button onClick={reset} style={bS(false)}>{"← Volver al menú"}</button>
        </div>) : null}

      {step === "rd" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#f0f5e8", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #b5c48a" }}>
            <p style={{ fontSize: 36, margin: 0 }}>{"✓"}</p>
            <p style={{ margin: "8px 0 0", color: navy, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>{"¡Clase recuperada!"}</p>
            <p style={{ margin: "4px 0 0", color: grayWarm, fontSize: 13, fontFamily: ft }}>Ya aparece en tu calendario</p></div>
          <button onClick={reset} style={bS(false)}>{"Volver al menú"}</button>
        </div>) : null}

      {step === "go" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, color: navy, fontWeight: 700, fontFamily: ft }}>{"🎁 Elegí un día para tu clase de regalo:"}</p>
          <MiniCalendar onSelect={setCalDate} selectedDate={calDate} availableDates={availDates} />
          {calDate ? (slotsForDate.length > 0 ? slotsForDate.map(function (s, i) { return <button key={i} disabled={busy} onClick={function () { doResc(s, true).then(function () { setStep("gd") }) }} style={bG}>{s.hora + " (" + s.cupoLibre + " lugar" + (s.cupoLibre > 1 ? "es" : "") + ")"}</button> }) : <div style={{ background: "#fdf6ec", borderRadius: 10, padding: 12, fontSize: 13, color: "#92651e", fontFamily: ft, border: "1px solid #e8d4b0" }}>{"No hay opciones de clases para recuperar hoy"}</div>) : null}
          <button onClick={reset} style={bS(false)}>{"← Volver al menú"}</button>
        </div>) : null}

      {step === "gd" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#fdf6ec", borderRadius: 12, padding: 20, textAlign: "center", border: "1px solid #e8d4b0" }}>
            <p style={{ fontSize: 36, margin: 0 }}>{"🎁"}</p>
            <p style={{ margin: "8px 0 0", color: copper, fontWeight: 700, fontFamily: ft, fontSize: 16 }}>{"¡Clase de regalo confirmada!"}</p>
            <p style={{ margin: "4px 0 0", color: grayWarm, fontSize: 13, fontFamily: ft }}>Ya aparece en tu calendario</p></div>
          <button onClick={reset} style={bS(false)}>{"Volver al menú"}</button>
        </div>) : null}
    </div>);
}

// ====== MAIN ======
export default function App() {
  var hash = useHash();
  var _als = useState([]), als = _als[0], setAls = _als[1];
  var _profes = useState([]), profes = _profes[0], setProfes = _profes[1];
  var _listas = useState([]), listas = _listas[0], setListas = _listas[1];
  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
  var _adminAuth = useState(false), adminAuth = _adminAuth[0], setAdminAuth = _adminAuth[1];
  var _adminView = useState("chat"), adminView = _adminView[0], setAdminView = _adminView[1];
  var _logged = useState(null), logged = _logged[0], setLogged = _logged[1];
  var _loggedProfe = useState(null), loggedProfe = _loggedProfe[0], setLoggedProfe = _loggedProfe[1];
  var _tab = useState("cal"), tab = _tab[0], setTab = _tab[1];

  var loadData = useCallback(async function () {
    try {
      var [alRows, profeRows, pagos, cancs, extras, listasRows] = await Promise.all([
        supa("alumnos", "GET", "?estado=eq.activo&order=nombre"),
        supa("profesoras", "GET", "?order=nombre"),
        supa("meses_pagados", "GET"),
        supa("cancelaciones", "GET"),
        supa("clases_extra", "GET"),
        supa("listas", "GET")
      ]);
      var builtAls = (alRows || []).map(function (r) { return buildAlumnoFromRow(r, pagos || [], cancs || [], extras || []) });
      var builtProfes = (profeRows || []).map(buildProfeFromRow);
      setAls(builtAls);
      setProfes(builtProfes);
      setListas(listasRows || []);
    } catch (e) { console.error("Load error:", e) }
    setLoading(false);
  }, []);

  useEffect(function () { loadData() }, [loadData]);

  async function refreshData() { await loadData() }

  var cur = logged ? als.find(function (a) { return a.id === logged.id }) : null;
  var curProfe = loggedProfe ? profes.find(function (p) { return p.id === loggedProfe.id }) : null;

  useEffect(function () { if (logged && cur) { setLogged(function (prev) { return prev && prev.id === cur.id ? cur : prev }) } }, [als]);

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
          {route === "admin" && adminAuth ? (
            <>
              {(adminView === "alumna" && logged) || (adminView === "profe" && loggedProfe) ?
                <button onClick={function () { setLogged(null); setLoggedProfe(null); setAdminView("chat") }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontFamily: ft, background: "rgba(255,255,255,0.1)", color: grayBlue, marginRight: 4 }}>{"← Panel"}</button> : null}
              <button onClick={function () { setAdminView("chat"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "chat")}>Admin</button>
              <button onClick={function () { setAdminView("alumna"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "alumna")}>Ver alumna</button>
              <button onClick={function () { setAdminView("profe"); setLogged(null); setLoggedProfe(null) }} style={adminBtnStyle(adminView === "profe")}>Ver profe</button>
              <button onClick={function () { setAdminAuth(false); setAdminView("chat"); setLogged(null); setLoggedProfe
