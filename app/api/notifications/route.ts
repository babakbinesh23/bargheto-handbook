import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { handbookNotifications } from "../../../db/schema";

export async function GET() {
  try {
    const notifications = await getDb()
      .select({
        id: handbookNotifications.id,
        title: handbookNotifications.title,
        message: handbookNotifications.message,
        sectionKey: handbookNotifications.sectionKey,
        resourceKey: handbookNotifications.resourceKey,
        step: handbookNotifications.step,
        createdAt: handbookNotifications.createdAt,
      })
      .from(handbookNotifications)
      .orderBy(desc(handbookNotifications.createdAt))
      .limit(30);
    return Response.json({ notifications });
  } catch {
    return Response.json({ notifications: [] });
  }
}
