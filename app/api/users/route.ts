import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  handbookAuditLog,
  handbookSessions,
  handbookUserPermissions,
  handbookUsers,
} from "../../../db/schema";
import { requireApiAccess } from "../../../lib/authorization";
import { createPasswordHash } from "../../../lib/passwords";
import { isRole, isSectionKey } from "../../../lib/permissions";
import { isUnitKey } from "../../../lib/units";

async function requireAdmin(request: Request) {
  const access = await requireApiAccess(request);
  return access?.role === "super_admin" ? access : null;
}

function normalizeUsername(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function validUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) && username !== "user" && username !== "admin";
}

function safeUser(user: typeof handbookUsers.$inferSelect) {
  return {
    id: user.id,
    username: user.username ?? (user.role === "super_admin" ? "admin" : ""),
    fullName: user.fullName,
    title: user.title,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "دسترسی ادمین کل لازم است." }, { status: 403 });
  const db = getDb();
  const users = await db.select().from(handbookUsers).orderBy(handbookUsers.createdAt);
  const permissions = await db.select().from(handbookUserPermissions);
  const audit = await db.select().from(handbookAuditLog)
    .orderBy(desc(handbookAuditLog.createdAt)).limit(60);
  return Response.json({
    users: users.map((user) => ({
      ...safeUser(user),
      permissions: permissions.filter((item) => item.userId === user.id),
    })),
    audit: audit.map((entry) => {
      const actor = users.find((user) => user.id === entry.actorUserId);
      return {
        id: entry.id,
        actorLabel: actor?.username || actor?.fullName || "کاربر حذف‌شده",
        action: entry.action,
        summary: entry.summary,
        createdAt: entry.createdAt,
        beforeJson: entry.beforeJson,
      };
    }),
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "دسترسی ادمین کل لازم است." }, { status: 403 });
  const payload = await request.json();
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");
  const fullName = String(payload.fullName || "").trim().slice(0, 120);
  const role = payload.role;
  if (!validUsername(username) || !fullName || !isRole(role)) {
    return Response.json({ error: "نام، نام کاربری انگلیسی معتبر و نقش لازم است." }, { status: 400 });
  }
  if (role !== "user" && password.length < 6) {
    return Response.json({ error: "رمز عبور مسئول باید حداقل ۶ نویسه باشد." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const db = getDb();
  let credentials: Awaited<ReturnType<typeof createPasswordHash>> | null = null;
  try {
    credentials = role === "user" ? null : await createPasswordHash(password);
  } catch (error) {
    console.error("Preparing handbook manager password failed", error);
    return Response.json(
      { error: "آماده‌سازی رمز عبور انجام نشد؛ لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
  const inserted = {
    id,
    email: `account-${id}@username.invalid`,
    username,
    passwordHash: credentials?.hash ?? null,
    passwordSalt: credentials?.salt ?? null,
    fullName,
    title: String(payload.title || "").trim().slice(0, 120),
    role,
    status: payload.status === "inactive" ? "inactive" : "active",
  };

  const [existing] = await db.select({ id: handbookUsers.id })
    .from(handbookUsers)
    .where(eq(handbookUsers.username, username))
    .limit(1);
  if (existing) {
    return Response.json({ error: "این نام کاربری قبلاً تعریف شده است." }, { status: 409 });
  }

  try {
    await db.insert(handbookUsers).values(inserted);
    await replacePermissions(id, payload.permissions);
  } catch (error) {
    await db.delete(handbookUserPermissions).where(eq(handbookUserPermissions.userId, id)).catch(() => undefined);
    await db.delete(handbookUsers).where(eq(handbookUsers.id, id)).catch(() => undefined);
    console.error("Creating handbook user failed", error);
    return Response.json({ error: "ساخت مسئول کامل نشد؛ لطفاً دوباره تلاش کنید." }, { status: 500 });
  }

  await log(access, "user.create", "کاربر یا مسئول جدید تعریف شد", null, safeUser({
    ...inserted,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })).catch((error) => console.error("Writing handbook user audit log failed", error));
  return Response.json({ ok: true, id });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "دسترسی ادمین کل لازم است." }, { status: 403 });
  const payload = await request.json();
  const id = String(payload.id || "");
  const db = getDb();
  const [before] = await db.select().from(handbookUsers).where(eq(handbookUsers.id, id)).limit(1);
  if (!before) return Response.json({ error: "کاربر پیدا نشد." }, { status: 404 });
  if (before.id === access.id && (payload.role !== "super_admin" || payload.status === "inactive")) {
    return Response.json({ error: "ادمین کل نمی‌تواند دسترسی خودش را حذف کند." }, { status: 400 });
  }
  if (!isRole(payload.role)) return Response.json({ error: "نقش نامعتبر است." }, { status: 400 });
  const username = before.role === "super_admin" ? "admin" : normalizeUsername(payload.username);
  if (before.role !== "super_admin" && !validUsername(username)) {
    return Response.json({ error: "نام کاربری باید ۳ تا ۴۰ نویسه انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد." }, { status: 400 });
  }
  const password = String(payload.password || "");
  if (password && password.length < 6) {
    return Response.json({ error: "رمز عبور جدید باید حداقل ۶ نویسه باشد." }, { status: 400 });
  }
  if (before.role !== "super_admin" && payload.role !== "user" && !password && !before.passwordHash) {
    return Response.json({ error: "برای فعال‌کردن ورود این مسئول، رمز عبور تعیین کنید." }, { status: 400 });
  }
  const credentials = password ? await createPasswordHash(password) : null;
  const next = {
    username,
    fullName: String(payload.fullName || before.fullName).trim().slice(0, 120),
    title: String(payload.title || "").trim().slice(0, 120),
    role: payload.role,
    status: payload.status === "inactive" ? "inactive" : "active",
    ...(credentials ? { passwordHash: credentials.hash, passwordSalt: credentials.salt } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    await db.update(handbookUsers).set(next).where(eq(handbookUsers.id, id));
    await replacePermissions(id, payload.permissions);
    await db.delete(handbookSessions).where(eq(handbookSessions.userId, id));
    await log(access, "user.update", "نقش یا دسترسی کاربر تغییر کرد", safeUser(before), {
      ...safeUser(before),
      username: next.username,
      fullName: next.fullName,
      title: next.title,
      role: next.role,
      status: next.status,
      updatedAt: next.updatedAt,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "این نام کاربری قبلاً تعریف شده است." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "دسترسی ادمین کل لازم است." }, { status: 403 });
  const payload = await request.json();
  const id = String(payload.id || "");
  const db = getDb();
  const [before] = await db.select().from(handbookUsers)
    .where(eq(handbookUsers.id, id)).limit(1);
  if (!before) return Response.json({ error: "کاربر پیدا نشد." }, { status: 404 });
  if (before.id === access.id || before.role === "super_admin") {
    return Response.json({ error: "حذف حساب ادمین کل مجاز نیست." }, { status: 400 });
  }
  await db.delete(handbookSessions).where(eq(handbookSessions.userId, id));
  await db.delete(handbookUserPermissions).where(eq(handbookUserPermissions.userId, id));
  await db.delete(handbookUsers).where(eq(handbookUsers.id, id));
  await log(access, "user.delete", "کاربر یا مسئول حذف شد", safeUser(before), null);
  return Response.json({ ok: true });
}

async function replacePermissions(userId: string, raw: unknown) {
  const db = getDb();
  await db.delete(handbookUserPermissions).where(eq(handbookUserPermissions.userId, userId));
  if (!Array.isArray(raw)) return;
  const rowsByScope = new Map<string, typeof handbookUserPermissions.$inferInsert>();
  for (const item of raw) {
    if (!item || !isSectionKey(item.sectionKey)) continue;
    const resourceKey = item.sectionKey === "units"
      ? (isUnitKey(item.resourceKey) || item.resourceKey === "*" ? item.resourceKey : null)
      : "*";
    if (!resourceKey) continue;
    const scope = `${item.sectionKey}:${resourceKey}`;
    rowsByScope.set(scope, {
      id: `${userId}:${scope}`,
      userId,
      sectionKey: item.sectionKey,
      resourceKey,
      canEditText: Boolean(item.canEditText),
      canEditImage: Boolean(item.canEditImage),
      canManageItems: Boolean(item.canManageItems),
      canReorder: Boolean(item.canReorder),
      updatedAt: new Date().toISOString(),
    });
  }
  const rows = Array.from(rowsByScope.values());
  // D1 limits the number of bound parameters in one statement. Keeping each
  // insert small prevents manager creation from stalling as unit permissions grow.
  const chunkSize = 6;
  for (let index = 0; index < rows.length; index += chunkSize) {
    await db.insert(handbookUserPermissions).values(rows.slice(index, index + chunkSize));
  }
}

async function log(access: NonNullable<Awaited<ReturnType<typeof requireApiAccess>>>, action: string, summary: string, before: unknown, after: unknown) {
  await getDb().insert(handbookAuditLog).values({
    id: crypto.randomUUID(),
    actorUserId: access.id,
    actorEmail: access.username || access.email,
    action,
    summary,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  });
}
