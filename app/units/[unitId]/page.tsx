import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessForCookieHeader, accessForEmail } from "../../../lib/authorization";
import { can, primaryEditableUnit } from "../../../lib/permissions";
import { unitPageDefinition } from "../../../lib/unit-pages";
import { getChatGPTUser } from "../../chatgpt-auth";
import UnitPageClient from "./UnitPageClient";

export const dynamic = "force-dynamic";

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  if (!/^unit-[a-z0-9-]{2,80}$/.test(unitId)) {
    return (
      <main className="access-denied" dir="rtl">
        <img src="/bargheto-logo.png" alt="برقتو" />
        <h1>این واحد پیدا نشد</h1>
        <Link href="/user">بازگشت به هندبوک</Link>
      </main>
    );
  }

  const identity = await getChatGPTUser();
  const requestHeaders = await headers();
  let access = await accessForCookieHeader(requestHeaders.get("cookie"));
  access ??= identity ? await accessForEmail(identity.email) : null;

  if (!access) redirect("/login");

  if (access?.role === "section_manager") {
    const assignedUnit = primaryEditableUnit(access);
    if (!assignedUnit) redirect("/user");
    if (assignedUnit !== unitId) redirect(`/units/${assignedUnit}`);
  }

  return (
    <UnitPageClient
      definition={unitPageDefinition(unitId)}
      canEditText={Boolean(access && can(access, "units", "canEditText", unitId))}
      canEditImage={Boolean(access && can(access, "units", "canEditImage", unitId))}
      editorName={access?.fullName ?? ""}
      editorRole={access?.role === "super_admin" ? "ادمین کل" : access?.title ?? ""}
    />
  );
}
