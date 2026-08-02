"use client";

import { useEffect, useMemo, useState } from "react";
import {
  sectionDefinitions,
  type HandbookRole,
  type SectionPermission,
} from "../../lib/permissions";
import { unitDefinitions } from "../../lib/units";

type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  title: string;
  role: HandbookRole;
  status: string;
  permissions: SectionPermission[];
};

type AuditEntry = {
  id: string;
  actorLabel: string;
  action: string;
  summary: string;
  createdAt: string;
  beforeJson: string | null;
};

type UserFilter = "all" | "managers" | "users";

const REQUEST_TIMEOUT_MS = 15_000;

async function requestJson(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const raw = await response.text();
    let data: Record<string, unknown> = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        data = {};
      }
    }
    return { response, data };
  } finally {
    window.clearTimeout(timeout);
  }
}

function requestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "ذخیره بیشتر از حد معمول طول کشید. اتصال را بررسی کنید و دوباره تلاش کنید.";
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

const emptyPermissions = () =>
  [
    ...sectionDefinitions
      .filter(([sectionKey]) => sectionKey !== "units")
      .map(([sectionKey]) => ({
        sectionKey,
        resourceKey: "*",
        canEditText: false,
        canEditImage: false,
        canManageItems: false,
        canReorder: false,
      })),
    ...unitDefinitions.map(([resourceKey]) => ({
      sectionKey: "units" as const,
      resourceKey,
      canEditText: false,
      canEditImage: false,
      canManageItems: false,
      canReorder: false,
    })),
  ];

const emptyForm = () => ({
  fullName: "",
  username: "",
  password: "",
  title: "",
  role: "section_manager" as HandbookRole,
  status: "active",
  permissions: emptyPermissions(),
});

function roleLabel(role: HandbookRole) {
  if (role === "super_admin") return "ادمین کل";
  if (role === "section_manager") return "مسئول بخش";
  return "کاربر";
}

function formFromUser(user: ManagedUser) {
  return {
    fullName: user.fullName,
    username: user.username,
    password: "",
    title: user.title,
    role: user.role,
    status: user.status,
    permissions: emptyPermissions().map((base) => ({
      ...base,
      ...(user.permissions.find(
        (permission) =>
          permission.sectionKey === base.sectionKey &&
          permission.resourceKey === base.resourceKey,
      ) ??
        (base.sectionKey === "units"
          ? user.permissions.find(
              (permission) =>
                permission.sectionKey === "units" &&
                permission.resourceKey === "*",
            )
          : undefined)),
      resourceKey: base.resourceKey,
    })),
  };
}

export default function AdminAccessPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("در حال دریافت اطلاعات...");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("managers");
  const [saving, setSaving] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "managers" && user.role !== "user") ||
        (filter === "users" && user.role === "user");
      const matchesSearch =
        !query ||
        user.fullName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.title.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, users]);

  async function load() {
    try {
      const { response, data } = await requestJson("/api/users");
      if (!response.ok) {
        setStatus(String(data.error || "دریافت اطلاعات انجام نشد."));
        return null;
      }
      const nextUsers = (data.users || []) as ManagedUser[];
      setUsers(nextUsers);
      setAudit((data.audit || []) as AuditEntry[]);
      return nextUsers;
    } catch (error) {
      setStatus(requestErrorMessage(error, "دریافت اطلاعات انجام نشد."));
      return null;
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().then((result) => {
        if (result) setStatus("");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function selectNew() {
    setSelectedId("new");
    setForm(emptyForm());
    setStatus("");
  }

  function selectUser(user: ManagedUser) {
    setSelectedId(user.id);
    setForm(formFromUser(user));
    setStatus("");
  }

  function togglePermission(
    index: number,
    key: keyof Omit<SectionPermission, "sectionKey" | "resourceKey">,
  ) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: !item[key] } : item,
      ),
    }));
  }

  async function save() {
    setSaving(true);
    setStatus("در حال ذخیره دسترسی...");
    const creating = selectedId === "new";
    try {
      const { response, data } = await requestJson("/api/users", {
        method: creating ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: creating ? undefined : selectedId,
        }),
      });
      if (!response.ok) {
        setStatus(String(data.error || "ذخیره انجام نشد."));
        if (response.status === 409) await load();
        return;
      }

      const refreshedUsers = await load();
      const savedId = creating ? data.id : selectedId;
      const savedUser = refreshedUsers?.find((user) => user.id === savedId);
      if (savedUser) {
        setSelectedId(savedUser.id);
        setForm(formFromUser(savedUser));
        setFilter(savedUser.role === "user" ? "users" : "managers");
        setSearch("");
      }
      setStatus(
        creating
          ? "✓ مسئول ساخته شد و در فهرست نمایش داده می‌شود."
          : "✓ تغییرات دسترسی با موفقیت ذخیره شد.",
      );
    } catch (error) {
      setStatus(requestErrorMessage(error, "ذخیره انجام نشد؛ دوباره تلاش کنید."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (selectedId === "new") return;
    const selected = users.find((user) => user.id === selectedId);
    if (!selected) return;
    if (
      !window.confirm(
        `«${selected.fullName}» حذف شود؟ دسترسی این فرد فوراً قطع خواهد شد.`,
      )
    ) return;

    setSaving(true);
    setStatus("در حال حذف مسئول...");
    try {
      const { response, data } = await requestJson("/api/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selectedId }),
      });
      if (!response.ok) {
        setStatus(String(data.error || "حذف انجام نشد."));
        return;
      }
      await load();
      selectNew();
      setStatus("✓ مسئول حذف شد و دیگر امکان ورود ندارد.");
    } catch (error) {
      setStatus(requestErrorMessage(error, "حذف انجام نشد؛ دوباره تلاش کنید."));
    } finally {
      setSaving(false);
    }
  }

  async function restore(entry: AuditEntry) {
    if (!window.confirm("نسخه قبل از این تغییر بازیابی شود؟")) return;
    const response = await fetch("/api/history/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditId: entry.id }),
    });
    const data = await response.json();
    setStatus(
      response.ok
        ? "✓ نسخه قبلی بازیابی شد؛ صفحه را تازه‌سازی کنید."
        : data.error || "بازیابی انجام نشد.",
    );
    if (response.ok) await load();
  }

  const managersCount = users.filter((user) => user.role !== "user").length;
  const usersCount = users.filter((user) => user.role === "user").length;

  return (
    <aside className="access-manager" dir="rtl" aria-label="کاربران و دسترسی‌ها">
      <header>
        <div>
          <span>مدیریت دسترسی</span>
          <strong>کاربران و مسئولین</strong>
        </div>
        <div className="access-manager__summary" aria-label="خلاصه حساب‌ها">
          <span><b>{managersCount}</b> مسئول</span>
          <span><b>{usersCount}</b> کاربر</span>
        </div>
        <button onClick={onClose} aria-label="بستن">×</button>
      </header>

      <div className="access-manager__layout">
        <nav aria-label="فهرست کاربران و مسئولین">
          <button className="access-manager__new" onClick={selectNew}>
            <span aria-hidden="true">＋</span>
            تعریف مسئول جدید
          </button>
          <label className="access-manager__search">
            <span className="sr-only">جست‌وجوی کاربر یا مسئول</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی نام یا نام کاربری"
            />
          </label>
          <div className="access-manager__filters" role="group" aria-label="نوع حساب">
            <button className={filter === "managers" ? "is-active" : ""} onClick={() => setFilter("managers")}>مسئولین</button>
            <button className={filter === "users" ? "is-active" : ""} onClick={() => setFilter("users")}>کاربران</button>
            <button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>همه</button>
          </div>
          <div className="access-manager__user-list">
            {filteredUsers.map((user) => (
              <button
                className={selectedId === user.id ? "is-active" : ""}
                onClick={() => selectUser(user)}
                key={user.id}
              >
                <span className="access-manager__avatar" aria-hidden="true">
                  {user.fullName.trim().charAt(0) || "؟"}
                </span>
                <span>
                  <strong>{user.fullName}</strong>
                  <small>{user.title || roleLabel(user.role)}</small>
                  <bdi>{user.username ? `@${user.username}` : "نام کاربری تعیین نشده"}</bdi>
                </span>
                <i className={user.status === "active" ? "is-active" : ""}>
                  {user.status === "active" ? "فعال" : "غیرفعال"}
                </i>
              </button>
            ))}
            {!filteredUsers.length && (
              <p className="access-manager__empty">
                {search ? "نتیجه‌ای برای این جست‌وجو پیدا نشد." : "هنوز حسابی در این گروه وجود ندارد."}
              </p>
            )}
          </div>
        </nav>

        <div className="access-manager__editor">
          <div className="access-manager__editor-heading">
            <div>
              <span>{selectedId === "new" ? "حساب جدید" : roleLabel(form.role)}</span>
              <h2>{selectedId === "new" ? "تعریف مسئول جدید" : form.fullName}</h2>
              <p>{selectedId === "new" ? "اطلاعات ورود و محدوده ویرایش را مشخص کنید." : form.username ? `@${form.username}` : "برای این حساب نام کاربری و رمز تعیین کنید."}</p>
            </div>
            {selectedId !== "new" && (
              <span className={`access-manager__state ${form.status === "active" ? "is-active" : ""}`}>
                {form.status === "active" ? "حساب فعال" : "حساب غیرفعال"}
              </span>
            )}
          </div>

          <section className="access-manager__card">
            <h3>اطلاعات حساب</h3>
            <div className="access-manager__fields">
              <label>نام و نام خانوادگی<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
              <label>نام کاربری ورود<input dir="ltr" autoComplete="off" value={form.username} disabled={form.role === "super_admin"} placeholder="برای نمونه: sales-manager" onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} /></label>
              {form.role !== "super_admin" && <label>رمز عبور<input dir="ltr" type="password" autoComplete="new-password" value={form.password} placeholder={selectedId === "new" ? "حداقل ۶ نویسه" : "برای حفظ رمز قبلی خالی بگذارید"} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>}
              <label>سمت سازمانی<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              <label>نوع حساب<select value={form.role} disabled={form.role === "super_admin"} onChange={(event) => setForm({ ...form, role: event.target.value as HandbookRole })}><option value="user">کاربر؛ فقط مشاهده</option><option value="section_manager">مسئول بخش</option>{form.role === "super_admin" && <option value="super_admin">ادمین کل</option>}</select></label>
              <label>وضعیت<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
            </div>
          </section>

          {form.role === "section_manager" && (
            <section className="access-manager__card">
              <div className="access-manager__section-heading">
                <div><h3>دسترسی بخش‌ها</h3><p>برای هر بخش، دقیقاً مشخص کنید چه کاری مجاز است.</p></div>
                <span>{form.permissions.filter((permission) => permission.canEditText || permission.canEditImage || permission.canManageItems || permission.canReorder).length} دسترسی فعال</span>
              </div>
              <div className="permission-matrix">
                <div className="permission-matrix__head"><span>بخش</span><span>متن</span><span>عکس</span><span>افزودن/حذف</span><span>چیدمان</span></div>
                {form.permissions.map((permission, index) => {
                  if (permission.sectionKey === "units") return null;
                  const label = sectionDefinitions.find(([key]) => key === permission.sectionKey)?.[1];
                  return (
                    <div key={permission.sectionKey}>
                      <strong>{label}</strong>
                      {(["canEditText", "canEditImage", "canManageItems", "canReorder"] as const).map((capability) => (
                        <label key={capability}>
                          <input type="checkbox" checked={permission[capability]} onChange={() => togglePermission(index, capability)} />
                          <span />
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {form.role === "section_manager" && (
            <section className="access-manager__card">
              <div className="access-manager__section-heading">
                <div>
                  <h3>دسترسی جداگانه واحدها</h3>
                  <p>هر مسئول فقط واحدهای روشن‌شده در این فهرست را می‌تواند ویرایش کند.</p>
                </div>
              </div>
              <div className="unit-permission-list">
                {unitDefinitions.map(([resourceKey, label]) => {
                  const index = form.permissions.findIndex(
                    (permission) =>
                      permission.sectionKey === "units" &&
                      permission.resourceKey === resourceKey,
                  );
                  const permission = form.permissions[index];
                  return (
                    <div key={resourceKey}>
                      <span><strong>واحد {label}</strong><small>ویرایش محتوا و چیدمان همین واحد</small></span>
                      <div className="unit-permission-actions">
                        <label title="ویرایش متن">
                          <small>متن</small>
                          <input
                            type="checkbox"
                            checked={permission?.canEditText ?? false}
                            onChange={() => togglePermission(index, "canEditText")}
                          />
                          <span />
                        </label>
                        <label title="جابه‌جایی و تغییر اندازه کارت">
                          <small>چیدمان</small>
                          <input
                            type="checkbox"
                            checked={permission?.canReorder ?? false}
                            onChange={() => togglePermission(index, "canReorder")}
                          />
                          <span />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="access-manager__actions">
            <button className="access-manager__save" onClick={save} disabled={saving}>
              {saving ? "در حال انجام..." : selectedId === "new" ? "ساخت مسئول" : "ذخیره تغییرات"}
            </button>
            {selectedId !== "new" && form.role !== "super_admin" && (
              <button className="access-manager__delete" onClick={deleteSelected} disabled={saving}>حذف مسئول</button>
            )}
            {status && <p className="access-manager__status" role="status">{status}</p>}
          </div>

          <details className="audit-list">
            <summary>تاریخچه تغییرات اخیر</summary>
            {audit.slice(0, 20).map((entry) => (
              <article key={entry.id}>
                <div><strong>{entry.summary}</strong><small><bdi>{entry.actorLabel}</bdi> · {new Date(entry.createdAt).toLocaleString("fa-IR")}</small></div>
                {entry.action === "customizations.update" && entry.beforeJson && <button onClick={() => restore(entry)}>بازیابی نسخه قبل</button>}
              </article>
            ))}
          </details>
        </div>
      </div>
    </aside>
  );
}
