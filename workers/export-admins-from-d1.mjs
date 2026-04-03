/**
 * 在「旧 Cloudflare 账号」下使用：先 npx wrangler login 登录旧账号，
 * 再执行本脚本，从 workers/wrangler-old-d1.toml 指向的 D1 导出 admins 到 admins.seed.json。
 *
 * 然后 wrangler logout，登录新账号，执行 npm run import-admins
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workersDir = __dirname;
const oldWrangler = path.join(workersDir, "wrangler-old-d1.toml");
const outFile = path.join(workersDir, "admins.seed.json");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: workersDir, stdio: ["pipe", "pipe", "pipe"] });
}

function parseD1Json(stdout) {
  const t = stdout.trim();
  const j = JSON.parse(t);
  const first = Array.isArray(j) ? j[0] : j;
  if (first && Array.isArray(first.results)) return first.results;
  if (first && first.result && Array.isArray(first.result)) return first.result;
  return [];
}

console.log("从旧 D1 读取 admins（请确认当前 wrangler 已登录「旧账号」）…");
let rows;
try {
  const out = sh(
    `npx wrangler d1 execute my --remote --config "${oldWrangler}" --json --command "SELECT username, password_hash FROM admins"`
  );
  rows = parseD1Json(out);
} catch (e) {
  console.error(e.stderr || e.message || e);
  console.error("\n失败：请检查 1) 已登录旧账号 2) wrangler-old-d1.toml 的 database_id 正确。");
  process.exit(1);
}

if (!rows.length) {
  console.error("admins 表为空。");
  process.exit(1);
}

fs.writeFileSync(outFile, JSON.stringify(rows, null, 2), "utf8");
console.log("已写入 " + outFile + "（共 " + rows.length + " 条，勿提交到 Git）。");
console.log("下一步：npx wrangler logout → 登录新账号 → npm run import-admins");
