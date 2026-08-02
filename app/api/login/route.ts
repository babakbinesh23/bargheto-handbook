import { eq, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { handbookSessions, handbookUsers } from "../../../db/schema";
import { MANAGER_SESSION_COOKIE } from "../../../lib/authorization";
import { createSessionToken, hashSessionToken, verifyPassword } from "../../../lib/passwords";

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const payload = await request.json();
  const username = String(payload.username || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const db = getDb();
  const [user] = await db.select().from(handbookUsers)
    .where(eq(handbookUsers.username, username)).limit(1);

  const valid = Boolean(
    user &&
      user.status === "active" &&
      user.role !== "user" &&
      user.passwordHash &&
      user.passwordSalt &&
      await verifyPassword(password, user.passwordSalt, user.passwordHash),
  );
  if (!valid || !user) {
    return Response.json({ error: "نام کاربری یا رمز عبور نادرست است." }, { status: 401 });
  }

  const now = new Date();
  await db.delete(handbookSessions).where(lt(handbookSessions.expiresAt, now.toISOString()));
  const token = createSessionToken();
  await db.insert(handbookSessions).values({
    id: await hashSessionToken(token),
    userId: user.id,
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_SECONDS * 1000).toISOString(),
  });

  const destination = user.role === "super_admin"
    ? "/admin"
    : "/user?view=units";

  return Response.json(
    { ok: true, destination },
    {
      headers: {
        "set-cookie": `${MANAGER_SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
      },
    },
  );
}

export async function DELETE(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${MANAGER_SESSION_COOKIE}=`))
    ?.slice(MANAGER_SESSION_COOKIE.length + 1);
  if (token) {
    await getDb().delete(handbookSessions)
      .where(eq(handbookSessions.id, await hashSessionToken(token)));
  }
  return Response.json(
    { ok: true },
    { headers: { "set-cookie": `${MANAGER_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } },
  );
}
