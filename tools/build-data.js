#!/usr/bin/env node
// 从合订本 HTML 中提取五章数据，统一结构后写入 data/questions.js
// 用法：node tools/build-data.js [合订本路径]
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcPath = process.argv[2] || path.resolve(__dirname, "sources", "java-365.html");
const outPath = path.join(root, "data", "questions.js");
const backend = require("./backend-chapters.json");
const interviewAnswers = require("./interview-answers.json");

function grabConst(src, name) {
  const m = new RegExp("const\\s+" + name + "\\s*=\\s*").exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  const start = i, open = src[i], close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) break;
  }
  return JSON.parse(src.slice(start, i + 1));
}

const KIND = {
  "基础依赖": "base", "基础": "base", "实现关系": "impl", "实现对比": "impl",
  "共享原理": "shared", "共享机制": "shared", "深入追问": "deep", "深入": "deep",
  "对比区别": "contrast", "工程应用": "apply", "排障应用": "apply", "实战应用": "apply", "主线": "main"
};

const INTRO = {
  basics: "从字节码与 JVM 运行模型出发，覆盖数据类型、面向对象、泛型、反射、注解、异常、序列化与 I/O。",
  collections: "List、Set、Map、Queue 的接口契约、底层结构与线程安全，重点吃透 HashMap 与 ConcurrentHashMap。",
  concurrency: "JMM、线程生命周期、锁与 AQS、原子类、线程池与虚拟线程，以及多线程实战场景。",
  jvm: "类加载、运行时数据区、对象分配、垃圾回收算法与收集器（G1 / ZGC），以及线上排障思路。",
  spring: "IoC 与 Bean 生命周期、AOP、事务、Spring MVC、Spring Boot 自动配置、MyBatis 与 Spring Cloud。"
};

const stripNo = s => s.replace(/^\d+\s*·\s*/, "");
const refName = url => {
  const host = new URL(url).hostname;
  if (host.includes("oracle.com")) return "Oracle 官方文档";
  if (host.includes("openjdk")) return "OpenJDK";
  if (host.includes("spring.io")) return "Spring 官方文档";
  if (host.includes("xiaolincoding")) return "小林 coding 原文";
  return host;
};
const cats = list => list.map(c => ({ id: c.id, label: stripNo(c.label), color: c.color, desc: c.desc || c.help || "" }));
const nodes = list => list.map(n => ({
  id: n.id, cat: n.cat, title: n.title, sub: n.sub || "", what: n.what || n.desc || "", take: n.take || n.key || "", core: !!n.core
}));
const edges = list => list.map(e => {
  if (!KIND[e.kind]) throw new Error("未知关系类型：" + e.kind);
  return { a: e.a, b: e.b, kind: KIND[e.kind], why: e.why };
});
const routes = list => list.filter(r => r.nodes.length).map(r => ({ id: r.id, title: r.title || r.label, desc: r.desc, nodes: r.nodes }));

function fromData(id, html, name) {
  const D = grabConst(html, "DATA");
  return {
    id, name, intro: INTRO[id], sections: D.chapters,
    sources: [{ name: "小林 coding · " + name + "面试题", url: D.source }],
    cats: cats(D.cats), nodes: nodes(D.nodes), edges: edges(D.edges), routes: routes(D.routes),
    questions: D.questions.map(q => ({
      t: q.title, s: q.short, d: q.details, ex: q.example, pit: q.pitfall, code: q.code || "",
      node: q.node, sec: q.chapter, f: q.follow.map(n => n - 1),
      refs: [{ name: "小林 coding 原文", url: D.source + "#" + q.anchor }, ...(q.ref ? [{ name: refName(q.ref), url: q.ref }] : [])]
    }))
  };
}

function fromDB(id, html, name) {
  const D = grabConst(html, "DB");
  const secIndex = new Map(D.chapters.map((c, i) => [c.id, i]));
  return {
    id, name, intro: INTRO[id], sections: D.chapters.map(c => c.label), sources: D.sources,
    cats: cats(D.cats), nodes: nodes(D.nodes), edges: edges(D.edges), routes: routes(D.routes),
    questions: D.questions.map(q => ({
      t: q.title, s: q.short, d: q.details, ex: q.example, pit: q.trap, code: q.code || "",
      node: q.node, sec: secIndex.get(q.cat), f: [], refs: []
    }))
  };
}

function fromJvm(id, html, name) {
  const D = grabConst(html, "DATA"), BANK = grabConst(html, "BANK"), FOLLOW = grabConst(html, "Q_FOLLOW");
  const secIndex = new Map(D.cats.map((c, i) => [c.id, i]));
  const nodeCats = new Map(D.nodes.map(n => [n.id, n.cat]));
  const sources = [{ name: "小林 coding · JVM 面试题", url: "https://xiaolincoding.com/interview/jvm.html" }];
  for (const url of html.match(/https:\/\/docs\.oracle\.com[^"'<\s)]+/g) || []) {
    if (!sources.some(s => s.url === url)) sources.push({ name: "Oracle · " + (url.includes("z-garbage") ? "ZGC 调优指南" : "G1 调优指南"), url });
  }
  return {
    id, name, intro: INTRO[id], sections: D.cats.map(c => stripNo(c.label)), sources,
    cats: cats(D.cats), nodes: nodes(D.nodes), edges: edges(D.edges), routes: routes(D.routes),
    questions: D.questions.map((q, i) => ({
      t: q.q, s: BANK[i].short, d: BANK[i].details, ex: BANK[i].example, pit: BANK[i].pitfall, code: BANK[i].code || "",
      node: q.node, sec: secIndex.get(nodeCats.get(q.node)), f: FOLLOW[i] || [], refs: []
    }))
  };
}

const shell = fs.readFileSync(srcPath, "utf8");
const bundle = JSON.parse(shell.match(/<script type="application\/json" id="chapter-data">([\s\S]*?)<\/script>/)[1]);
const build = { basics: fromData, collections: fromData, concurrency: fromDB, jvm: fromJvm, spring: fromDB };
const chapters = [...bundle.map(c => build[c.id](c.id, c.html, c.name)), ...backend.chapters];

for (const c of chapters) {
  const ids = new Set(c.nodes.map(n => n.id));
  const bad = [
    ...c.questions.filter(q => !ids.has(q.node)).map(q => "题目节点缺失：" + q.t),
    ...c.edges.filter(e => !ids.has(e.a) || !ids.has(e.b)).map(e => "关系节点缺失：" + e.a + "→" + e.b),
    ...c.routes.flatMap(r => r.nodes.filter(n => !ids.has(n)).map(n => "路线节点缺失：" + r.id + "/" + n)),
    ...c.questions.filter(q => q.sec === undefined || !c.sections[q.sec]).map(q => "分组缺失：" + q.t),
    ...c.questions.filter(q => q.f.some(i => !c.questions[i])).map(q => "追问越界：" + q.t)
  ];
  if (bad.length) throw new Error(c.name + "\n" + bad.join("\n"));
  const answers = interviewAnswers[c.id];
  if (answers?.length !== c.questions.length) throw new Error(c.name + " 的面试回答数量不符");
  c.questions.forEach((q, i) => {
    q.f = q.f.filter(j => j !== i);
    const [title, answer] = answers[i];
    if (title !== q.t || !answer.trim()) throw new Error(c.name + " 的面试回答不匹配：" + q.t);
    q.interview = answer;
  });
}

const total = chapters.reduce((n, c) => n + c.questions.length, 0);
const nodeKeys = new Set(chapters.flatMap(c => c.nodes.map(n => c.id + ":" + n.id)));
for (const { a, b } of backend.bridges) {
  if (!nodeKeys.has(a) || !nodeKeys.has(b)) throw new Error("跨章关系节点缺失：" + a + " → " + b);
}
const out = { total, builtAt: new Date().toISOString().slice(0, 10), chapters, bridges: backend.bridges };
fs.writeFileSync(outPath, "window.QBANK = " + JSON.stringify(out) + ";\n");
console.log("已写入 " + path.relative(root, outPath) + "：" + chapters.map(c => c.name + " " + c.questions.length).join("，") + "，共 " + total + " 题");
