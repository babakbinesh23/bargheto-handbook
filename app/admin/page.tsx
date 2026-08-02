import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessForCookieHeader, accessForEmail } from "../../lib/authorization";
import { getChatGPTUser } from "../chatgpt-auth";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const identity = await getChatGPTUser();
  const requestHeaders = await headers();
  let access = await accessForCookieHeader(requestHeaders.get("cookie"));
  access ??= identity ? await accessForEmail(identity.email) : null;

  if (!access || access.role === "user") {
    return (
      <main className="access-denied" dir="rtl">
        <img src="/bargheto-logo.png" alt="برقتو" />
        <h1>دسترسی ویرایش برای این حساب فعال نیست</h1>
        <p>
          برای ورود مسئولان، نام کاربری و رمز عبوری را وارد کنید که ادمین کل
          در بخش «کاربران و دسترسی‌ها» تعریف کرده است.
        </p>
        <Link href="/user">مشاهده نسخه کاربران</Link>
      </main>
    );
  }

  if (access.role === "section_manager") {
    redirect("/user?view=units");
  }

  return <AdminClient access={access} />;
}
