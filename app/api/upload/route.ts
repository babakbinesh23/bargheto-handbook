const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
import { requireApiAccess } from "../../../lib/authorization";
import { can, isSectionKey } from "../../../lib/permissions";

function getBucket() {
  const runtime = globalThis as typeof globalThis & {
    __BARGHETO_BUCKET__?: R2Bucket;
  };
  if (!runtime.__BARGHETO_BUCKET__) {
    throw new Error("R2 binding is unavailable.");
  }
  return runtime.__BARGHETO_BUCKET__;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const access = await requireApiAccess(request);
  const sectionKey = form.get("sectionKey");
  const resourceKey = String(form.get("resourceKey") || "*");
  if (!access || !isSectionKey(sectionKey) || !can(access, sectionKey, "canEditImage", resourceKey)) {
    return Response.json({ error: "برای تغییر تصویر این بخش دسترسی ندارید." }, { status: 403 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return Response.json({ error: "فقط تصویر JPG، PNG یا WebP مجاز است." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "حجم تصویر باید کمتر از ۵ مگابایت باشد." }, { status: 413 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `handbook/${crypto.randomUUID()}.${extension}`;
  await getBucket().put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return Response.json({ url: `/api/upload?key=${encodeURIComponent(key)}` });
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("handbook/")) {
    return new Response("Not found", { status: 404 });
  }
  const object = await getBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
