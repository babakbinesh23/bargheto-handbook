import Link from "next/link";
import { headers } from "next/headers";
import { accessForCookieHeader, accessForEmail } from "../../../lib/authorization";
import { getChatGPTUser } from "../../chatgpt-auth";
import LayoutManager from "./LayoutManager";

export const dynamic = "force-dynamic";

export default async function LayoutPage() {
  const identity = await getChatGPTUser();
  const requestHeaders = await headers();
  let access = await accessForCookieHeader(requestHeaders.get("cookie"));
  access ??= identity ? await accessForEmail(identity.email) : null;

  if (!access || access.role === "user") {
    return (
      <main className="access-denied" dir="rtl">
        <img src="/bargheto-logo.png" alt="برقتو" />
        <h1>دسترسی چیدمان برای این حساب فعال نیست</h1>
        <p>ابتدا با حساب ادمین یا مسئول دارای دسترسی جابه‌جایی وارد شوید.</p>
        <Link href="/login">ورود مدیریت</Link>
      </main>
    );
  }

  return <LayoutManager access={access} />;
}
