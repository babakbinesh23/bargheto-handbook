import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { handbookAuditLog, handbookContent } from "../../../../db/schema";
import { requireApiAccess } from "../../../../lib/authorization";
import { normalizeCustomizations } from "../../../../lib/customizations";

export async function POST(request: Request) {
  const access = await requireApiAccess(request);
  if (access?.role !== "super_admin") {
    return Response.json({ error: "دسترسی ادمین کل لازم است." }, { status: 403 });
  }
  const { auditId } = await request.json();
  const db = getDb();
  const [entry] = await db.select().from(handbookAuditLog)
    .where(eq(handbookAuditLog.id, String(auditId))).limit(1);
  if (!entry?.beforeJson || entry.action !== "customizations.update") {
    return Response.json({ error: "این نسخه قابل بازیابی نیست." }, { status: 400 });
  }
  const previous = normalizeCustomizations(JSON.parse(entry.beforeJson));
  const [current] = await db.select({ customizations: handbookContent.customizations })
    .from(handbookContent).where(eq(handbookContent.id, 1)).limit(1);
  await db.insert(handbookContent).values({ id: 1, customizations: JSON.stringify(previous) })
    .onConflictDoUpdate({ target: handbookContent.id, set: { customizations: JSON.stringify(previous), updatedAt: new Date().toISOString() } });
  await db.insert(handbookAuditLog).values({
    id: crypto.randomUUID(), actorUserId: access.id, actorEmail: access.username || access.email,
    action: "customizations.restore", summary: "نسخه قبلی هندبوک بازیابی شد",
    beforeJson: current?.customizations ?? null, afterJson: JSON.stringify(previous),
  });
  return Response.json({ ok: true, customizations: previous });
}
