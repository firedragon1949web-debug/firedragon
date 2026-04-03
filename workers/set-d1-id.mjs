/**
 * 将仓库根 wrangler.toml 里的 D1 database_id 写成命令行传入的 UUID。
 * 用法（在 workers 目录）：npm run set-d1 -- <uuid>
 * 或：node set-d1-id.mjs <uuid>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tomlPath = path.join(__dirname, "..", "wrangler.toml");
const id = (process.argv[2] || "").trim();
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!id || !uuidRe.test(id)) {
  console.error("用法: npm run set-d1 -- <D1-database-id-uuid>");
  console.error("示例: npm run set-d1 -- a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  process.exit(1);
}

let s = fs.readFileSync(tomlPath, "utf8");
const next = s.replace(/^database_id = ".*"$/m, `database_id = "${id}"`);
if (next === s) {
  console.error("[set-d1-id] 未找到可替换的 database_id 行:", tomlPath);
  process.exit(1);
}

fs.writeFileSync(tomlPath, next, "utf8");
console.log("[set-d1-id] 已写入", tomlPath);
console.log("[set-d1-id] 下一步: npm run deploy，然后 npm run probe（健康检查）");
