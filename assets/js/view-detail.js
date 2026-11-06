"use strict";
(() => {
  const { h, icon, store } = App;
  const STATUS = [["new", "未学"], ["fuzzy", "模糊"], ["ok", "掌握"]];

  function block(ic, title, ...content) {
    return h("section", { class: "blk" }, h("h3", { class: "blk-h" }, icon(ic), title), ...content);
  }

  App.answerBody = function answerBody(q, full = true) {
    return h("div", { class: "ans-body" },
      block("bulb", "面试回答", h("p", { class: "lead" }, q.interview)),
      block("list", "答题要点", h("ol", { class: "points" }, q.d.map(d => h("li", null, d)))),
      full && q.ex ? h("section", { class: "blk note ex" }, h("h3", { class: "blk-h" }, icon("check"), "示例"), h("p", null, q.ex)) : null,
      full && q.code ? block("code", "代码", h("div", { class: "code" },
        h("div", { class: "code-bar" }, h("i"), h("i"), h("i"), h("span", null, "示例代码"),
          App.copyBtn("复制", () => q.code, "代码已复制")),
        h("pre", null, h("code", null, App.codeFrag(q.code))))) : null,
      q.pit ? h("section", { class: "blk note pit" }, h("h3", { class: "blk-h" }, icon("alert"), "易错点"), h("p", null, q.pit)) : null);
  };

  App.answerText = q => [q.t, "", "【面试回答】" + q.interview, "", "【要点】", ...q.d.map((d, i) => (i + 1) + ". " + d),
    q.ex ? "\n【示例】" + q.ex : "", q.code ? "\n" + q.code : "", q.pit ? "\n【易错点】" + q.pit : ""].filter(x => x !== "").join("\n");

  function knowledge(q) {
    const c = q.c, n = q.n;
    const nbrs = c.nbrs.get(n.id).slice(0, 10);
    return h("section", { class: "kcard", style: { "--c": q.cat.color } },
      h("div", { class: "kcard-h" },
        h("span", { class: "tag cat" }, q.cat.label),
        h("h3", null, n.title), h("span", { class: "sub" }, n.sub),
        n.core ? h("span", { class: "tag core" }, "核心") : null,
        h("a", { class: "btn sm ghost", href: App.nodeUrl(c, n.id) }, icon("map"), "在图谱中查看")),
      n.what ? h("p", null, n.what) : null,
      n.take ? h("p", { class: "take" }, h("b", null, "面试抓手"), n.take) : null,
      nbrs.length ? h("div", { class: "rel-nodes" }, nbrs.map(({ id, edge }) => {
        const m = c.nodeMap.get(id), k = App.KINDS[edge.kind];
        return h("a", { class: "rel-node", href: App.nodeUrl(c, id), title: edge.why, style: { "--k": k.color } },
          h("i"), m.title, h("small", null, k.label));
      })) : null);
  }

  App.renderDetail = function renderDetail(q, nav = {}) {
    const c = q.c;
    const seg = () => App.slideSeg(h("div", { class: "seg status", role: "group", "aria-label": "掌握程度" },
      STATUS.map(([v, label], i) => h("button", { type: "button", "data-v": v, title: label + " (" + (i + 1) + ")", onclick: () => el.setStatus(v) }, label))));
    const statusSeg = seg(), dockSeg = seg();
    const starLabel = h("span");
    const starBtn = h("button", { type: "button", class: "btn sm star-btn", title: "收藏 (S)", onclick: () => el.toggleStar() }, icon("star"), starLabel);
    const dockStar = h("button", { type: "button", class: "dock-btn star-btn", title: "收藏 (S)", "aria-label": "收藏", onclick: () => el.toggleStar() }, icon("star"));
    const step = (to, ic, label, key) => to
      ? h("a", { class: "dock-btn", href: App.qUrl(to), title: label + " (" + key + ")", "aria-label": label }, icon(ic))
      : h("a", { class: "dock-btn", "aria-disabled": "true", "aria-label": label }, icon(ic));
    const actions = h("div", { class: "qd-actions" },
      statusSeg, starBtn, h("span", { class: "spacer" }),
      App.copyBtn("复制答案", () => App.answerText(q), "答案已复制"));
    // 顶部操作栏滚出视野后，底部浮出同样的操作，读到哪都能标记、翻题
    const dock = h("div", { class: "qd-dock", role: "toolbar", "aria-label": "快捷操作" },
      step(nav.prev, "left", "上一题", "K"),
      h("span", { class: "dock-pos" }, q.no + " / " + c.questions.length),
      step(nav.next, "right", "下一题", "J"),
      h("span", { class: "dock-sep" }), dockSeg, dockStar);
    const io = new IntersectionObserver(([en]) => {
      if (!actions.isConnected) { io.disconnect(); return; }
      dock.classList.toggle("on", !en.isIntersecting && en.boundingClientRect.top < innerHeight / 2);
    });
    io.observe(actions);
    const nextChap = !nav.next && q.i === c.questions.length - 1 ? App.chapters[App.chapters.indexOf(c) + 1] : null;
    const recite = store.get("recite");
    const ans = h("div", { class: "ans" + (recite ? " veiled" : "") },
      App.answerBody(q),
      h("div", { class: "veil" }, h("button", { type: "button", class: "btn primary", onclick: () => el.reveal() }, icon("eye"), "先回忆，再显示答案", h("kbd", null, "空格"))));
    const related = App.related(q);

    const el = h("article", { class: "qd" + (nav.dir > 0 ? " from-next" : nav.dir < 0 ? " from-prev" : ""), "aria-labelledby": "qd-title" },
      h("div", { class: "qd-meta" },
        h("span", null, c.name), h("span", { class: "sep" }, "›"), h("span", null, c.sections[q.sec]),
        h("span", { class: "sep" }, "›"), h("span", { class: "num" }, "第 " + q.no + " / " + c.questions.length + " 题"),
        h("a", { class: "tag cat", href: App.nodeUrl(c, q.n.id), style: { "--c": q.cat.color } }, q.cat.label + " · " + q.n.title),
        q.n.core ? h("span", { class: "tag core" }, "核心考点") : null),
      h("h2", { id: "qd-title" }, q.t),
      actions,
      ans,
      knowledge(q),
      related.length ? h("section", { class: "relq" },
        h("h3", { class: "blk-h" }, icon("link"), "相关题目"),
        h("div", { class: "relq-list" }, related.map(({ q: x, why }) =>
          h("a", { class: "relq-item", href: App.qUrl(x) }, h("small", null, why), x.t)))) : null,
      q.refs.length || c.sources.length ? h("div", { class: "refs" },
        h("span", { class: "muted" }, "参考"),
        (q.refs.length ? q.refs : c.sources.slice(0, 2)).map(r => h("a", { href: r.url, target: "_blank", rel: "noopener noreferrer" }, icon("ext"), r.name))) : null,
      h("nav", { class: "pager", "aria-label": "翻页" },
        nav.prev ? h("a", { class: "prev", href: App.qUrl(nav.prev) }, h("small", null, "← 上一题"), h("span", null, nav.prev.t)) : null,
        nav.next ? h("a", { class: "next", href: App.qUrl(nav.next) }, h("small", null, "下一题 →"), h("span", null, nav.next.t))
          : nextChap ? h("a", { class: "next chap-next", href: "#/c/" + nextChap.id + "/q/1" }, h("small", null, "本章读完 · 下一章 →"), h("span", null, nextChap.name + " · " + nextChap.questions[0].t))
          : q.i === c.questions.length - 1 ? h("a", { class: "next chap-next", href: "#/" }, h("small", null, "全部章节已到底"), h("span", null, "回到总览，看看还有哪些没掌握")) : null),
      h("p", { class: "kbd-hint" },
        h("span", null, h("kbd", null, "J"), h("kbd", null, "K"), " 翻题"),
        h("span", null, h("kbd", null, "1"), h("kbd", null, "2"), h("kbd", null, "3"), " 标记"),
        h("span", null, h("kbd", null, "S"), " 收藏"),
        h("span", null, h("kbd", null, "R"), " 背诵"),
        h("span", null, h("kbd", null, "F"), " 专注")),
      dock);

    el.sync = () => {
      const s = store.status(q.key);
      const cur = s === "seen" ? "new" : s;
      const on = store.starred(q.key);
      for (const sg of [statusSeg, dockSeg]) {
        for (const b of sg.querySelectorAll("button")) b.setAttribute("aria-pressed", String(cur === b.dataset.v));
        sg.dataset.v = cur;
        sg.place();
      }
      for (const b of [starBtn, dockStar]) b.setAttribute("aria-pressed", String(on));
      starLabel.textContent = on ? "已收藏" : "收藏";
    };
    el.setStatus = v => {
      const was = store.status(q.key);
      if ((was === "seen" ? "new" : was) === v) return;
      store.setStatus(q.key, v === "new" ? "seen" : v);
      App.toast({ new: "已标记为未学", fuzzy: "已标记为模糊，加入待巩固", ok: "已标记为掌握" }[v], { new: "list", fuzzy: "alert", ok: "check" }[v]);
    };
    el.toggleStar = () => {
      const on = store.toggleStar(q.key);
      for (const b of [starBtn, dockStar]) {
        b.classList.remove("pop"); void b.offsetWidth;
        if (on) b.classList.add("pop");
      }
      App.toast(on ? "已收藏" : "已取消收藏", "star");
    };
    el.reveal = () => {
      if (!ans.classList.contains("veiled")) return false;
      ans.classList.remove("veiled");
      ans.classList.add("revealed");
      return true;
    };
    el.setVeil = on => {
      ans.classList.toggle("veiled", on);
      ans.classList.remove("revealed");
    };
    el.sync();
    return el;
  };
})();
