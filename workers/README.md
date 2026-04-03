# Firedragon Members API (Cloudflare Workers + D1)

## 1) 安装

```bash
cd workers
npm install
```

## 2) 创建 D1 数据库并写入 `wrangler.toml`

```bash
wrangler d1 create firedragon_members
```

把返回的 `database_id` 填到 `wrangler.toml`。

## 3) 执行建表

```bash
wrangler d1 execute firedragon_members --file=./schema.sql
```

## 4) 初始化管理员账号（示例）

密码采用 SHA-256（后端同算法验证）。可以用以下命令生成哈希：

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode('YourStrongPassword')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))"
```

然后插入（示例用户名 `admin`）：

```bash
wrangler d1 execute firedragon_members --command=\"INSERT INTO admins (username, password_hash) VALUES ('admin', 'REPLACE_HASH');\"
```

## 5) 本地调试 / 部署

```bash
npm run dev
npm run deploy
```

## API 路由

- `POST /api/registrations` 公开登记
- `POST /api/admin/login` 管理员登录
- `POST /api/admin/logout` 管理员登出
- `GET /api/admin/me` 检查登录状态
- `GET /api/admin/registrations` 管理员查看登记
- `PUT /api/admin/registrations/:id` 管理员更新登记
- `DELETE /api/admin/registrations/:id` 管理员删除登记
