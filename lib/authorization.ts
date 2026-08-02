import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { handbookSessions, handbookUserPermissions, handbookUsers } from "../db/schema";
import { type CurrentAccess, type HandbookRole, type SectionPermission } from "./permissions";
import { hashSessionToken } from "./passwords";

export const OWNER_EMAIL = "bargheto.gpt2026@gmail.com";
export const MANAGER_SESSION_COOKIE = "bargheto_manager_session";

type Identity = { email: string; fullName: string | null };

export function identityFromRequest(request: Request): Identity | null {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) {
    return { email, fullName: request.headers.get("oai-authenticated-user-full-name") };
  }
  const hostname = new URL(request.url).hostname;
  if (hostname === "terminal.local" || hostname === "localhost") {
    return { email: OWNER_EMAIL, fullName: "ادمین برقتو" };
  }
  return null;
}

export async function ensureOwnerAdmin() {
  const db = getDb();
  await db.insert(handbookUsers).values({
    id: "owner-bargheto",
    email: OWNER_EMAIL,
    username: "admin",
    fullName: "ادمین کل برقتو",
    title: "مدیر سیستم",
    role: "super_admin",
    status: "active",
  }).onConflictDoUpdate({
    target: handbookUsers.email,
    set: {
      username: "admin",
      fullName: "ادمین کل برقتو",
      title: "مدیر سیستم",
      role: "super_admin",
      status: "active",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function accessForEmail(email: string): Promise<CurrentAccess | null> {
  await ensureOwnerAdmin();
  const db = getDb();
  const [user] = await db.select().from(handbookUsers)
    .where(eq(handbookUsers.email, email.trim().toLowerCase())).limit(1);
  if (!user || user.status !== "active" || user.role !== "super_admin") return null;
  return buildAccess(user);
}

export async function accessForSessionToken(token: string): Promise<CurrentAccess | null> {
  if (!token) return null;
  await ensureOwnerAdmin();
  const db = getDb();
  const sessionId = await hashSessionToken(token);
  const now = new Date().toISOString();
  const [row] = await db
    .select({ user: handbookUsers, session: handbookSessions })
    .from(handbookSessions)
    .innerJoin(handbookUsers, eq(handbookSessions.userId, handbookUsers.id))
    .where(and(eq(handbookSessions.id, sessionId), gt(handbookSessions.expiresAt, now)))
    .limit(1);
  if (!row || row.user.status !== "active" || row.user.role === "user") return null;
  return buildAccess(row.user);
}

export async function accessForCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${MANAGER_SESSION_COOKIE}=`))
    ?.slice(MANAGER_SESSION_COOKIE.length + 1);
  return token ? accessForSessionToken(token) : null;
}

async function buildAccess(user: typeof handbookUsers.$inferSelect): Promise<CurrentAccess> {
  const db = getDb();
  const rows = await db.select().from(handbookUserPermissions)
    .where(eq(handbookUserPermissions.userId, user.id));
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? "",
    fullName: user.fullName,
    title: user.title,
    role: user.role as HandbookRole,
    permissions: rows.map((row) => ({
      sectionKey: row.sectionKey,
      resourceKey: row.resourceKey,
      canEditText: row.canEditText,
      canEditImage: row.canEditImage,
      canManageItems: row.canManageItems,
      canReorder: row.canReorder,
    })) as SectionPermission[],
  };
}

export async function requireApiAccess(request: Request) {
  const sessionAccess = await accessForCookieHeader(request.headers.get("cookie"));
  if (sessionAccess) return sessionAccess;
  const identity = identityFromRequest(request);
  if (identity) {
    const adminAccess = await accessForEmail(identity.email);
    if (adminAccess) return adminAccess;
  }
  return null;
}
