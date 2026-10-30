(function () {
  "use strict";
  var MAX_SINGLE = 700;

  // Round to the nearest 10 units; halves round up (105 → 110), matching Table 1 of the prescribing information.
  function round10(x) { return Math.round(x / 10 + 1e-9) * 10; }
  function week1(daily) { return round10(daily * 7 * 1.5); }
  function week2(daily) { return round10(daily * 7); }
  function splitDose(total) {
    var parts = [];
    while (total > MAX_SINGLE) { parts.push(MAX_SINGLE); total -= MAX_SINGLE; }
    if (total > 0) parts.push(total);
    return parts;
  }
  window.awiqliCalc = { week1: week1, week2: week2, splitDose: splitDose };

  var fmt = new Intl.NumberFormat("en-US");
  var dateFmt;
  try { dateFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch (e) { dateFmt = new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function addDays(d, n) { var r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; }

  /* Tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    try { localStorage.setItem("awiqli-tab", tab.id); } catch (e) {}
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0; // RTL order
      if (!d) return;
      var next = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(next); next.focus(); e.preventDefault();
    });
  });
  try { var saved = localStorage.getItem("awiqli-tab"); if (saved && document.getElementById(saved)) selectTab(document.getElementById(saved)); } catch (e) {}

  /* Switching calculator */
  var $a = document.getElementById("dose-a"), $b = document.getElementById("dose-b"), $date = document.getElementById("last-date");
  var touched = false;

  function setWindow(id, val) {
    var el = document.getElementById(id);
    var txt = val > MAX_SINGLE ? MAX_SINGLE : val;
    if (el.textContent !== String(txt)) {
      el.textContent = txt;
      el.classList.add("bump"); setTimeout(function () { el.classList.remove("bump"); }, 160);
    }
  }
  function showSplit(id, total) {
    var el = document.getElementById(id), parts = splitDose(total);
    if (parts.length < 2) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "الجرعة أكبر من 700 وحدة، فتُعطى على <b>" + parts.length + " حقن</b> متتالية: " +
      parts.map(function (p) { return '<b class="num">' + fmt.format(p) + "</b>"; }).join(" + ") + " وحدة.";
  }

  function updateSwitch() {
    var a = parseFloat($a.value), b = parseFloat($b.value);
    if (isNaN(b)) b = 0;
    var err = document.getElementById("sw-err"), res = document.getElementById("sw-results"), tot = document.getElementById("sw-total");
    var daily = (isNaN(a) ? 0 : a) + b;
    document.getElementById("ex1").hidden = touched;

    var msg = "";
    if (isNaN(a) || a <= 0) msg = "اكتب جرعتك اليومية من الإنسولين القاعدي بالوحدات.";
    else if (a < 0 || b < 0) msg = "الجرعة لا يمكن أن تكون رقمًا سالبًا.";
    else if (daily > 200) msg = "المجموع أكبر من 200 وحدة يوميًا. هذا خارج نطاق الحاسبة؛ راجع طبيبك لتحديد الجرعة.";
    err.hidden = !msg; err.textContent = msg;
    res.style.opacity = msg ? ".35" : "1";
    if (msg) { tot.textContent = ""; return; }

    tot.innerHTML = b > 0 ? "مجموع الإنسولين القاعدي اليومي: <b>" + fmt.format(daily) + "</b> وحدة" : "";
    var w1 = week1(daily), w2 = week2(daily);
    setWindow("w1", w1); setWindow("w2", w2);
    document.getElementById("w1t").textContent = fmt.format(w1);
    document.getElementById("w2t").textContent = fmt.format(w2);
    showSplit("w1s", w1); showSplit("w2s", w2);

    var w1d = document.getElementById("w1d"), w2d = document.getElementById("w2d"), w3d = document.getElementById("w3d");
    if ($date.value) {
      var last = new Date($date.value + "T00:00:00");
      var d1 = addDays(last, 1);
      w1d.textContent = dateFmt.format(d1) + " (اليوم التالي لآخر جرعة يومية)";
      w2d.textContent = dateFmt.format(addDays(d1, 7));
      w3d.textContent = "ابتداءً من " + dateFmt.format(addDays(d1, 14)) + "، ويصبح " + dateFmt.format(d1).split("،")[0] + " يوم حقنتك الأسبوعي";
    } else {
      w1d.textContent = "في اليوم التالي لآخر جرعة من الإنسولين اليومي";
      w2d.textContent = "بعد 7 أيام من الجرعة الأولى";
      w3d.textContent = "يُعدّل الطبيب الجرعة بدءًا من جرعة الأسبوع الثاني";
    }
  }
  [$a, $b, $date].forEach(function (el) {
    el.addEventListener("input", function () { touched = true; updateSwitch(); });
  });

  // Reference rows reproduced from Table 1 of the prescribing information
  var tbody = document.getElementById("ref-table");
  [10, 15, 20, 25, 30, 35, 40, 45, 50, 100].forEach(function (d) {
    var tr = document.createElement("tr");
    tr.innerHTML = "<td>" + d + " وحدة يوميًا</td><td>" + fmt.format(week1(d)) + (week1(d) > MAX_SINGLE ? " (حقنتان)" : "") + "</td><td>" + fmt.format(week2(d)) + "</td>";
    tbody.appendChild(tr);
  });

  /* Missed dose */
  function dayLabel(n) { return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n + " أيام"; }
  var chipsWrap = document.getElementById("missed-chips"), missedOut = document.getElementById("missed-out");
  function updateMissed(days) {
    Array.prototype.forEach.call(chipsWrap.children, function (c) { c.setAttribute("aria-pressed", String(+c.dataset.d === days)); });
    var today = new Date();
    if (days <= 4) {
      missedOut.className = "notice good";
      missedOut.innerHTML = "<strong>خذ الجرعة الفائتة الآن</strong><p>مضى " + dayLabel(days) +
        " فقط (4 أيام أو أقل)، فخذ الجرعة في أقرب وقت. بعدها يصبح يوم حقنتك الأسبوعي الجديد هو يوم أخذها، فتكون الجرعة التالية بعد أسبوع: " +
        "<b>" + dateFmt.format(addDays(today, 7)) + "</b> إذا أخذتها اليوم.</p>";
    } else {
      missedOut.className = "notice warn";
      missedOut.innerHTML = "<strong>لا تأخذ الجرعة الفائتة</strong><p>مضى أكثر من 4 أيام. تجاوز الجرعة الفائتة، وخذ الجرعة التالية في يومك المعتاد بعد " +
        dayLabel(7 - days) + ". لا تضاعف الجرعة.</p>";
    }
  }
  for (var d = 1; d <= 6; d++) {
    var c = document.createElement("button");
    c.type = "button"; c.className = "chip"; c.dataset.d = d;
    c.textContent = dayLabel(d);
    c.addEventListener("click", (function (n) { return function () { updateMissed(n); }; })(d));
    chipsWrap.appendChild(c);
  }

  /* Pen */
  var $left = document.getElementById("pen-left"), $need = document.getElementById("pen-need"), penOut = document.getElementById("pen-out");
  function updatePenLeft() {
    var left = parseInt($left.value, 10), need = parseInt($need.value, 10);
    if (isNaN(left) || isNaN(need) || need <= 0 || left < 0) {
      penOut.className = "notice info"; penOut.innerHTML = "<p>اكتب الرقمين لنقارن بينهما.</p>"; return;
    }
    if (need > MAX_SINGLE) {
      penOut.className = "notice info";
      penOut.innerHTML = "<p>جرعتك أكبر من 700 وحدة، فتُعطى على حقنتين أو أكثر (" + splitDose(need).map(fmt.format).join(" + ") + "). افحص الكمية قبل كل حقنة منها.</p>";
      return;
    }
    if (left >= need) {
      penOut.className = "notice good";
      penOut.innerHTML = "<strong>يكفي</strong><p>في القلم " + (left >= 700 ? "700 وحدة أو أكثر" : fmt.format(left) + " وحدة") + "، وجرعتك " + fmt.format(need) + " وحدة.</p>";
    } else {
      penOut.className = "notice warn";
      penOut.innerHTML = "<strong>لا يكفي</strong><p>في القلم " + fmt.format(left) + " وحدة فقط وجرعتك " + fmt.format(need) + " وحدة. استخدم قلمًا جديدًا لأخذ جرعتك كاملة.</p>";
    }
  }
  var $size = document.getElementById("pen-size"), $weekly = document.getElementById("pen-weekly"), penWeeks = document.getElementById("pen-weeks");
  function updatePenWeeks() {
    var size = parseInt($size.value, 10), w = parseInt($weekly.value, 10);
    if (isNaN(w) || w <= 0) { penWeeks.textContent = "اكتب جرعتك الأسبوعية."; return; }
    if (w > MAX_SINGLE) { penWeeks.textContent = "الحاسبة هنا للجرعات حتى 700 وحدة. اسأل الصيدلي عن عدد الأقلام المناسب لك."; return; }
    var doses = Math.floor(size / w), weeks = Math.min(doses, 12);
    var html = "قلم " + fmt.format(size) + " وحدة يكفي <b class=\"num\">" + doses + "</b> " + (doses === 1 ? "جرعة" : doses === 2 ? "جرعتين" : "جرعات") + " كاملة";
    if (doses > 12) html += "، لكن يجب التخلص منه بعد <b>12 أسبوعًا</b> من بدء استخدامه حتى لو بقي فيه دواء";
    else if (doses === 0) html = "جرعتك أكبر من سعة هذا القلم. اختر قلمًا أكبر.";
    else html += " (" + weeks + (weeks === 1 ? " أسبوع" : weeks === 2 ? " أسبوعين" : " أسابيع") + ")";
    var rest = size - doses * w;
    if (doses > 0 && doses <= 12 && rest > 0) html += ". يتبقى " + fmt.format(rest) + " وحدة لا تكفي لجرعة كاملة.";
    else html += ".";
    penWeeks.innerHTML = html;
  }
  [$left, $need].forEach(function (el) { el.addEventListener("input", updatePenLeft); });
  [$size, $weekly].forEach(function (el) { el.addEventListener("input", updatePenWeeks); el.addEventListener("change", updatePenWeeks); });

  updateSwitch(); updateMissed(2); updatePenLeft(); updatePenWeeks();
})();
