import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tomlPath = path.join(__dirname, "..", "wrangler.toml");
const toml = fs.readFileSync(tomlPath, "utf8");
if (toml.includes("REPLACE_WITH_YOUR_D1_DATABASE_ID")) {
  console.error(
    "[check-wrangler] wrangler.toml 里 database_id 仍是占位符。\n" +
      "请执行: npx wrangler d1 create <库名> 或在控制台创建 D1，把 database_id 写入仓库根 wrangler.toml。\n" +
      "把返回的 database_id 填入仓库根目录的 wrangler.toml，再在 workers 目录执行 npm run deploy。\n" +
      "否则 Worker 往往无法成功部署，线上会只有静态页、/api 全部 404。"
  );
  process.exit(1);
}
console.log("[check-wrangler] database_id 已配置，可继续 deploy。");
