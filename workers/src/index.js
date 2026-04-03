function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

/**
 * 支持多个前端域名：在 wrangler 里配置 ALLOWED_ORIGINS（逗号分隔），
 * 例如：https://www.firedragon.org.hk,https://xxx.github.io
 * 仍兼容旧的单值 ALLOWED_ORIGIN。
 */
function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const selfOrigin = new URL(request.url).origin;
  const raw = (env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "").trim();
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);

  // 管理页 / 登记页若直接部署在同一 Worker 域名下，浏览器会带 Origin=本域名；
  // 若未把 *.workers.dev 写进 ALLOWED_ORIGINS，预检 OPTIONS 会 403 空响应，导致登录失败。
  let allowOrigin;
  if (origin && origin === selfOrigin) {
    allowOrigin = origin;
  } else if (!list.length) {
    allowOrigin = origin || "*";
  } else if (!origin) {
    allowOrigin = list[0];
  } else if (list.includes(origin)) {
    allowOrigin = origin;
  } else {
    return null;
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin"
  };
}

function parseCookie(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((x) => {
    const idx = x.indexOf("=");
    if (idx > -1) out[x.slice(0, idx).trim()] = decodeURIComponent(x.slice(idx + 1).trim());
  });
  return out;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function requireAdmin(request, env) {
  const cookies = parseCookie(request.headers.get("Cookie"));
  const token = cookies.admin_session;
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT s.id, s.admin_id, a.username
     FROM admin_sessions s
     JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2`
  ).bind(tokenHash, now).first();
  return row || null;
}

function validateRegistration(payload) {
  const required = ["name", "email", "country_region", "phone_country_code", "phone_number"];
  for (const key of required) {
    if (!payload[key] || String(payload[key]).trim() === "") return `缺少字段: ${key}`;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(payload.email))) return "邮箱格式不正确";
  return null;
}

/** D1/SQLite 写入失败时判断是否按「容量不足」向用户展示 */
function isStorageCapacityError(message) {
  const m = String(message || "").toLowerCase();
  if (!m) return false;
  if (m.includes("database is full") || m.includes("database or disk is full")) return true;
  if (m.includes("sqlite_full") || m.includes("sql_full")) return true;
  if (m.includes("disk full") || m.includes("no space left")) return true;
  if (m.includes("quota") && (m.includes("exceed") || m.includes("limit"))) return true;
  if (m.includes("storage") && (m.includes("limit") || m.includes("exceed"))) return true;
  return false;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const c = getCorsHeaders(request, env);
  if (!c) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 403 });
    }
    return new Response(JSON.stringify({ error: "CORS: 前端域名未加入 Worker 的 ALLOWED_ORIGINS" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: c });

  try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({ ok: true, service: "firedragon-members-api", time: new Date().toISOString() }, 200, c);
      }

      if (url.pathname === "/api/registrations" && request.method === "POST") {
        const body = await request.json();
        const err = validateRegistration(body);
        if (err) return json({ error: err }, 400, c);

        const emailTrim = String(body.email).trim();
        const maxReg = parseInt(String(env.MAX_REGISTRATIONS || "0").trim(), 10);
        if (maxReg > 0) {
          const cntRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM registrations").first();
          const n = cntRow && cntRow.n != null ? Number(cntRow.n) : 0;
          if (n >= maxReg) {
            return json({ error: "数据库容量不足，请稍后再试或联系管理员" }, 507, c);
          }
        }

        const dup = await env.DB.prepare(
          `SELECT 1 AS x FROM registrations WHERE lower(trim(email)) = lower(trim(?1)) LIMIT 1`
        )
          .bind(emailTrim)
          .first();
        if (dup) {
          return json({ error: "该邮箱已登记过" }, 409, c);
        }

        try {
          await env.DB.prepare(
            `INSERT INTO registrations
            (name, email, country_region, phone_country_code, phone_number, vip_number)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
          )
            .bind(
              String(body.name).trim(),
              emailTrim,
              String(body.country_region).trim(),
              String(body.phone_country_code).trim(),
              String(body.phone_number).trim(),
              body.vip_number ? String(body.vip_number).trim() : null
            )
            .run();
        } catch (dbErr) {
          const msg = dbErr && dbErr.message ? String(dbErr.message) : "";
          if (isStorageCapacityError(msg)) {
            return json({ error: "数据库容量不足，请稍后再试或联系管理员" }, 507, c);
          }
          throw dbErr;
        }

        return json({ ok: true }, 201, c);
      }

      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!username || !password) return json({ error: "账号或密码不能为空" }, 400, c);

        const admin = await env.DB.prepare("SELECT id, username, password_hash FROM admins WHERE username = ?1")
          .bind(username).first();
        if (!admin) return json({ error: "账号或密码错误" }, 401, c);

        const inputHash = await sha256Hex(password);
        if (inputHash !== admin.password_hash) return json({ error: "账号或密码错误" }, 401, c);

        const token = randomToken();
        const tokenHash = await sha256Hex(token);
        const sessionDays = parseInt(env.SESSION_DAYS || "7", 10);
        const expires = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare(
          "INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?1, ?2, ?3)"
        ).bind(admin.id, tokenHash, expires).run();

        // 管理页在 GitHub Pages、官网等不同域名时，需 SameSite=None 才能跨站带 Cookie
        return json(
          { ok: true, username: admin.username },
          200,
          {
            ...c,
            "Set-Cookie": `admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=${sessionDays * 24 * 60 * 60}`
          }
        );
      }

      if (url.pathname === "/api/admin/logout" && request.method === "POST") {
        const cookies = parseCookie(request.headers.get("Cookie"));
        const token = cookies.admin_session;
        if (token) {
          const tokenHash = await sha256Hex(token);
          await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?1").bind(tokenHash).run();
        }
        return json({ ok: true }, 200, { ...c, "Set-Cookie": "admin_session=; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=0" });
      }

      if (url.pathname === "/api/admin/me" && request.method === "GET") {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "未登录" }, 401, c);
        return json({ ok: true, user: { id: admin.admin_id, username: admin.username } }, 200, c);
      }

      if (url.pathname === "/api/admin/registrations" && request.method === "GET") {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "未授权" }, 401, c);

        const rs = await env.DB.prepare(
          `SELECT id, name, email, country_region, phone_country_code, phone_number, vip_number, created_at
           FROM registrations ORDER BY id DESC`
        ).all();
        return json({ ok: true, items: rs.results || [] }, 200, c);
      }

      if (url.pathname.startsWith("/api/admin/registrations/")) {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "未授权" }, 401, c);
        const id = Number(url.pathname.split("/").pop());
        if (!id) return json({ error: "无效ID" }, 400, c);

        if (request.method === "DELETE") {
          await env.DB.prepare("DELETE FROM registrations WHERE id = ?1").bind(id).run();
          return json({ ok: true }, 200, c);
        }

        if (request.method === "PUT") {
          const body = await request.json();
          const err = validateRegistration(body);
          if (err) return json({ error: err }, 400, c);
          const emailTrim = String(body.email).trim();
          const other = await env.DB.prepare(
            `SELECT id FROM registrations WHERE lower(trim(email)) = lower(trim(?1)) AND id != ?2 LIMIT 1`
          )
            .bind(emailTrim, id)
            .first();
          if (other) {
            return json({ error: "该邮箱已被其他记录使用" }, 409, c);
          }
          await env.DB.prepare(
            `UPDATE registrations
             SET name=?1, email=?2, country_region=?3, phone_country_code=?4, phone_number=?5, vip_number=?6
             WHERE id=?7`
          ).bind(
            String(body.name).trim(),
            emailTrim,
            String(body.country_region).trim(),
            String(body.phone_country_code).trim(),
            String(body.phone_number).trim(),
            body.vip_number ? String(body.vip_number).trim() : null,
            id
          ).run();
          return json({ ok: true }, 200, c);
        }
      }

      return json({ error: "Not Found" }, 404, c);
  } catch (err) {
    return json({ error: err && err.message ? err.message : "服务器错误" }, 500, c);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api")) {
      return handleApi(request, env);
    }
    if (url.pathname === "/admin" && request.method === "GET") {
      return Response.redirect(new URL("/admin.html", request.url).href, 302);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
