// ==UserScript==
// @name         徐医教务成绩 GPA 统计
// @namespace    https://github.com/xzhmu-gpa
// @version      1.1.0
// @description  在徐医教务「学生成绩查询」页自动选全部范围、完成查询，并统计 GPA/学位 GPA/学分/平均分/最值/分数分布
// @match        https://jwpt.xzhmu.edu.cn/cjcx/cjcx_cxDgXscj.html*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  window.__jwGpaLoadCount = (window.__jwGpaLoadCount || 0) + 1; // 重复安装检测

  /**
   * 成绩语义对齐 ADR-0004（徐医官方规则）：
   * - 绩点优先采用教务网格自带的官方 jd；缺失时回退公式 (score-50)/10、<60 记 0
   * - 同一课程多次修读（重修/补考）取历次最高分为有效记录
   * - 学位课程 = 网格 sfxwkc 列「是」
   */

  var PASS_TEXTS = ['合格', '通过', '优秀', '良好', '中等', '及格'];
  var BUCKETS = [
    { label: '90–100', min: 90, max: 101 },
    { label: '80–89', min: 80, max: 90 },
    { label: '70–79', min: 70, max: 80 },
    { label: '60–69', min: 60, max: 70 },
    { label: '<60', min: -1, max: 60 }
  ];

  function toNum(v) {
    if (v == null) return null;
    var s = String(v).replace(/ |&nbsp;/g, '').trim();
    if (s === '') return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  // 字段清洗：教务返回的文本可能夹带不可见字符——实测「是」严格相等比较失败，
  // 且污染物不在最初枚举的几个码位内。改为剥除整个 Unicode 格式字符类（Cf：
  // 零宽空格/连接符、方向标记 U+200E/F、软连字符 U+00AD、BOM、Word Joiner 等）
  // 和空白分隔符类（Zs：U+00A0、U+3000 等）。这些字符在成绩字段里绝无意义。
  function clean(v) {
    return String(v == null ? '' : v)
      .replace(/[\p{Cf}\p{Zs}]/gu, '')
      .trim();
  }

  // 教务页面加载的 jquery.extends 会劫持 Array.prototype.filter，
  // 回调签名变成 (下标, 元素)——isDegree 曾因此收到下标导致学位统计恒 0。
  // 本脚本的数组迭代一律用普通 for 循环 / 本助手，不碰被污染的原型方法。
  function select(arr, fn) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      if (fn(arr[i], i)) out.push(arr[i]);
    }
    return out;
  }

  // 解析数据行。优先走 jqGrid 内部 data（服务端返回的原始 JSON）：
  // 不受列顺序/列隐藏/渲染时序影响；无页面 jQuery 时回退 DOM 解析。
  // 两条路径都按列名（aria-describedby / data 字段名）取值，与列顺序无关。
  // data 路径必须通过字段完整性校验——某些网格配置下 JSON 原始数据缺列
  // （sfxwkc 等仅由 formatter 渲染进 DOM），此时落回 DOM 解析。
  function parseRows() {
    parseRows.lastPath = 'none';
    var grid = pageGrid();
    if (grid) {
      try {
        var data = window.jQuery('#tabGrid').jqGrid('getGridParam', 'data');
        if (data && data.length) {
          var rows = [];
          for (var di = 0; di < data.length; di++) {
            var d = data[di];
            var row = {};
            for (var k in d) {
              if (d[k] != null) row[k] = clean(d[k]);
            }
            if (row.kch || row.kcmc) rows.push(row);
          }
          if (rows.length && rows[0].sfxwkc !== undefined && rows[0].bfzcj !== undefined) {
            parseRows.lastPath = 'data';
            return rows;
          }
        }
      } catch (e) { /* 落回 DOM 解析 */ }
    }
    var trs = document.querySelectorAll('#tabGrid tr.jqgrow');
    var domRows = [];
    for (var i = 0; i < trs.length; i++) {
      var cells = trs[i].querySelectorAll('td[aria-describedby^="tabGrid_"]');
      var row = {};
      for (var j = 0; j < cells.length; j++) {
        var key = cells[j].getAttribute('aria-describedby').slice('tabGrid_'.length);
        row[key] = clean(cells[j].textContent);
      }
      if (row.kch || row.kcmc) domRows.push(row);
    }
    if (domRows.length) parseRows.lastPath = 'dom';
    return domRows;
  }

  // 是否学位课程：字段语义只有「是/否」两种。用 includes 判定——
  // 教务返回的值可能夹带任意不可见字符，精确匹配怎么清洗都可能漏；
  // 「否」绝不可能包含「是」，includes 零误判。编码值（1/true/Y）走映射兜底。
  var DEGREE_YES = { '1': 1, 'true': 1, 'Y': 1, 'y': 1, 'yes': 1 };
  function isDegree(row) {
    var v = String(row.sfxwkc == null ? '' : row.sfxwkc);
    return v.indexOf('是') !== -1 || DEGREE_YES[clean(v)] === 1;
  }

  function scoreOf(row) {
    var s = toNum(row.bfzcj);
    return s == null ? toNum(row.cj) : s;
  }

  function jdOf(row) {
    var jd = toNum(row.jd);
    if (jd != null) return jd;
    var s = scoreOf(row);
    if (s == null) return null;
    return s >= 60 ? (s - 50) / 10 : 0;
  }

  function isPass(row) {
    var jd = toNum(row.jd);
    if (jd != null) return jd > 0;
    var s = scoreOf(row);
    if (s != null) return s >= 60;
    var txt = String(row.cj || row.bfzcj || '').trim();
    for (var i = 0; i < PASS_TEXTS.length; i++) {
      if (PASS_TEXTS[i] === txt) return true;
    }
    return false;
  }

  // 免修：成绩或成绩备注含「免修」。免修是学分认定而非考试——网格里的
  // 0 分和 0 绩点只是系统占位，不参与任何成绩统计（对齐教务免修不计入
  // GPA 的惯例），学分单独展示。
  function isExempt(row) {
    return String(row.cj || '').indexOf('免修') !== -1 ||
           String(row.cjbz || '').indexOf('免修') !== -1;
  }

  // 重修/补考去重：按课程代码取最高分记录（ADR-0004 第 2 条）
  function dedupeBest(rows) {
    var best = {};
    var order = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var key = row.kch || row.kcmc;
      var s = scoreOf(row);
      if (!(key in best)) {
        best[key] = { row: row, score: s };
        order.push(key);
        continue;
      }
      var cur = best[key];
      // 免修记录优先于一切考试记录（免修认定后原考试记录不再有效）
      if (isExempt(row) && !isExempt(cur.row)) {
        best[key] = { row: row, score: s };
      } else if (!isExempt(row) && isExempt(cur.row)) {
        // 保持免修记录
      } else if (s != null && (cur.score == null || s > cur.score)) {
        best[key] = { row: row, score: s };
      }
    }
    var out = [];
    for (var oi = 0; oi < order.length; oi++) out.push(best[order[oi]].row);
    return out;
  }

  function aggregate(rows) {
    var gpaW = 0, gpaC = 0;          // Σ(xf·jd), Σxf（有有效绩点的课）
    var wW = 0, wC = 0, sum = 0, nScored = 0; // 加权/算术平均
    var earned = 0, total = 0;       // 已获/已修学分
    var fail = 0, nonNumeric = 0;
    var max = null, min = null;
    var dist = [];
    for (var d0 = 0; d0 < BUCKETS.length; d0++) dist.push(0);

    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var xf = toNum(row.xf);
      var jd = jdOf(row);
      var s = scoreOf(row);

      if (xf != null) {
        total += xf;
        if (isPass(row)) earned += xf;
      }
      if (xf != null && jd != null) { gpaW += xf * jd; gpaC += xf; }

      if (s != null) {
        if (xf != null) { wW += xf * s; wC += xf; }
        sum += s; nScored++;
        if (max == null || s > max.score) max = { score: s, name: row.kcmc };
        if (min == null || s < min.score) min = { score: s, name: row.kcmc };
        for (var b = 0; b < BUCKETS.length; b++) {
          if (s >= BUCKETS[b].min && s < BUCKETS[b].max) { dist[b]++; break; }
        }
      } else {
        nonNumeric++;
      }
      if (!isPass(row)) fail++;
    }

    return {
      count: rows.length,
      gpa: gpaC > 0 ? gpaW / gpaC : null,
      weightedAvg: wC > 0 ? wW / wC : null,
      arithAvg: nScored > 0 ? sum / nScored : null,
      earnedCredits: earned,
      totalCredits: total,
      failCount: fail,
      nonNumeric: nonNumeric,
      max: max,
      min: min,
      dist: dist
    };
  }

  function semesterKey(row) {
    return (row.xnmmc || '?') + ' 第' + (row.xqmmc || '?') + '学期';
  }
  function semesterSortVal(row) {
    return (toNum(row.xnm) || 0) * 100 + (toNum(row.xqm) || 0);
  }

  // 插入排序：不依赖 Array.prototype.sort（同属可能被扩展库污染的原型方法）
  function sortBy(arr, keyFn) {
    for (var i = 1; i < arr.length; i++) {
      var cur = arr[i], ck = keyFn(cur), j = i - 1;
      while (j >= 0 && keyFn(arr[j]) > ck) { arr[j + 1] = arr[j]; j--; }
      arr[j + 1] = cur;
    }
    return arr;
  }

  function computeStats(rawRows) {
    // 免修课程剥离：不参与任何成绩/学分统计，单独汇总展示
    var deduped = dedupeBest(rawRows);
    var rows = [], exemptList = [], exemptCredits = 0;
    for (var ei = 0; ei < deduped.length; ei++) {
      var er = deduped[ei];
      if (isExempt(er)) {
        exemptList.push({ name: er.kcmc, credit: toNum(er.xf), semester: semesterKey(er) });
        exemptCredits += toNum(er.xf) || 0;
      } else {
        rows.push(er);
      }
    }
    var degreeRows = select(rows, isDegree);

    // 学期分组（对齐网页版 MetricGrid.semesterGPAs）
    var semMap = {}, semKeys = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var k = semesterKey(r);
      if (!semMap[k]) { semMap[k] = { key: k, sort: semesterSortVal(r), rows: [] }; semKeys.push(k); }
      semMap[k].rows.push(r);
    }
    var sems = [];
    for (i = 0; i < semKeys.length; i++) {
      var sg = semMap[semKeys[i]];
      var ag = aggregate(sg.rows);
      sems.push({ key: sg.key, sort: sg.sort, gpa: ag.gpa, credits: ag.totalCredits, count: ag.count });
    }
    sortBy(sems, function (s) { return s.sort; });

    // 挂科列表（对齐网页版 FailingWarningCard）：去重取最高后仍不及格
    var failing = [];
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!isPass(r)) {
        failing.push({ name: r.kcmc, credit: toNum(r.xf), score: scoreOf(r), semester: semesterKey(r) });
      }
    }

    // 疑似误输入（对齐网页版 IllegalWarning）：百分制 < 10 分
    var suspicious = [];
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var sc = scoreOf(r);
      if (sc != null && sc < 10) {
        suspicious.push({ name: r.kcmc, score: sc, semester: semesterKey(r) });
      }
    }

    return {
      attempts: rawRows.length,
      overall: aggregate(rows),
      degree: aggregate(degreeRows),
      semesters: sems,
      failing: failing,
      suspicious: suspicious,
      exempt: { count: exemptList.length, credits: exemptCredits, list: exemptList },
      rows: rows
    };
  }

  // What-If（对齐网页版 WhatIfPanel）：某门课替换为假设分数后重算，
  // 绩点按校规公式重估（模拟场景无法取教务官方值）
  function simulate(stats, kch, score) {
    var sim = [];
    for (var i = 0; i < stats.rows.length; i++) {
      var r = stats.rows[i];
      if ((r.kch || r.kcmc) === kch) {
        var c = {};
        for (var k in r) c[k] = r[k];
        c.jd = (score >= 60 ? (score - 50) / 10 : 0).toFixed(2);
        c.bfzcj = String(score);
        c.cj = String(score);
        sim.push(c);
      } else {
        sim.push(r);
      }
    }
    return { overall: aggregate(sim), degree: aggregate(select(sim, isDegree)) };
  }

  // 目标 GPA 持久化（对齐网页版 profile.targetGPA）
  var TARGET_KEY = 'jwgpa.targetGPA';
  function loadTarget() {
    try {
      var v = parseFloat(localStorage.getItem(TARGET_KEY));
      return isNaN(v) ? null : v;
    } catch (e) { return null; }
  }
  function saveTarget(v) {
    try {
      if (v == null || isNaN(v)) localStorage.removeItem(TARGET_KEY);
      else localStorage.setItem(TARGET_KEY, String(v));
    } catch (e) { /* 无痕模式等场景忽略 */ }
  }

  // ---------- UI ----------

  var PANEL_ID = 'jwgpa-panel';
  var TOGGLE_ID = 'jwgpa-toggle';
  var STYLE_ID = 'jwgpa-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '#jwgpa-panel{position:fixed;top:64px;right:16px;width:320px;z-index:999999;',
      'background:#FFFDF6;border:3px solid #1A1A1A;box-shadow:6px 6px 0 #1A1A1A;',
      'font:13px/1.5 "PingFang SC","Microsoft YaHei",sans-serif;color:#1A1A1A;}',
      '#jwgpa-panel .jw-h{display:flex;align-items:center;justify-content:space-between;',
      'background:#FFD02F;border-bottom:3px solid #1A1A1A;padding:6px 10px;font-weight:700;}',
      '#jwgpa-panel .jw-h button{border:2px solid #1A1A1A;background:#FFFDF6;cursor:pointer;',
      'font:700 12px/1 sans-serif;padding:3px 7px;margin-left:4px;box-shadow:2px 2px 0 #1A1A1A;}',
      '#jwgpa-panel .jw-h button:active{transform:translate(2px,2px);box-shadow:0 0 0 #1A1A1A;}',
      '#jwgpa-panel .jw-b{padding:10px 12px;max-height:70vh;overflow:auto;}',
      '#jwgpa-panel .jw-gpa{font-size:34px;font-weight:800;color:#2E9BFF;line-height:1.1;}',
      '#jwgpa-panel .jw-row{display:flex;justify-content:space-between;gap:8px;padding:1px 0;}',
      '#jwgpa-panel .jw-row b{font-variant-numeric:tabular-nums;}',
      '#jwgpa-panel .jw-sech{margin:8px 0 0;padding:5px 4px;border-top:2px dashed #1A1A1A;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;user-select:none;}',
      '#jwgpa-panel .jw-sech:hover{background:#FFF3C4;}',
      '#jwgpa-panel .jw-secb{padding:4px 1px 2px;}',
      '#jwgpa-panel .jw-warn{padding:2px 6px;margin:2px 0;border-left:4px solid #FF4D4D;background:#FFE9E9;font-size:12px;}',
      '#jwgpa-panel .jw-sus{padding:2px 6px;margin:2px 0;border-left:4px solid #FFD02F;background:#FFF8DC;font-size:12px;}',
      '#jwgpa-panel .jw-tin{width:56px;border:2px solid #1A1A1A;padding:2px 4px;font:700 13px sans-serif;background:#FFFDF6;color:#1A1A1A;}',
      '#jwgpa-panel .jw-sem{display:flex;justify-content:space-between;font-size:12px;padding:1px 0;gap:8px;}',
      '#jwgpa-panel .jw-wi select{width:100%;border:2px solid #1A1A1A;padding:2px;background:#FFFDF6;font-size:12px;margin:2px 0;color:#1A1A1A;}',
      '#jwgpa-panel .jw-wi input[type=range]{width:100%;}',
      '#jwgpa-panel .jw-wiout{font-size:12px;margin-top:2px;line-height:1.5;}',
      '#jwgpa-panel .jw-trend{margin-top:6px;display:block;}',
      '#jwgpa-panel .jw-bar{display:flex;align-items:center;gap:6px;margin:2px 0;}',
      '#jwgpa-panel .jw-bar span{width:52px;flex:none;text-align:right;font-size:12px;}',
      '#jwgpa-panel .jw-bar i{display:block;height:12px;background:#2E9BFF;border:2px solid #1A1A1A;}',
      '#jwgpa-panel .jw-bar em{font-style:normal;font-size:12px;font-variant-numeric:tabular-nums;}',
      '#jwgpa-panel .jw-note{margin-top:8px;font-size:11px;color:#666;}',
      '#jwgpa-toggle{position:fixed;top:64px;right:16px;z-index:999999;background:#FFD02F;',
      'border:3px solid #1A1A1A;box-shadow:4px 4px 0 #1A1A1A;cursor:pointer;',
      'font:700 13px "PingFang SC","Microsoft YaHei",sans-serif;padding:8px 12px;}',
      '#jwgpa-toggle:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #1A1A1A;}'
    ].join('');
    document.head.appendChild(st);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function row2(label, value) {
    var r = el('div', 'jw-row');
    r.appendChild(el('span', null, label));
    r.appendChild(el('b', null, value));
    return r;
  }

  function fmt(n, d) { return n == null ? '—' : n.toFixed(d); }

  // 分区折叠状态持久化
  var COLLAPSE_KEY = 'jwgpa.collapsed';
  function loadCollapsed() {
    try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveCollapsed(m) {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
  }

  // 可折叠分区：id 稳定，折叠状态存 localStorage
  function section(parent, id, title, badge, defaultOpen) {
    var cmap = loadCollapsed();
    var open = id in cmap ? cmap[id] : !!defaultOpen;
    var h = el('div', 'jw-sech');
    var left = el('span');
    var arrow = el('span', 'jw-arrow', open ? '▾ ' : '▸ ');
    left.appendChild(arrow);
    left.appendChild(el('span', null, title));
    h.appendChild(left);
    if (badge != null) h.appendChild(el('b', null, String(badge)));
    var b = el('div', 'jw-secb');
    b.style.display = open ? '' : 'none';
    h.onclick = function () {
      var wasOpen = b.style.display !== 'none';
      b.style.display = wasOpen ? 'none' : '';
      arrow.textContent = wasOpen ? '▸ ' : '▾ ';
      var m = loadCollapsed();
      m[id] = !wasOpen;
      saveCollapsed(m);
    };
    parent.appendChild(h);
    parent.appendChild(b);
    return b;
  }

  // 学期 GPA 趋势：纯 SVG 折线（仅数值属性，无页面数据注入面）
  function trendSvg(sems, targetG) {
    var NS = 'http://www.w3.org/2000/svg';
    var w = 268, h = 76, padL = 10, padR = 10, padT = 8, padB = 10;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('class', 'jw-trend');
    var n = sems.length;
    if (!n) return svg;
    var maxG = 5;
    var px = function (i) { return n === 1 ? w / 2 : padL + i * (w - padL - padR) / (n - 1); };
    var py = function (g) { return padT + (1 - Math.min(Math.max(g, 0), maxG) / maxG) * (h - padT - padB); };
    if (targetG != null) {
      var tl = document.createElementNS(NS, 'line');
      tl.setAttribute('x1', padL); tl.setAttribute('x2', w - padR);
      tl.setAttribute('y1', py(targetG)); tl.setAttribute('y2', py(targetG));
      tl.setAttribute('stroke', '#FF4D4D'); tl.setAttribute('stroke-width', '1.5');
      tl.setAttribute('stroke-dasharray', '4 3');
      svg.appendChild(tl);
    }
    var pts = [];
    for (var i = 0; i < n; i++) {
      if (sems[i].gpa != null) pts.push(px(i) + ',' + py(sems[i].gpa));
    }
    var pl = document.createElementNS(NS, 'polyline');
    pl.setAttribute('points', pts.join(' '));
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', '#2E9BFF');
    pl.setAttribute('stroke-width', '2.5');
    svg.appendChild(pl);
    for (i = 0; i < n; i++) {
      if (sems[i].gpa == null) continue;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', px(i));
      c.setAttribute('cy', py(sems[i].gpa));
      c.setAttribute('r', '3.5');
      c.setAttribute('fill', '#FFD02F');
      c.setAttribute('stroke', '#1A1A1A');
      c.setAttribute('stroke-width', '1.5');
      svg.appendChild(c);
    }
    return svg;
  }

  // What-If 控件状态（跨面板重渲染保持）
  var wiCourse = null, wiScore = null;

  function renderPanel(stats) {
    ensureStyle();
    var old = document.getElementById(PANEL_ID);
    if (old) old.remove();
    var oldT = document.getElementById(TOGGLE_ID);
    if (oldT) oldT.remove();

    var panel = el('div'); panel.id = PANEL_ID;
    var head = el('div', 'jw-h');
    head.appendChild(el('span', null, '成绩统计'));
    var btns = el('span');
    var rerun = el('button', null, '重算');
    rerun.title = '重新解析当前表格并计算';
    rerun.onclick = function () { run(); };
    var fold = el('button', null, '—');
    fold.title = '收起';
    fold.onclick = function () { panel.remove(); mountToggle(); };
    btns.appendChild(rerun); btns.appendChild(fold);
    head.appendChild(btns);
    panel.appendChild(head);

    var body = el('div', 'jw-b');
    var o = stats.overall, d = stats.degree;
    var target = loadTarget();

    // ---- 总览（不折叠）----
    body.appendChild(el('div', 'jw-gpa', fmt(o.gpa, 2)));
    body.appendChild(row2('学位 GPA', fmt(d.gpa, 2)));
    body.appendChild(row2('加权平均分', fmt(o.weightedAvg, 1) + '（算术 ' + fmt(o.arithAvg, 1) + '）'));
    body.appendChild(row2('学分（已获/已修）', fmt(o.earnedCredits, 1) + ' / ' + fmt(o.totalCredits, 1)));
    body.appendChild(row2('学位学分（已获/已修）', fmt(d.earnedCredits, 1) + ' / ' + fmt(d.totalCredits, 1)));
    body.appendChild(row2('课程门数', o.count + '（学位 ' + d.count + '）'));
    body.appendChild(row2('不及格', o.failCount + ' 门' + (o.nonNumeric ? '；非百分制 ' + o.nonNumeric + ' 门' : '')));
    if (stats.exempt.count) {
      body.appendChild(row2('免修', stats.exempt.count + ' 门（' + fmt(stats.exempt.credits, 1) + ' 学分，不计入统计）'));
    }
    if (o.max) body.appendChild(row2('最高分', o.max.score + ' ' + o.max.name));
    if (o.min) body.appendChild(row2('最低分', o.min.score + ' ' + o.min.name));

    // ---- 警告区：挂科列表 + 疑似误输入 ----
    if (stats.failing.length || stats.suspicious.length) {
      var wb0 = section(body, 'warn', '警告', stats.failing.length + stats.suspicious.length, true);
      for (var fi = 0; fi < stats.failing.length; fi++) {
        var f = stats.failing[fi];
        wb0.appendChild(el('div', 'jw-warn',
          '挂科：' + f.name + '　' + (f.score == null ? '无有效分数' : f.score + ' 分') +
          '　' + fmt(f.credit, 1) + ' 学分　' + f.semester));
      }
      for (var si = 0; si < stats.suspicious.length; si++) {
        var su = stats.suspicious[si];
        wb0.appendChild(el('div', 'jw-sus',
          '疑似误输入：' + su.name + '　' + su.score + ' 分（<10 分，已按校规计 0 绩点）　' + su.semester));
      }
    }

    // ---- 目标 GPA ----
    var tb = section(body, 'target', '目标 GPA', target == null ? '未设置' : target.toFixed(2), true);
    var trow = el('div', 'jw-row');
    trow.appendChild(el('span', null, '设定目标'));
    var tin = el('input', 'jw-tin');
    tin.type = 'number'; tin.step = '0.1'; tin.min = '0'; tin.max = '5';
    if (target != null) tin.value = target.toFixed(2);
    tin.onchange = function () {
      var v = parseFloat(tin.value);
      saveTarget(isNaN(v) ? null : v);
      run();
    };
    trow.appendChild(tin);
    tb.appendChild(trow);
    if (target != null) {
      if (o.gpa != null) {
        var diff = o.gpa - target;
        tb.appendChild(row2('总 GPA 差距', (diff >= 0 ? '+' : '') + diff.toFixed(2) + (diff >= 0 ? '（已达标）' : '')));
      }
      if (d.gpa != null) {
        var ddiff = d.gpa - target;
        tb.appendChild(row2('学位 GPA 差距', (ddiff >= 0 ? '+' : '') + ddiff.toFixed(2) + (ddiff >= 0 ? '（已达标）' : '')));
      }
    }

    // ---- 各学期 GPA + 趋势 ----
    if (stats.semesters.length) {
      var sb = section(body, 'sems', '各学期', stats.semesters.length + ' 个', false);
      for (var mi = 0; mi < stats.semesters.length; mi++) {
        var sm = stats.semesters[mi];
        var srow = el('div', 'jw-sem');
        srow.appendChild(el('span', null, sm.key));
        srow.appendChild(el('b', null,
          'GPA ' + fmt(sm.gpa, 2) + ' · ' + fmt(sm.credits, 1) + ' 学分 · ' + sm.count + ' 门'));
        sb.appendChild(srow);
      }
      sb.appendChild(trendSvg(stats.semesters, target));
    }

    // ---- What-If 假设分析 ----
    if (stats.rows.length) {
      var wib = section(body, 'whatif', '假设分析', null, false);
      wib.className += ' jw-wi';
      var sel = el('select');
      for (var ci = 0; ci < stats.rows.length; ci++) {
        var cr = stats.rows[ci];
        var opt = el('option', null, cr.kcmc + '（' + semesterKey(cr) + '）');
        opt.value = cr.kch || cr.kcmc;
        sel.appendChild(opt);
      }
      if (wiCourse) sel.value = wiCourse;
      if (sel.selectedIndex < 0) sel.selectedIndex = 0;
      wiCourse = sel.value;
      var slider = el('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '1';
      var out = el('div', 'jw-wiout');
      var refresh = function () {
        var row = null;
        for (var ri = 0; ri < stats.rows.length; ri++) {
          if ((stats.rows[ri].kch || stats.rows[ri].kcmc) === wiCourse) { row = stats.rows[ri]; break; }
        }
        if (!row) return;
        if (wiScore == null) wiScore = scoreOf(row);
        if (wiScore == null) wiScore = 60;
        slider.value = String(wiScore);
        var res = simulate(stats, wiCourse, wiScore);
        out.textContent = '';
        out.appendChild(row2('假设此科 ' + wiScore + ' 分', ''));
        out.appendChild(row2('总 GPA', fmt(o.gpa, 2) + ' → ' + fmt(res.overall.gpa, 2)));
        out.appendChild(row2('学位 GPA', fmt(d.gpa, 2) + ' → ' + fmt(res.degree.gpa, 2)));
      };
      sel.onchange = function () { wiCourse = sel.value; wiScore = null; refresh(); };
      slider.oninput = function () { wiScore = parseInt(slider.value, 10); refresh(); };
      wib.appendChild(sel);
      wib.appendChild(slider);
      wib.appendChild(out);
      refresh();
    }

    // ---- 分数分布 ----
    var db = section(body, 'dist', '分数分布', null, true);
    var maxN = Math.max.apply(null, o.dist.concat([1]));
    for (var di2 = 0; di2 < o.dist.length; di2++) {
      var n = o.dist[di2];
      var bar = el('div', 'jw-bar');
      bar.appendChild(el('span', null, BUCKETS[di2].label));
      var i2 = el('i');
      i2.style.width = Math.round((n / maxN) * 140) + 'px';
      bar.appendChild(i2);
      bar.appendChild(el('em', null, String(n)));
      db.appendChild(bar);
    }

    body.appendChild(el('div', 'jw-note',
      '共 ' + stats.attempts + ' 条成绩记录，同课程多次修读已按最高分去重；绩点取教务官方值' +
      (stats.exempt.count ? '；免修 ' + stats.exempt.count + ' 门不参与统计' : '') + '。'));
    panel.appendChild(body);
    document.body.appendChild(panel);
  }

  function mountToggle() {
    if (document.getElementById(TOGGLE_ID) || document.getElementById(PANEL_ID)) return;
    ensureStyle();
    var t = el('button', null, '成绩统计');
    t.id = TOGGLE_ID;
    t.onclick = function () { t.remove(); run(); };
    document.body.appendChild(t);
  }

  // ---------- 主流程 ----------

  var api = {
    version: '1.1.0',
    parseRows: parseRows,
    computeStats: computeStats,
    isDegree: isDegree,
    run: run,
    lastRows: null,
    lastStats: null,
    debug: debug
  };
  window.__jwGpa = api;

  // 只读诊断快照：一次性暴露脚本版本、解析路径、原始数据与统计结果
  function debug() {
    var grid = pageGrid();
    var jqDataLen = -1, jqDataSample = null;
    if (grid) {
      try {
        var data = window.jQuery('#tabGrid').jqGrid('getGridParam', 'data');
        jqDataLen = data ? data.length : -2;
        jqDataSample = data && data[0] ? {
          hasSfxwkc: 'sfxwkc' in data[0],
          sfxwkc: data[0].sfxwkc,
          hasBfzcj: 'bfzcj' in data[0]
        } : null;
      } catch (e) { jqDataLen = -3; }
    }
    var panel = document.getElementById(PANEL_ID);
    return {
      version: api.version,
      path: parseRows.lastPath,
      rows: api.lastRows ? api.lastRows.length : null,
      degreeRows: api.lastRows ? select(api.lastRows, isDegree).length : null,
      degreeStat: api.lastStats ? api.lastStats.degree.count : null,
      degreeGpa: api.lastStats ? api.lastStats.degree.gpa : null,
      sampleSfxwkc: api.lastRows && api.lastRows[0] ? api.lastRows[0].sfxwkc : null,
      gridReady: !!grid,
      jqDataLen: jqDataLen,
      jqDataSample: jqDataSample,
      domRows: document.querySelectorAll('#tabGrid tr.jqgrow').length,
      sfxwkcCodes: api.lastRows ? (function () {
        var seen = {}, out = [];
        for (var i = 0; i < api.lastRows.length; i++) {
          var v = String(api.lastRows[i].sfxwkc);
          if (v in seen) continue;
          seen[v] = 1;
          var codes = [];
          for (var j = 0; j < v.length; j++) codes.push(v.codePointAt(j).toString(16));
          out.push(codes);
        }
        return out;
      })() : null,
      scriptsCount: window.__jwGpaLoadCount || null,
      watching: !!(document.getElementById('tabGrid') || {}).__jwWatched
    };
  }

  function run() {
    var rows = parseRows();
    api.lastRows = rows;
    if (!rows.length) { mountToggle(); return null; }
    var stats = computeStats(rows);
    api.lastStats = stats;
    renderPanel(stats);
    return stats;
  }

  function pageGrid() {
    try {
      if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.jqGrid) return null;
      var g = window.jQuery('#tabGrid')[0];
      return g && g.p ? g : null;
    } catch (e) { return null; }
  }

  var computeTimer = null;
  function scheduleRun() {
    clearTimeout(computeTimer);
    computeTimer = setTimeout(run, 400);
  }

  // 教务页面会在网格渲染后异步改写单元格（sfxwkc 学位标记就是渲染后
  // 由另一路请求回填的），该过程不触发 loadComplete。用 MutationObserver
  // 监听网格 tbody：任何单元格变化（回填/排序/翻页/列重排）都去抖重算。
  // 面板在 #tabGrid 之外，run() 只读网格，不会自触发死循环。
  function watchGrid() {
    var grid = document.getElementById('tabGrid');
    if (!grid || grid.__jwWatched) return;
    grid.__jwWatched = true;
    new MutationObserver(scheduleRun).observe(grid, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function init() {
    watchGrid();
    var grid = pageGrid();
    if (!grid) {
      // 无页面 jQuery/jqGrid（如离线存档）：直接按当前 DOM 计算
      if (document.querySelector('#tabGrid tr.jqgrow')) run();
      else mountToggle();
      return;
    }
    var $ = window.jQuery;
    var $grid = $('#tabGrid');

    // 挂在 loadComplete 上：自动查询或用户手动查询后都会重算
    var prev = $grid.jqGrid('getGridParam', 'loadComplete');
    $grid.jqGrid('setGridParam', {
      loadComplete: function (data) {
        if ($.isFunction(prev)) prev.call(this, data);
        scheduleRun();
      }
    });

    // 自动配置查询范围：学年/学期/课程标记 全部
    var filterIds = ['xnm', 'xqm', 'kcbjdm_cx'];
    for (var fi = 0; fi < filterIds.length; fi++) {
      var sel = document.getElementById(filterIds[fi]);
      if (sel) {
        sel.value = '';
        try { window.jQuery('#' + filterIds[fi]).trigger('chosen:updated'); } catch (e) { /* chosen 缺失时忽略 */ }
      }
    }

    // 一次取回全部记录后查询
    $grid.jqGrid('setGridParam', { rowNum: 10000, page: 1 });
    var btn = document.getElementById('search_go');
    if (btn) btn.click();
    else $grid.trigger('reloadGrid');
  }

  // 等网格初始化完成；#tabGrid 一出现就挂监听，尽早捕获异步回填
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    watchGrid();
    if (pageGrid() || document.querySelector('#tabGrid tr.jqgrow')) {
      clearInterval(timer);
      init();
    } else if (tries > 50) {
      clearInterval(timer);
    }
  }, 300);
})();
