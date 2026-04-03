/**
 * 同一 Cloudflare 账号下：旧库 + 新库 一键复制 admins。
 *
 * 若旧库、新库分属两个账号：无法用本脚本一次完成，请改用
 *   npm run export-admins（旧账号）→ npm run import-admins（新账号）
 *
 * 流程：对新库 schema → 从 wrangler-old-d1.toml 读 admins → 写入 wrangler.toml 指向的新库。
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workersDir = __dirname;
const rootWrangler = path.join(workersDir, "..", "wrangler.toml");
const oldWrangler = path.join(workersDir, "wrangler-old-d1.toml");
function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: workersDir, stdio: ["pipe", "pipe", "pipe"] });
}

function escapeSql(s) {
  return String(s).replace(/'/g, "''");
}

function parseD1Json(stdout) {
  const t = stdout.trim();
  const j = JSON.parse(t);
  const first = Array.isArray(j) ? j[0] : j;
  if (first && Array.isArray(first.results)) return first.results;
  if (first && first.result && Array.isArray(first.result)) return first.result;
  return [];
}

console.log("Step 1: schema on NEW D1 (my) …");
try {
  sh(`npx wrangler d1 execute my --remote --file=./schema.sql --config "${rootWrangler}"`);
} catch (e) {
  console.warn("(schema 可能已存在，继续)");
}

console.log("Step 2: read admins from OLD D1 …");
let rows;
try {
  const out = sh(
    `npx wrangler d1 execute my --remote --config "${oldWrangler}" --json --command "SELECT username, password_hash FROM admins"`
  );
  rows = parseD1Json(out);
} catch (e) {
  console.error(e.stderr || e.message || e);
  console.error("\n无法读取旧库。请确认 wrangler-old-d1.toml 里的 database_id 是否为旧 D1。");
  process.exit(1);
}

if (!rows.length) {
  console.error("旧库 admins 表为空。请手动插入或使用 README 中的 INSERT 命令。");
  process.exit(1);
}

console.log("Step 3: write admins to NEW D1 …");
try {
  sh(
    `npx wrangler d1 execute my --remote --config "${rootWrangler}" --command "DELETE FROM admins;"`
  );
} catch (e) {
  console.warn("(DELETE FROM admins 失败可忽略，例如表尚不存在)");
}
for (const r of rows) {
  const u = escapeSql(r.username);
  const h = escapeSql(r.password_hash);
  const sql = `INSERT INTO admins (username, password_hash) VALUES ('${u}','${h}');`;
  try {
    sh(`npx wrangler d1 execute my --remote --config "${rootWrangler}" --command "${sql}"`);
  } catch (e) {
    const err = (e.stderr || e.message || String(e)).toLowerCase();
    if (err.includes("7404") || err.includes("could not be found")) {
      console.error(
        "\n新 D1 在 Cloudflare 上找不到（code 7404）。请确认：\n" +
          "1) 控制台已创建名为 my 的 D1，且 UUID 与仓库根 wrangler.toml 的 database_id 一致；\n" +
          "2) 当前 npx wrangler 登录的账号与创建该库的是同一账号。\n"
      );
    }
    throw e;
  }
}

console.log("完成：已复制 " + rows.length + " 条管理员记录到新 D1，可用原用户名与密码登录。");
