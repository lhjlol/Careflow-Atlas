#!/usr/bin/env node
// CareFlow Atlas —— 浏览器端到端检查（可选工具）。
//
// 用途：验证**容器里跑的是一个真能用的应用**，而不只是「字节发出去了」。
// `deploy/verify.sh` 管的是 HTTP 层（状态码、缓存头、容器行为）；这个脚本
// 再往上一层，用真实 Chromium 走一遍核心流程：开页 → 导入中文範本 →
// 解析 → 合并 → 写 localStorage → 刷新 → 看地图底图。
//
// 前置（**故意不放进 package.json**，避免给所有人平白多装一个 150MB 浏览器）：
//     npm i -D playwright && npx playwright install chromium
//
// 用法：
//     node deploy/verify-browser.mjs                      # 默认 http://127.0.0.1:8080
//     node deploy/verify-browser.mjs http://vps:8080
//
// 注意：地图一项需要**这台机器能连 OpenFreeMap**。连不上时底图会失败，
// 但那是网络问题，不代表部署有问题——脚本会把它和真正的失败分开报告。

// 仓库里 scripts/*.mjs 的惯例：显式 import node 全局，而不是去放宽 eslint 配置。
import process from 'node:process';
import console from 'node:console';

const BASE = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/$/, '');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('找不到 playwright。请先执行：npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const results = [];
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

const ok = (d) => { results.push(['PASS', d]); console.log(`  [通过] ${d}`); };
const bad = (d, detail) => { results.push(['FAIL', d]); console.log(`  [失败] ${d}${detail ? ' :: ' + detail : ''}`); };
const warn = (d, detail) => { results.push(['WARN', d]); console.log(`  [存疑] ${d}${detail ? ' :: ' + detail : ''}`); };

// 用完整版 chromium：headless shell 的 WebGL 支持受限，会让 MapLibre 建不出
// 画布，把「浏览器能力不足」误判成「部署有问题」。
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--enable-unsafe-swiftshader', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`));

console.log(`\n目标：${BASE}\n`);

// ── 1. 页面能开 ────────────────────────────────────────────────
const resp = await page.goto(BASE, { waitUntil: 'domcontentloaded' });
if (resp?.status() === 200) ok('首页返回 200');
else bad('首页返回 200', `实测 ${resp?.status()}`);

// ── 2. 应用真的挂载了（不是白屏）────────────────────────────────
try {
  await page.waitForSelector('.brand strong', { timeout: 15000 });
  ok('React 应用挂载成功（品牌元素出现，非白屏）');
} catch { bad('React 应用挂载成功', '15 秒内没等到 .brand strong'); }

// page.evaluate 的回调在**浏览器**里执行，所以浏览器全局一律走 globalThis，
// 这样既不触发 eslint 的 no-undef，语义也完全一致。
const mounted = await page.evaluate(() => !!globalThis.document.querySelector('#root')?.children.length);
if (mounted) ok('ES module 被浏览器执行（#root 有子节点）');
else bad('ES module 被浏览器执行', '#root 为空');

// ── 3. 打开纸本与 Excel 工作台 ──────────────────────────────────
try {
  await page.getByRole('button', { name: '紙本與 Excel' }).click();
  await page.waitForSelector('dialog[open]', { timeout: 8000 });
  ok('侧栏「紙本與 Excel」能打开对话框');
} catch (e) { bad('打开对话框', String(e).slice(0, 120)); }

// ── 4. 「檢視 mock 範例」→ 验证 /demo/ 路由 + 浏览器内解析 ────────
let parsed = false;
try {
  await page.getByRole('button', { name: '檢視 mock 範例' }).click();
  await page.waitForSelector('.cf-review', { timeout: 20000 });
  const summary = await page.locator('.cf-review__summary').innerText();
  parsed = summary.includes('已解析');
  if (parsed) ok('中文六表範本从服务端取回并被解析成功');
  else bad('範本解析', summary.replace(/\n/g, ' '));
} catch (e) { bad('点「檢視 mock 範例」并等待解析结果', String(e).slice(0, 160)); }

if (parsed) {
  try {
    const counts = await page.locator('.cf-counts').innerText();
    ok(`解析出实体计数：${counts.replace(/\n/g, ' ')}`);
  } catch { bad('读取解析计数', '找不到 .cf-counts'); }

  // ── 5. 确认合并 → 状态变化 ───────────────────────────────────
  try {
    await page.getByRole('button', { name: '確認合併資料' }).click();
    await page.waitForSelector('.toast', { timeout: 15000 });
    const toast = await page.locator('.toast').innerText();
    if (toast.includes('已合併')) ok(`合并成功：「${toast.replace(/\n/g, ' ')}」`);
    else bad('合并提示', toast);
  } catch (e) { bad('确认合并', String(e).slice(0, 140)); }

  try {
    await page.waitForSelector('.list-heading', { timeout: 10000 });
    const heading = await page.locator('.list-heading').innerText();
    if (/\d+\s*幢/.test(heading)) ok(`侧栏出现大廈清单：${heading.replace(/\n/g, ' ')}`);
    else bad('侧栏大廈清单', heading);
  } catch (e) { bad('等待侧栏清单', String(e).slice(0, 120)); }
}

// ── 6. localStorage 落盘 + 刷新后仍在 ──────────────────────────
const lsKeys = await page.evaluate(() => Object.keys(globalThis.localStorage));
if (lsKeys.length > 0) ok(`localStorage 已写入：${lsKeys.join(', ')}`);
else bad('localStorage 已写入', '键为空');

await page.reload({ waitUntil: 'domcontentloaded' });
try {
  await page.waitForSelector('.list-heading', { timeout: 15000 });
  const after = await page.locator('.list-heading').innerText();
  if (/\d+\s*幢/.test(after)) ok(`刷新后数据仍在：${after.replace(/\n/g, ' ')}`);
  else bad('刷新后数据仍在', after);
} catch (e) { bad('刷新后数据仍在', String(e).slice(0, 120)); }

// ── 7. MapLibre 画布与底图 ────────────────────────────────────
// MapScene 是 lazy() 懒加载，画布要等 chunk 到位 + WebGL 初始化才出现，
// 必须等，不能查一下就走。
try {
  await page.waitForSelector('.maplibregl-canvas', { timeout: 25000 });
  const info = await page.evaluate(() => {
    const c = globalThis.document.querySelector('.maplibregl-canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return { w: c.width, h: c.height, webgl: !!gl };
  });
  if (info.w > 0) ok(`MapLibre 画布已创建（${info.w}x${info.h}，WebGL=${info.webgl}）`);
  else bad('MapLibre 画布尺寸', JSON.stringify(info));
} catch { bad('MapLibre 画布已创建', '25 秒内没出现 .maplibregl-canvas'); }

let tiles = [];
for (let i = 0; i < 20 && tiles.length === 0; i++) {
  tiles = await page.evaluate(() => globalThis.performance.getEntriesByType('resource')
    .map((e) => e.name).filter((n) => /tiles\.openfreemap\.org|\.pbf/.test(n)));
  if (!tiles.length) await page.waitForTimeout(1000);
}
if (tiles.length > 0) ok(`底图资源已请求 ${tiles.length} 条（如 ${tiles[0].slice(0, 68)}…）`);
else warn('底图资源未请求', '可能是这台机器连不上 OpenFreeMap；请在有外网的机器上复核，别据此判定部署失败');

// ── 8. 控制台干净 ─────────────────────────────────────────────
if (pageErrors.length === 0) ok('无未捕获的页面异常');
else bad('无未捕获的页面异常', pageErrors.slice(0, 3).join(' | '));

if (consoleErrors.length === 0) ok('控制台无 error');
else bad('控制台无 error', consoleErrors.slice(0, 3).join(' | '));

const realFailed = failedRequests.filter((f) => !/openfreemap|favicon/.test(f));
if (realFailed.length === 0) ok('无失败的资源请求');
else bad('无失败的资源请求', realFailed.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => r[0] === 'FAIL').length;
const warned = results.filter((r) => r[0] === 'WARN').length;
console.log(`\n  通过 ${results.length - failed - warned} 项，失败 ${failed} 项，存疑 ${warned} 项。`);
if (consoleErrors.length) {
  console.log('\n  控制台 error 全文：');
  consoleErrors.forEach((e) => console.log('    ' + e.slice(0, 200)));
}
process.exit(failed > 0 ? 1 : 0);
