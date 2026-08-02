import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { handbookAuditLog, handbookContent, handbookNotifications } from "../../../db/schema";
import { requireApiAccess } from "../../../lib/authorization";
import { emptyCustomizations, normalizeCustomizations, type HandbookCustomizations } from "../../../lib/customizations";
import {
  can,
  resourceFromCustomizationKey,
  sectionDefinitions,
  sectionFromCustomizationKey,
  type PermissionCapability,
  type SectionKey,
} from "../../../lib/permissions";
import { unitDefinitions, unitLabel } from "../../../lib/units";

export async function GET() {
  try {
    const db = getDb();
    const [row] = await db.select({ customizations: handbookContent.customizations })
      .from(handbookContent).where(eq(handbookContent.id, 1)).limit(1);
    return Response.json({ customizations: row ? normalizeCustomizations(JSON.parse(row.customizations)) : emptyCustomizations });
  } catch {
    return Response.json({ customizations: emptyCustomizations });
  }
}

export async function PUT(request: Request) {
  const access = await requireApiAccess(request);
  if (!access || access.role === "user") {
    return Response.json({ error: "دسترسی ویرایش لازم است." }, { status: 403 });
  }
  try {
    const incoming = normalizeCustomizations(await request.json());
    const serialized = JSON.stringify(incoming);
    if (serialized.length > 250_000) return Response.json({ error: "حجم تغییرات بیش از حد مجاز است." }, { status: 413 });

    const db = getDb();
    const [row] = await db.select({ customizations: handbookContent.customizations })
      .from(handbookContent).where(eq(handbookContent.id, 1)).limit(1);
    const current = row ? normalizeCustomizations(JSON.parse(row.customizations)) : emptyCustomizations;
    const denied = access.role === "super_admin" ? null : deniedChange(current, incoming, access);
    if (denied) return Response.json({ error: denied }, { status: 403 });
    const targets = changedTargets(current, incoming);

    await db.insert(handbookContent).values({ id: 1, customizations: serialized })
      .onConflictDoUpdate({ target: handbookContent.id, set: { customizations: serialized, updatedAt: new Date().toISOString() } });
    await db.insert(handbookAuditLog).values({
      id: crypto.randomUUID(), actorUserId: access.id, actorEmail: access.username || access.email,
      action: "customizations.update", summary: access.role === "super_admin" ? "ادمین کل هندبوک را ویرایش کرد" : `${access.fullName} بخش‌های مجاز خود را ویرایش کرد`,
      beforeJson: JSON.stringify(current), afterJson: serialized,
    });
    const createdAt = new Date().toISOString();
    if (targets.length) {
      await db.insert(handbookNotifications).values(
        targets.map(({ sectionKey, resourceKey }) => ({
          id: crypto.randomUUID(),
          title: notificationTitle(sectionKey, resourceKey),
          message: "اطلاعات این بخش تغییر کرده است؛ برای مشاهده کلیک کنید.",
          sectionKey,
          resourceKey,
          step: stepForSection(sectionKey),
          createdAt,
        })),
      );
    }
    return Response.json({ customizations: incoming });
  } catch {
    return Response.json({ error: "ذخیره تغییرات انجام نشد." }, { status: 500 });
  }
}

function deniedChange(current: HandbookCustomizations, next: HandbookCustomizations, access: NonNullable<Awaited<ReturnType<typeof requireApiAccess>>>) {
  const mapChecks: Array<[keyof Pick<HandbookCustomizations, "texts" | "textStyles" | "images" | "orders" | "sizes">, PermissionCapability]> = [
    ["texts", "canEditText"], ["textStyles", "canEditText"], ["images", "canEditImage"], ["orders", "canReorder"], ["sizes", "canReorder"],
  ];
  for (const [mapName, capability] of mapChecks) {
    const keys = new Set([...Object.keys(current[mapName]), ...Object.keys(next[mapName])]);
    for (const key of keys) {
      if (JSON.stringify(current[mapName][key]) === JSON.stringify(next[mapName][key])) continue;
      const section = sectionFromCustomizationKey(key);
      const resource = resourceFromCustomizationKey(key) ?? "*";
      if (
        mapName === "orders" &&
        section === "units" &&
        resource === "*" &&
        unitOrderChangeAllowed(current, next, key, access)
      ) continue;
      if (!section || !can(access, section, capability, resource)) return "تغییری خارج از دسترسی این مسئول شناسایی شد.";
    }
  }
  const checks: Array<[SectionKey, unknown, unknown]> = [
    ["leadership", current.structure.addedPeople.filter((x) => x.group === "leadership"), next.structure.addedPeople.filter((x) => x.group === "leadership")],
    ["personnel", current.structure.addedPeople.filter((x) => x.group === "personnel"), next.structure.addedPeople.filter((x) => x.group === "personnel")],
    ["leadership", current.structure.removedPeople.filter((x) => x.startsWith("leadership-")), next.structure.removedPeople.filter((x) => x.startsWith("leadership-"))],
    ["personnel", current.structure.removedPeople.filter((x) => !x.startsWith("leadership-")), next.structure.removedPeople.filter((x) => !x.startsWith("leadership-"))],
    ["units", [current.structure.addedUnits, current.structure.removedUnits], [next.structure.addedUnits, next.structure.removedUnits]],
    ["policies", [current.structure.addedPolicies, current.structure.removedPolicies], [next.structure.addedPolicies, next.structure.removedPolicies]],
    ["custom_sections", current.structure.customSections, next.structure.customSections],
  ];
  for (const [section, before, after] of checks) {
    if (JSON.stringify(before) !== JSON.stringify(after) && !can(access, section, "canManageItems")) return "برای افزودن، حذف یا مخفی‌کردن این بخش دسترسی ندارید.";
  }
  if (JSON.stringify(current.structure.hiddenSections) !== JSON.stringify(next.structure.hiddenSections)) {
    return "نمایش یا مخفی‌کردن بخش‌های اصلی فقط در اختیار ادمین کل است.";
  }
  return null;
}

function unitOrderChangeAllowed(
  current: HandbookCustomizations,
  next: HandbookCustomizations,
  orderKey: string,
  access: NonNullable<Awaited<ReturnType<typeof requireApiAccess>>>,
) {
  const allowedResources = new Set(
    access.permissions
      .filter((permission) => permission.sectionKey === "units" && permission.canReorder)
      .map((permission) => permission.resourceKey),
  );
  if (allowedResources.has("*")) return true;
  if (!allowedResources.size) return false;

  const fallback = [
    ...unitDefinitions.map(([resourceKey]) => resourceKey),
    ...current.structure.addedUnits.map((unit) => unit.id),
  ].filter((id) => !current.structure.removedUnits.includes(id));
  const completeOrder = (saved: string[] | undefined) => [
    ...(saved ?? []).filter((id, index, items) => fallback.includes(id) && items.indexOf(id) === index),
    ...fallback.filter((id) => !(saved ?? []).includes(id)),
  ];
  const inaccessibleBefore = completeOrder(current.orders[orderKey])
    .filter((id) => !allowedResources.has(id));
  const inaccessibleAfter = completeOrder(next.orders[orderKey])
    .filter((id) => !allowedResources.has(id));
  return JSON.stringify(inaccessibleBefore) === JSON.stringify(inaccessibleAfter);
}

type ChangedTarget = { sectionKey: SectionKey; resourceKey: string | null };

function changedTargets(
  current: HandbookCustomizations,
  next: HandbookCustomizations,
) {
  const targets = new Map<string, ChangedTarget>();
  const add = (sectionKey: SectionKey, resourceKey: string | null = null) => {
    targets.set(`${sectionKey}:${resourceKey ?? "*"}`, { sectionKey, resourceKey });
  };

  for (const mapName of ["texts", "textStyles", "images", "orders", "sizes"] as const) {
    const keys = new Set([
      ...Object.keys(current[mapName]),
      ...Object.keys(next[mapName]),
    ]);
    for (const key of keys) {
      if (JSON.stringify(current[mapName][key]) === JSON.stringify(next[mapName][key])) continue;
      const sectionKey = sectionFromCustomizationKey(key);
      if (sectionKey) add(sectionKey, resourceFromCustomizationKey(key));
    }
  }

  const structureChecks: Array<[SectionKey, unknown, unknown]> = [
    ["leadership", current.structure.addedPeople.filter((x) => x.group === "leadership"), next.structure.addedPeople.filter((x) => x.group === "leadership")],
    ["personnel", current.structure.addedPeople.filter((x) => x.group === "personnel"), next.structure.addedPeople.filter((x) => x.group === "personnel")],
    ["leadership", current.structure.removedPeople.filter((x) => x.startsWith("leadership-")), next.structure.removedPeople.filter((x) => x.startsWith("leadership-"))],
    ["personnel", current.structure.removedPeople.filter((x) => !x.startsWith("leadership-")), next.structure.removedPeople.filter((x) => !x.startsWith("leadership-"))],
    ["units", [current.structure.addedUnits, current.structure.removedUnits], [next.structure.addedUnits, next.structure.removedUnits]],
    ["policies", [current.structure.addedPolicies, current.structure.removedPolicies], [next.structure.addedPolicies, next.structure.removedPolicies]],
    ["custom_sections", current.structure.customSections, next.structure.customSections],
  ];
  structureChecks.forEach(([sectionKey, before, after]) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) add(sectionKey);
  });
  if (JSON.stringify(current.structure.hiddenSections) !== JSON.stringify(next.structure.hiddenSections)) {
    add("custom_sections");
  }
  return Array.from(targets.values());
}

function notificationTitle(sectionKey: SectionKey, resourceKey: string | null) {
  if (sectionKey === "units" && resourceKey) {
    return `واحد ${unitLabel(resourceKey)} به‌روزرسانی شد`;
  }
  const label = sectionDefinitions.find(([key]) => key === sectionKey)?.[1] ?? "هندبوک";
  return `${label} به‌روزرسانی شد`;
}

function stepForSection(sectionKey: SectionKey) {
  if (sectionKey === "leadership") return 1;
  if (sectionKey === "personnel" || sectionKey === "units") return 2;
  if (sectionKey === "values" || sectionKey === "policies") return 3;
  return 0;
}
