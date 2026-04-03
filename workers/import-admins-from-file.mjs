/**
 * 在「新 Cloudflare 账号」下使用：先 npx wrangler login 登录新账号，
 * 且仓库根 wrangler.toml 的 database_id 已是新库。
 * 读取 workers/admins.seed.json（由 export-admins 生成），写入新 D1。
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workersDir = __dirname;
const rootWrangler = path.join(workersDir, "..", "wrangler.toml");
const seedFile = path.join(workersDir, "admins.seed.json");

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: workersDir, stdio: ["pipe", "pipe", "pipe"] });
}

function escapeSql(s) {
  return String(s).replace(/'/g, "''");
}

if (!fs.existsSync(seedFile)) {
  console.error("找不到 " + seedFile + "。请先在旧账号执行：npm run export-admins");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(seedFile, "utf8"));
if (!Array.isArray(rows) || !rows.length) {
  console.error("admins.seed.json 格式错误或为空。");
  process.exit(1);
}

console.log("Step 1: 新库建表 …");
try {
  sh(`npx wrangler d1 execute my --remote --file=./schema.sql --config "${rootWrangler}"`);
} catch (e) {
  console.warn("(schema 可能已存在，继续)");
}

console.log("Step 2: 写入 admins …");
try {
  sh(`npx wrangler d1 execute my --remote --config "${rootWrangler}" --command "DELETE FROM admins;"`);
} catch (e) {
  console.warn("(DELETE 失败可忽略)");
}

for (const r of rows) {
  const u = escapeSql(r.username);
  const h = escapeSql(r.password_hash);
  const sql = `INSERT INTO admins (username, password_hash) VALUES ('${u}','${h}');`;
  sh(`npx wrangler d1 execute my --remote --config "${rootWrangler}" --command "${sql}"`);
}

console.log("完成：已导入 " + rows.length + " 条管理员，用户名与密码与导出时一致。");
console.log("可删除本地 admins.seed.json（含密码哈希，勿泄露）。");
