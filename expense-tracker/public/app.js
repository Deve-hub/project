var NAMES = {people: [], destinations: []};
var kind = "شراء", who = "", pin = "", timer = null, ROWS = [];
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function money(n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function when(iso) { try { return new Date(iso).toLocaleString("en-GB", {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false}); } catch (e) { return ""; } }
function parseAmount(raw) {
  var s = String(raw || "").trim();
  if (!s) return null;
  s = s.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
       .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; })
       .replace(/٫/g, ".").replace(/[٬,\s$]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  var n = parseFloat(s);
  return n > 0 ? n : NaN;
}
function toast(m) { var t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2500); }

function api(method, path, body) {
  var opts = {method: method, headers: {"Content-Type": "application/json"}};
  if (pin) opts.headers["X-Pin"] = pin;
  if (body) opts.body = JSON.stringify(body);
  return fetch(path, opts).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok) { var e = new Error(j.error || "خطأ في الاتصال"); e.status = r.status; throw e; }
      return j;
    });
  });
}

/* tabs */
document.querySelectorAll("nav button").forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll("nav button").forEach(function (x) { x.classList.toggle("on", x === b); });
    $("v-add").hidden = b.dataset.v !== "add";
    $("v-sum").hidden = b.dataset.v !== "sum";
    window.scrollTo(0, 0);
    if (b.dataset.v === "sum" && pin) refresh();
  };
});

/* add form */
document.querySelectorAll("#seg button").forEach(function (b) {
  b.onclick = function () {
    kind = b.dataset.k; who = "";
    document.querySelectorAll("#seg button").forEach(function (x) { x.classList.toggle("on", x === b); });
    $("itemF").hidden = kind !== "شراء";
    $("whoLab").textContent = kind === "شراء" ? "لمن؟" : kind === "تحصيل" ? "من مَن تم التحصيل؟" : "سُلِّم إلى";
    chips(); check();
  };
});
function chips() {
  var list = kind === "تسليم" ? NAMES.destinations : NAMES.people;
  $("chips").innerHTML = list.length ? list.map(function (n) {
    return '<button type="button" class="' + (n === who ? "on" : "") + '" data-n="' + esc(n) + '">' + esc(n) + "</button>";
  }).join("") : '<span class="hint">لا توجد أسماء بعد.</span>';
}
$("chips").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; who = b.dataset.n; chips(); check(); };
["item", "amt", "note"].forEach(function (id) { $(id).oninput = check; });
function check() {
  var a = parseAmount($("amt").value), h = $("amtHint");
  if (a === null) { h.className = "hint"; h.textContent = "تقبل الأرقام العربية ٠١٢٣ والإنجليزية 0123"; }
  else if (isNaN(a)) { h.className = "hint err"; h.textContent = "رقم غير صحيح. اكتب المبلغ بالأرقام فقط، مثل 80 أو ٨٠"; }
  else { h.className = "hint ok"; h.textContent = "سيُسجَّل: " + money(a); }
  $("save").disabled = !(who && a && !isNaN(a) && (kind !== "شراء" || $("item").value.trim()));
}
$("save").onclick = function () {
  var a = parseAmount($("amt").value);
  $("save").disabled = true; $("save").textContent = "جارٍ الحفظ…";
  api("POST", "/api/entries", {type: kind, name: who, item: $("item").value.trim(), amount: a, note: $("note").value.trim()})
    .then(function () {
      toast("تم الحفظ: " + kind + " " + money(a));
      $("amt").value = ""; $("item").value = ""; $("note").value = "";
      if (pin) refresh();
    })
    .catch(function (err) { toast("تعذّر الحفظ: " + err.message); })
    .then(function () { $("save").textContent = "حفظ"; check(); });
};
function loadNames() {
  api("GET", "/api/names").then(function (n) { NAMES = n; chips(); check(); })
    .catch(function () { $("chips").innerHTML = '<span class="hint err">تعذّر تحميل الأسماء. أعد فتح الصفحة.</span>'; });
}

/* summary */
$("pinGo").onclick = function () { pin = $("pin").value; refresh(); };
$("pin").onkeydown = function (e) { if (e.key === "Enter") $("pinGo").onclick(); };
function refresh() {
  $("live").textContent = "جارٍ التحديث…";
  api("GET", "/api/data").then(function (d) {
    $("pinPanel").hidden = true; $("pinErr").hidden = true; $("sum").hidden = false;
    try { localStorage.setItem("pin", pin); } catch (e) {}
    render(d);
    $("live").textContent = "مباشر · " + new Date().toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});
  }).catch(function (err) {
    $("live").textContent = "";
    if (err.status === 401) {
      pin = ""; $("pinPanel").hidden = false; $("pinErr").hidden = false; $("sum").hidden = true;
      try { localStorage.removeItem("pin"); } catch (e) {}
    } else toast("تعذّر تحميل الملخص");
  }).then(function () {
    clearTimeout(timer);
    if (pin) timer = setTimeout(function () { if (!$("v-sum").hidden) refresh(); }, 10000);
  });
}
function sum(a) { return a.reduce(function (t, e) { return t + (Number(e.amount) || 0); }, 0); }
function render(d) {
  NAMES = d.names; ROWS = d.rows; chips(); check();
  var P = ROWS.filter(function (e) { return e.type === "شراء"; });
  var C = ROWS.filter(function (e) { return e.type === "تحصيل"; });
  var H = ROWS.filter(function (e) { return e.type === "تسليم"; });
  var b = sum(P), rc = sum(C), h = sum(H);
  $("kB").textContent = money(b); $("kR").textContent = money(rc); $("kL").textContent = money(b - rc); $("kC").textContent = money(rc - h);

  var people = NAMES.people.slice();
  P.concat(C).forEach(function (e) { if (people.indexOf(e.name) < 0) people.push(e.name); });
  $("people").innerHTML = people.length ? people.map(function (n) {
    var pb = sum(P.filter(function (e) { return e.name === n; })), pr = sum(C.filter(function (e) { return e.name === n; })), left = pb - pr;
    var pct = pb > 0 ? Math.min(100, pr / pb * 100) : 0;
    var st = pb === 0 && pr === 0 ? '<span class="pill" style="background:var(--surface-2);color:var(--muted)">لا مشتريات</span>'
      : left > 0.004 ? '<span class="pill owe">عليه مبلغ</span>' : '<span class="pill paid">مدفوع بالكامل</span>';
    return '<div class="row"><span class="nm">' + esc(n) + "</span>" + st +
      '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
      '<span class="figs"><span>المشتريات <b class="num">' + money(pb) + '</b></span><span>المحصّل <b class="num">' + money(pr) + '</b></span><span class="left">المتبقي <b class="num">' + money(Math.max(0, left)) + "</b></span></span></div>";
  }).join("") : '<div class="empty">لا توجد أسماء بعد</div>';

  var dests = NAMES.destinations.slice();
  H.forEach(function (e) { if (dests.indexOf(e.name) < 0) dests.push(e.name); });
  $("dest").innerHTML = dests.map(function (n) {
    var a = sum(H.filter(function (e) { return e.name === n; })), pct = rc > 0 ? Math.min(100, a / rc * 100) : 0;
    return '<div class="row"><span>' + esc(n) + '</span><span class="num">' + money(a) + '</span><span class="bar d"><span style="width:' + pct + '%"></span></span></div>';
  }).join("") + '<div class="total"><span>النقد المتبقي لدى المحصِّل</span><span class="num">' + money(rc - h) + "</span></div>";

  var tagOf = {"شراء": "p", "تحصيل": "c", "تسليم": "h"};
  var recent = ROWS.slice().reverse().slice(0, 100);
  $("log").innerHTML = recent.length ? recent.map(function (r) {
    var t = r.type === "شراء" ? esc(r.name) + " · " + esc(r.item) : r.type === "تحصيل" ? "من " + esc(r.name) : "إلى " + esc(r.name);
    return '<div class="entry"><span class="tag ' + (tagOf[r.type] || "p") + '">' + esc(r.type) + "</span><span>" + t + '</span><span class="num">' + money(r.amount) + "</span>" +
      '<span class="m"><span class="num">' + when(r.at) + "</span>" + (r.note ? " · " + esc(r.note) : "") +
      ' · <button class="del" type="button" data-id="' + r.id + '">حذف</button></span></div>';
  }).join("") : '<div class="empty">لا توجد عمليات بعد</div>';

  renderNames();
}

$("log").onclick = function (e) {
  var b = e.target.closest("button.del"); if (!b) return;
  if (!b.classList.contains("confirm")) {
    b.classList.add("confirm"); b.textContent = "تأكيد الحذف";
    setTimeout(function () { if (b.isConnected) { b.classList.remove("confirm"); b.textContent = "حذف"; } }, 3000);
    return;
  }
  api("DELETE", "/api/entries/" + b.dataset.id).then(function () { toast("تم الحذف"); refresh(); })
    .catch(function (err) { toast("تعذّر الحذف: " + err.message); });
};

/* names */
function renderNames() {
  function row(n, k) { return '<div><span>' + esc(n) + '</span><button type="button" data-k="' + k + '" data-n="' + esc(n) + '">إزالة</button></div>'; }
  $("peopleList").innerHTML = NAMES.people.map(function (n) { return row(n, "people"); }).join("") || '<span class="hint">لا توجد أسماء</span>';
  $("destList").innerHTML = NAMES.destinations.map(function (n) { return row(n, "destinations"); }).join("") || '<span class="hint">لا توجد جهات</span>';
}
function saveNames(next) {
  api("POST", "/api/names", next).then(function (n) { NAMES = n; renderNames(); chips(); toast("تم حفظ الأسماء"); refresh(); })
    .catch(function (err) { toast("تعذّر الحفظ: " + err.message); });
}
function addName(k, input) {
  var v = $(input).value.trim(); if (!v) return;
  if (NAMES[k].indexOf(v) >= 0) { toast("الاسم موجود"); return; }
  $(input).value = "";
  var next = {people: NAMES.people.slice(), destinations: NAMES.destinations.slice()};
  next[k].push(v); saveNames(next);
}
$("addPerson").onclick = function () { addName("people", "newPerson"); };
$("addDest").onclick = function () { addName("destinations", "newDest"); };
$("newPerson").onkeydown = function (e) { if (e.key === "Enter") addName("people", "newPerson"); };
$("newDest").onkeydown = function (e) { if (e.key === "Enter") addName("destinations", "newDest"); };
document.addEventListener("click", function (e) {
  var b = e.target.closest(".namelist button[data-k]"); if (!b) return;
  var next = {people: NAMES.people.slice(), destinations: NAMES.destinations.slice()};
  next[b.dataset.k] = next[b.dataset.k].filter(function (n) { return n !== b.dataset.n; });
  saveNames(next);
});

/* Excel export */
function loadXLSX() {
  return new Promise(function (ok, bad) {
    if (window.XLSX) return ok(window.XLSX);
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = function () { ok(window.XLSX); }; s.onerror = bad; document.head.appendChild(s);
  });
}
$("exportBtn").onclick = function () {
  loadXLSX().then(function (X) {
    var P = ROWS.filter(function (e) { return e.type === "شراء"; }), C = ROWS.filter(function (e) { return e.type === "تحصيل"; }), H = ROWS.filter(function (e) { return e.type === "تسليم"; });
    var people = NAMES.people.slice(); P.concat(C).forEach(function (e) { if (people.indexOf(e.name) < 0) people.push(e.name); });
    var s = [["الشخص", "المشتريات", "المحصّل", "المتبقي"]];
    people.forEach(function (n) { var b = sum(P.filter(function (e) { return e.name === n; })), r = sum(C.filter(function (e) { return e.name === n; })); s.push([n, b, r, b - r]); });
    s.push(["الإجمالي", sum(P), sum(C), sum(P) - sum(C)], [], ["سُلِّم إلى", "المبلغ"]);
    var dests = NAMES.destinations.slice(); H.forEach(function (e) { if (dests.indexOf(e.name) < 0) dests.push(e.name); });
    dests.forEach(function (n) { s.push([n, sum(H.filter(function (e) { return e.name === n; }))]); });
    s.push(["إجمالي المسلَّم", sum(H)], ["النقد لدى المحصِّل", sum(C) - sum(H)]);
    var wb = X.utils.book_new(); wb.Workbook = {Views: [{RTL: true}]};
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(s), "الملخص");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "الشخص", "الصنف", "المبلغ", "ملاحظات"]].concat(P.map(function (e) { return [when(e.at), e.name, e.item, e.amount, e.note]; }))), "المشتريات");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "الشخص", "المبلغ", "ملاحظات"]].concat(C.map(function (e) { return [when(e.at), e.name, e.amount, e.note]; }))), "التحصيلات");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "سُلِّم إلى", "المبلغ", "ملاحظات"]].concat(H.map(function (e) { return [when(e.at), e.name, e.amount, e.note]; }))), "التسليمات");
    X.writeFile(wb, "دفتر-التحصيل-" + new Date().toISOString().slice(0, 10) + ".xlsx");
  }).catch(function () { toast("تعذّر إنشاء الملف"); });
};

try { var saved = localStorage.getItem("pin"); if (saved) pin = saved; } catch (e) {}
loadNames();
