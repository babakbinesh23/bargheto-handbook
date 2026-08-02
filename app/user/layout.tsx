import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accessForCookieHeader, accessForEmail } from "../../lib/authorization";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function UserLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const identity = await getChatGPTUser();
  let access = await accessForCookieHeader(requestHeaders.get("cookie"));
  access ??= identity ? await accessForEmail(identity.email) : null;

  if (!access) redirect("/login");
  return children;
}
