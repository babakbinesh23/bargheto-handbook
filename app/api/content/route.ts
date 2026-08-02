import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { handbookContent } from "../../../db/schema";
import {
  defaultHandbookContent,
  type HandbookContent,
} from "../../../lib/handbook";
import { requireApiAccess } from "../../../lib/authorization";
import { can } from "../../../lib/permissions";

function cleanValue(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().slice(0, 1800);
  return normalized || fallback;
}

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(handbookContent)
      .where(eq(handbookContent.id, 1))
      .limit(1);

    if (!row) {
      return Response.json({ content: defaultHandbookContent });
    }

    return Response.json({
      content: {
        welcomeTitle: row.welcomeTitle,
        aboutTitle: row.aboutTitle,
        aboutBody: row.aboutBody,
        salesTitle: row.salesTitle,
        salesBody: row.salesBody,
      },
      updatedAt: row.updatedAt,
    });
  } catch {
    return Response.json(
      {
        content: defaultHandbookContent,
        demoFallback: true,
      },
      { status: 200 },
    );
  }
}

export async function PUT(request: Request) {
  const access = await requireApiAccess(request);
  if (!access || !can(access, "company", "canEditText")) {
    return Response.json({ error: "برای ویرایش معرفی شرکت دسترسی ندارید." }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Partial<HandbookContent>;
    const content: HandbookContent = {
      welcomeTitle: cleanValue(
        payload.welcomeTitle,
        defaultHandbookContent.welcomeTitle,
      ),
      aboutTitle: cleanValue(
        payload.aboutTitle,
        defaultHandbookContent.aboutTitle,
      ),
      aboutBody: cleanValue(
        payload.aboutBody,
        defaultHandbookContent.aboutBody,
      ),
      salesTitle: cleanValue(
        payload.salesTitle,
        defaultHandbookContent.salesTitle,
      ),
      salesBody: cleanValue(
        payload.salesBody,
        defaultHandbookContent.salesBody,
      ),
    };

    const db = getDb();
    const [saved] = await db
      .insert(handbookContent)
      .values({ id: 1, ...content })
      .onConflictDoUpdate({
        target: handbookContent.id,
        set: { ...content, updatedAt: new Date().toISOString() },
      })
      .returning();

    return Response.json({ content, updatedAt: saved.updatedAt });
  } catch {
    return Response.json(
      { error: "ذخیره اطلاعات انجام نشد. دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
