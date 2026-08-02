export const sectionDefinitions = [
  ["company", "معرفی برقتو"],
  ["products", "محصولات"],
  ["leadership", "هیئت‌مدیره"],
  ["personnel", "پرسنل"],
  ["units", "واحدها"],
  ["values", "فرهنگ و ارزش‌ها"],
  ["policies", "قوانین"],
  ["custom_sections", "بخش‌های سفارشی"],
] as const;

export type SectionKey = (typeof sectionDefinitions)[number][0];
export type HandbookRole = "user" | "section_manager" | "super_admin";
export type PermissionCapability =
  | "canEditText"
  | "canEditImage"
  | "canManageItems"
  | "canReorder";

export type SectionPermission = {
  sectionKey: SectionKey;
  resourceKey: string;
  canEditText: boolean;
  canEditImage: boolean;
  canManageItems: boolean;
  canReorder: boolean;
};

export type CurrentAccess = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  title: string;
  role: HandbookRole;
  permissions: SectionPermission[];
};

export function isSectionKey(value: unknown): value is SectionKey {
  return sectionDefinitions.some(([key]) => key === value);
}

export function isRole(value: unknown): value is HandbookRole {
  return value === "user" || value === "section_manager" || value === "super_admin";
}

export function can(
  access: Pick<CurrentAccess, "role" | "permissions">,
  sectionKey: SectionKey,
  capability: PermissionCapability,
  resourceKey = "*",
) {
  if (access.role === "super_admin") return true;
  if (access.role !== "section_manager") return false;
  return Boolean(
    access.permissions.find(
      (item) =>
        item.sectionKey === sectionKey &&
        (item.resourceKey === resourceKey || item.resourceKey === "*"),
    )?.[capability],
  );
}

export function primaryEditableUnit(access: Pick<CurrentAccess, "role" | "permissions">) {
  if (access.role !== "section_manager") return null;
  const permission = access.permissions.find(
    (item) =>
      item.sectionKey === "units" &&
      /^unit-[a-z0-9-]{2,80}$/.test(item.resourceKey) &&
      (item.canEditText || item.canEditImage || item.canManageItems || item.canReorder),
  );
  return permission?.resourceKey ?? null;
}

export function sectionFromCustomizationKey(key: string): SectionKey | null {
  const match = /^section-([a-z_]+)-/.exec(key);
  return match && isSectionKey(match[1]) ? match[1] : null;
}

export function resourceFromCustomizationKey(key: string): string | null {
  const match = /^section-[a-z_]+-resource-([a-z0-9-]+)-/.exec(key);
  return match?.[1] ?? null;
}
