# Firedragon Members API (Cloudflare Workers + D1)

## 0) Worker 名称与域名

仓库**根目录**的 `wrangler.toml` 里的 `name` 决定默认部署后的子域：`{name}.{账户子域}.workers.dev`。

若你在浏览器里用的是 `https://testbackend.xxx.workers.dev`，则 `name` 必须是 `testbackend`，并在该 Worker 上部署本仓库代码；否则会一直出现 **404 空响应**（请求打到了没有 API 的另一个 Worker）。

部署（配置在仓库根 `wrangler.toml`，脚本在 `workers/`）：

```bash
cd workers
npm run deploy
```

若控制台里 Worker 名已固定为别的名字，可：`npx wrangler deploy --config ../wrangler.toml --name 你的Worker名`，或改仓库根 `wrangler.toml` 的 `name` 与之一致。

自检：浏览器打开 `https://你的子域.workers.dev/api/health` 应返回 JSON（含 `ok: true`）。

本仓库已在仓库根 `wrangler.toml` 中配置 `[assets]`，静态文件放在 `workers/public/`（含 `admin.html`、`member-register.html`）。部署后：

- `https://你的子域.workers.dev/admin.html` 或 `/admin`（会 302 到 `admin.html`）为后台页面；
- 同一域名下的 `/api/*` 由 Worker 脚本处理。

若仍出现 **`POST /api/...` 404**：说明线上 `testbackend` 尚未成功部署过当前 Worker，或 Git 构建未读到仓库根的 `wrangler.toml`（勿把 Cloudflare 的 Root directory 设成仅 `workers` 却又删掉根配置——本仓库以**仓库根**的 `wrangler.toml` 为准）。

## 1) 安装

```bash
cd workers
npm install
```

## 2) D1 与 `wrangler.toml`

本仓库已按控制台中的库名 **`my`** 配置 `database_name` 与 `database_id`。若你新建了别的库，请改仓库根 `wrangler.toml` 里对应两项，或用：

```bash
cd workers
npm run set-d1 -- <你的-UUID>
```

## 3) 执行建表（远程 D1，线上生效）

```bash
cd workers
npm run db:migrate:remote
```

（等价于 `npx wrangler d1 execute my --remote --file=./schema.sql --config ../wrangler.toml`。仅本地调试可用 `npm run db:migrate:local`。）

## 4) 初始化管理员账号（示例）

密码采用 SHA-256（后端同算法验证）。可以用以下命令生成哈希：

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode('YourStrongPassword')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))"
```

然后插入（示例用户名 `admin`）：

```bash
cd workers
npx wrangler d1 execute my --remote --config ../wrangler.toml --command=\"INSERT INTO admins (username, password_hash) VALUES ('admin', 'REPLACE_HASH');\"
```

## 5) 本地调试 / 部署

```bash
npm run dev
npm run deploy
```

## GitHub 接到 Cloudflare Workers 仍失败？常见原因

1. **构建根目录**  
   本仓库的 `wrangler.toml` 在**仓库根目录**。连接 Git 时 **Root directory 留空/用仓库根** 即可；**不要**再强制设为 `workers`（除非你在 `workers/` 下另放一份配置，本仓库未采用该方式）。

2. **仓库根 `wrangler.toml` 里 `database_id` 仍是占位符**  
   必须把真实 `database_id` 填进仓库根的 `wrangler.toml`，并对远程 D1 执行过 `npm run db:migrate:remote`（建表）。

3. **前端域名和 CORS 不一致**  
   静态页在 `https://xxx.github.io` 或 `https://xxx.pages.dev`，而 API 在 `*.workers.dev` 时，浏览器会带 `Origin`。  
   请在仓库根 `wrangler.toml` 的 `ALLOWED_ORIGINS` 里**加上你的静态站完整域名**（多个用英文逗号分隔），保存后重新部署 Worker。

4. **登记页没指向 Worker**  
   `member-register.html` / `admin.html` 里需要设置  
   `window.MEMBER_API_BASE = "https://你的worker域名.workers.dev"`（与 `wrangler.toml` 里 `name` 部署后的地址一致）。

5. **管理后台跨域登录**  
   管理页与 API 不同域名时，会话 Cookie 已使用 `SameSite=None; Secure`，请全程使用 **HTTPS**。

## API 路由

- `POST /api/registrations` 公开登记
- `POST /api/admin/login` 管理员登录
- `POST /api/admin/logout` 管理员登出
- `GET /api/admin/me` 检查登录状态
- `GET /api/admin/registrations` 管理员查看登记
- `PUT /api/admin/registrations/:id` 管理员更新登记
- `DELETE /api/admin/registrations/:id` 管理员删除登记
