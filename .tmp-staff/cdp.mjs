import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.cwd()}/.tmp-staff/edge-cdp2`,
  "--no-first-run",
  "about:blank",
]);

async function getJson(path) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(200);
  }
  throw new Error("CDP not ready");
}

const targets = await getJson("/json/list");
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

async function evaluate(expression, awaitPromise = true) {
  const res = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  if (res.result?.exceptionDetails) {
    console.error("EVAL ERROR", JSON.stringify(res.result.exceptionDetails));
  }
  return res.result?.result?.value;
}

async function go(url, wait = 2500) {
  await send("Page.navigate", { url });
  await sleep(wait);
}

async function shot(out) {
  const res = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(res.result.data, "base64"));
  console.log("saved", out);
}

await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

await go("http://localhost:5173/login", 1500);
const login = await evaluate(`(async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardCode: 'tv001@huit.edu.vn', password: 'Huit@123' })
  });
  const data = await res.json();
  localStorage.setItem('huit-roman-token', data.token);
  localStorage.setItem('huit-roman-user', JSON.stringify(data.user));
  return { ok: res.ok, role: data.user?.role, name: data.user?.fullName };
})()`);
console.log("login", login);

await go("http://localhost:5173/staff", 4000);
await evaluate(`window.scrollTo(0, 400)`);
await sleep(600);
const metrics = await evaluate(`(() => {
  const side = document.querySelector('aside.admin-sidebar-modern');
  const topbar = document.querySelector('header.admin-topbar-modern');
  const r = side?.getBoundingClientRect();
  return {
    scrollY: window.scrollY,
    sidebarTop: r?.top,
    sidebarHeight: r?.height,
    sidebarPosition: side && getComputedStyle(side).position,
    topbarTop: topbar?.getBoundingClientRect().top,
    avatarExists: !!document.querySelector('.admin-topbar-user-avatar'),
  };
})()`);
console.log("scroll metrics", metrics);
await shot("K:/KLCN/HUIT-RoMan/.tmp-staff/v2-scrolled.png");

await evaluate(`window.scrollTo(0, 0)`);
await sleep(300);

const clickTab = (label) => evaluate(`(() => {
  const btn = [...document.querySelectorAll('.admin-nav-item-btn')].find(b => b.textContent.trim().startsWith(${JSON.stringify(label)}));
  if (!btn) return 'not found';
  btn.click();
  return 'clicked';
})()`);

console.log("rooms tab", await clickTab("Quản lý phòng"));
await sleep(2500);
const roomsInfo = await evaluate(`(() => {
  const pag = document.querySelector('nav[aria-label="Phân trang danh sách phòng"]');
  const summary = pag?.querySelector('.pagination-summary')?.textContent?.replace(/\\s+/g, ' ').trim();
  const pages = pag ? [...pag.querySelectorAll('.pagination-controls button')].map(b => b.textContent.trim() || b.getAttribute('aria-label')) : [];
  if (pag) pag.scrollIntoView({ block: 'center' });
  return { hasPagination: !!pag, summary, pages };
})()`);
console.log("rooms pagination", roomsInfo);
await sleep(400);
await shot("K:/KLCN/HUIT-RoMan/.tmp-staff/v2-rooms-pagination.png");

console.log("shifts tab", await clickTab("Ca trực"));
await sleep(2500);
const shiftsInfo = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('.shift-calendar-week article, .shift-calendar-week > div')].slice(0, 3);
  const grid = document.querySelector('.shift-calendar-week');
  return {
    gridCols: grid && getComputedStyle(grid).gridTemplateColumns,
    firstCards: cards.map(c => c.textContent.replace(/\\s+/g, ' ').trim().slice(0, 120)),
  };
})()`);
console.log("shifts", shiftsInfo);
await shot("K:/KLCN/HUIT-RoMan/.tmp-staff/v2-shifts.png");

console.log("timeline tab", await clickTab("Lịch tổng thể"));
await sleep(4500);
const timelineInfo = await evaluate(`(() => {
  const root = document.querySelector('.admin-embedded-schedule .schedule-matrix-page');
  const oldMock = document.querySelector('.admin-kpi-summary-strip, .admin-matrix-table');
  const hero = root?.querySelector('.hero-page-title')?.textContent;
  const heroRow = document.querySelector('.admin-page-hero-row');
  return {
    hasRealSchedule: !!root,
    heroTitle: hero,
    oldMockStillPresent: !!oldMock,
    adminHeroRowHidden: !heroRow,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
})()`);
console.log("timeline", timelineInfo);
await shot("K:/KLCN/HUIT-RoMan/.tmp-staff/v2-timeline.png");

// Mobile check on timeline
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await evaluate(`window.scrollTo(0, 0)`);
await sleep(1200);
const mobileInfo = await evaluate(`(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  hasRealSchedule: !!document.querySelector('.admin-embedded-schedule .schedule-matrix-page'),
}))()`);
console.log("mobile timeline", mobileInfo);
await shot("K:/KLCN/HUIT-RoMan/.tmp-staff/v2-timeline-mobile.png");

ws.close();
edge.kill();
