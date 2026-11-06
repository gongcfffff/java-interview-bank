"use strict";
(() => {
  const { h, icon, store } = App;

  function rings(st) {
    const svg = h("svg", { viewBox: "0 0 176 176", role: "img", "aria-label": `掌握 ${st.ok}，模糊 ${st.fuzzy}，看过 ${st.seen}，共 ${st.total}` });
    [[st.ok, 78, 1], [st.fuzzy, 60, 2], [st.seen, 42, 3]].forEach(([v, r, i]) => {
      const len = 2 * Math.PI * r, d = st.total ? v / st.total * len : 0;
      svg.append(h("circle", { svg: true, class: "t" + i, cx: 88, cy: 88, r }));
      if (!d) return;
      const arc = h("circle", { svg: true, class: "v" + i, cx: 88, cy: 88, r, "stroke-dasharray": len, "stroke-dashoffset": len });
      svg.append(arc);
      App.later(() => arc.setAttribute("stroke-dashoffset", len - Math.max(d, 1)));
    });
    const row = (label, v, color) => {
      const b = h("b", { style: { color } });
      App.countUp(b, v);
      return h("div", null, h("span", null, label), h("span", { class: "rv" }, b, h("small", null, "/ " + st.total)));
    };
    return h("div", { class: "rings" }, svg,
      h("div", { class: "ring-legend" }, row("已掌握", st.ok, "var(--ok)"), row("模糊", st.fuzzy, "var(--warn)"), row("看过", st.seen, "var(--accent-blue)")));
  }

  const WEEKS = 22;
  function activity() {
    const days = store.days();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - today.getDay() - (WEEKS - 1) * 7);
    const level = n => !n ? 0 : n < 5 ? 1 : n < 12 ? 2 : n < 25 ? 3 : 4;
    const grid = h("div", { class: "heat", role: "img" });
    const months = h("div", { class: "heat-months", "aria-hidden": "true" });
    let total = 0, active = 0, week = 0, lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const col = h("div", { class: "heat-col" });
      for (let d = 0; d < 7; d++) {
        const day = new Date(start); day.setDate(start.getDate() + w * 7 + d);
        if (day > today) { col.append(h("i", { class: "future" })); continue; }
        const key = store.dayKey(day), n = days[key] || 0;
        total += n; if (n) active++;
        if ((today - day) / 864e5 < 7) week += n;
        col.append(h("i", { class: "l" + level(n), title: `${day.getMonth() + 1}月${day.getDate()}日 · ${n ? n + " 道题" : "未学习"}`, style: { "--d": (w * 7 + d) * 6 + "ms" } }));
      }
      const m = new Date(start); m.setDate(start.getDate() + w * 7);
      months.append(h("span", null, m.getMonth() !== lastMonth ? (m.getMonth() + 1) + "月" : ""));
      lastMonth = m.getMonth();
      grid.append(col);
    }
    let streak = 0;
    const cur = new Date(today);
    if (!days[store.dayKey(cur)]) cur.setDate(cur.getDate() - 1);
    while (days[store.dayKey(cur)]) { streak++; cur.setDate(cur.getDate() - 1); }
    const todayN = days[store.dayKey(today)] || 0;
    grid.setAttribute("aria-label", `最近 ${WEEKS} 周学习了 ${active} 天，共 ${total} 题次`);
    const stat = (v, label, ic) => {
      const b = h("b");
      App.countUp(b, v);
      return h("div", { class: "astat" }, ic ? App.icon(ic) : null, h("span", null, b, h("small", null, label)));
    };
    return h("section", { class: "card panel activity" },
      h("h3", null, "学习记录", h("small", null, todayN ? `今天已学 ${todayN} 题，继续保持` : "今天还没开始，先来一题吧")),
      h("div", { class: "activity-body" },
        h("div", { class: "astats" }, stat(streak, "天连续", "flame"), stat(week, "本周题次"), stat(active, "学习天数")),
        h("div", { class: "heat-wrap" }, months, grid,
          h("div", { class: "heat-legend", "aria-hidden": "true" }, "少", [0, 1, 2, 3, 4].map(l => h("i", { class: "l" + l })), "多"))));
  }

  function hash(s) { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; }

  function chapterCard(c, last) {
    const st = store.stats(c.questions);
    const counts = App.sectionCounts(c);
    const resume = last && last.c === c;
    return h("article", { class: "card ccard" },
      h("div", { class: "ccard-h" }, App.tile(c, "lg"),
        h("div", null, h("h3", null, c.name), h("span", { class: "muted" }, `${c.questions.length} 题 · ${c.nodes.length} 个知识点`))),
      h("p", null, c.intro),
      h("div", { class: "secs" }, c.sections.map((s, i) => h("span", { class: "tag" }, s + " " + counts[i]))),
      h("div", { class: "prog" }, h("span", null, "掌握 ", h("b", null, st.ok), " · 模糊 ", h("b", null, st.fuzzy)), h("span", null, `看过 ${st.seen}/${st.total}`)),
      App.bar(st),
      h("div", { class: "acts" },
        h("a", { class: "btn sm primary", href: resume ? App.qUrl(last) : "#/c/" + c.id }, resume ? "继续第 " + last.no + " 题" : "开始学习"),
        h("a", { class: "btn sm", href: "#/c/" + c.id + "/map", title: "知识图谱" }, icon("map"), "图谱"),
        h("a", { class: "btn sm", href: "#/review/" + c.id, title: "刷题" }, icon("flash"), "刷题")));
  }

  function miniList(qs, empty) {
    if (!qs.length) return h("p", { class: "muted", style: { "font-size": ".86rem", padding: "10px 2px" } }, empty);
    return h("div", { class: "mini-list" }, qs.map(q =>
      h("a", { class: "mini-item", href: App.qUrl(q) }, h("small", null, App.qLabel(q)), h("span", null, q.t))));
  }

  const KEYS = [[["/"], "搜索全部题目"], [["J", "K"], "下一题 / 上一题"], [["1", "2", "3"], "标记 未学 / 模糊 / 掌握"], [["S"], "收藏当前题"], [["R"], "背诵模式：先遮住答案"], [["空格"], "显示答案"]];

  App.views.home = function home(main) {
    const all = store.stats(App.all);
    const last = App.byKey.get(store.get("last"));
    const sum = k => App.chapters.reduce((n, c) => n + c[k].length, 0);
    const fuzzy = App.all.filter(q => store.status(q.key) === "fuzzy").slice(0, 8);
    const day = new Date().toISOString().slice(0, 10);
    const fresh = App.all.filter(q => store.status(q.key) === "new").sort((a, b) => hash(day + a.key) - hash(day + b.key)).slice(0, 8);
    const pick = App.all[Math.floor(Math.random() * App.all.length)];

    main.append(h("div", { class: "page" },
      h("section", { class: "hero" },
        h("div", null,
          h("p", { class: "eyebrow" }, "Java 后端面试 · 离线题库"),
          h("h1", null, `把 ${App.all.length} 道高频题，`, h("br"), h("span", { class: "grad" }, "讲清楚、记得住。")),
          h("p", { class: "lede" }, "覆盖 " + App.chapters.map(c => c.name).join("、") + "。每题都有可直接口述的面试回答，并附答题要点、示例和易错点。"),
          h("div", { class: "hero-stats" },
            [[App.all.length, "道题"], [sum("nodes"), "个知识点"], [sum("edges") + App.bridgeCount, "条关联"], [sum("routes"), "条路线"]].map(([n, l]) => {
              const b = h("b");
              App.countUp(b, n, 1100);
              return h("div", { class: "hero-stat" }, b, h("span", null, l));
            })),
          h("div", { class: "hero-actions" },
            last ? h("a", { class: "btn primary", href: App.qUrl(last) }, "继续学习 · " + App.qLabel(last))
              : h("a", { class: "btn primary", href: "#/c/" + App.chapters[0].id }, "从第一题开始"),
            h("a", { class: "btn", href: "#/review" }, icon("flash"), "刷题复习"),
            h("a", { class: "btn ghost", href: App.qUrl(pick) }, icon("shuffle"), "随机一题"))),
        rings(all)),
      h("h2", { class: "section-title" }, "章节", h("small", null, "打开题目即记为看过；自评“模糊 / 掌握”后计入进度")),
      h("div", { class: "chapter-grid" }, App.chapters.map((c, i) => {
        const card = chapterCard(c, last);
        card.style.setProperty("--i", i);
        return card;
      })),
      activity(),
      h("div", { class: "home-cols" },
        h("section", { class: "card panel" },
          h("h3", null, icon(fuzzy.length ? "alert" : "bulb"), fuzzy.length ? "待巩固" : "今日推荐",
            fuzzy.length ? h("a", { class: "btn sm ghost", href: "#/review/fuzzy" }, "复习这些") : h("small", null, "还没看过的题，每天更换")),
          fuzzy.length ? miniList(fuzzy) : miniList(fresh, "全部题目都看过了，去刷题复习吧。")),
        h("section", { class: "card panel" },
          h("h3", null, icon("keyboard"), "快捷键", h("button", { type: "button", class: "btn sm ghost", onclick: () => App.openHelp() }, "全部")),
          h("div", { class: "keys" }, KEYS.map(([ks, label]) =>
            h("div", null, h("span", null, label), h("span", null, ks.map(k => h("kbd", null, k))))))))));
  };
})();
