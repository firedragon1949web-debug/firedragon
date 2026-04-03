/**
 * 线上 Worker 健康检查（无日志文件、无调试会话 ID）。
 * 在 workers 目录：npm run probe
 * 环境变量 MEMBER_PROBE_BASE=https://你的子域.workers.dev（无末尾 /）可覆盖默认基址。
 * 退出码：0=GET /api/health 为 200 且返回 JSON 且 ok===true；1=失败。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_BASE = "https://testbackend.milcefarmer-19f.workers.dev";
const BASE = (process.env.MEMBER_PROBE_BASE || DEFAULT_BASE).replace(/\/$/, "");

/** Windows 上紧跟 fetch 的 process.exit 偶发触发 libuv 断言，延后到下一事件循环再退出。 */
function exitSoon(code) {
  setImmediate(() => process.exit(code));
}

function die(msg) {
  console.error("[probe]", msg);
  exitSoon(1);
}

try {
  const toml = fs.readFileSync(path.join(repoRoot, "wrangler.toml"), "utf8");
  if (toml.includes("REPLACE_WITH_YOUR_D1_DATABASE_ID")) {
    die("仓库根 wrangler.toml 的 database_id 仍是占位符。请 npm run set-d1 -- <uuid> 后 npm run deploy。");
  }

  const url = `${BASE}/api/health`;
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "";

  if (res.status !== 200) {
    die(`GET ${url} → HTTP ${res.status}，Content-Type: ${ct || "(empty)"}`);
  }
  if (!String(ct).includes("application/json")) {
    die(`GET ${url} 期望 application/json，实际: ${ct || "(empty)"}`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    die(`GET ${url} 响应不是合法 JSON`);
  }
  if (!body || body.ok !== true) {
    die(`GET ${url} JSON 中缺少 ok: true`);
  }

  console.log("[probe] 通过", url, body.service ? `(${body.service})` : "", body.time || "");
  exitSoon(0);
} catch (e) {
  console.error("[probe] 异常:", e && e.message ? e.message : e);
  exitSoon(1);
}
