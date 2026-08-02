"use client";

import Link from "next/link";
import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  emptyCustomizations,
  normalizeCustomizations,
  type HandbookCustomizations,
} from "../../../lib/customizations";
import { can, type CurrentAccess, type SectionKey } from "../../../lib/permissions";
import LogoutButton from "../../components/LogoutButton";

type LayoutItem = {
  id: string;
  title: string;
  subtitle: string;
  resourceKey?: string;
};

type LayoutGroup = {
  key: string;
  title: string;
  description: string;
  section: SectionKey;
  items: LayoutItem[];
};

const products: LayoutItem[] = [
  ["product-0", "نیروگاه خورشیدی خانگی", "محصول"],
  ["product-1", "طرح تعویض موتور کولر", "محصول"],
  ["product-2", "گواهی صرفه‌جویی", "محصول"],
  ["product-3", "تأمین برق صنعتگران", "محصول"],
  ["product-4", "استخر خورشیدی", "محصول"],
].map(([id, title, subtitle]) => ({ id, title, subtitle }));

const leadership: LayoutItem[] = [
  { id: "leadership-0", title: "امید علوی", subtitle: "هیئت‌مدیره" },
  { id: "leadership-1", title: "ساسان سیفی", subtitle: "هیئت‌مدیره" },
];

const personnel: LayoutItem[] = [
  ["personnel-finance-accounting", "همکار واحد مالی و حسابداری"],
  ["personnel-sales", "همکار واحد فروش"],
  ["personnel-marketing", "همکار واحد مارکتینگ"],
  ["personnel-support", "همکار واحد پشتیبانی"],
  ["personnel-product", "همکار واحد محصول"],
  ["personnel-development", "همکار واحد توسعه"],
  ["personnel-efficiency", "همکار واحد صرفه‌جویی"],
  ["personnel-services", "همکار واحد خدمات"],
].map(([id, title]) => ({ id, title, subtitle: "پرسنل" }));

const units: LayoutItem[] = [
  ["unit-finance-accounting", "مالی و حسابداری"],
  ["unit-sales", "فروش"],
  ["unit-marketing", "مارکتینگ"],
  ["unit-support", "پشتیبانی"],
  ["unit-product", "محصول"],
  ["unit-development", "توسعه"],
  ["unit-efficiency", "صرفه‌جویی"],
  ["unit-services", "خدمات"],
].map(([id, title]) => ({ id, title, subtitle: "واحد سازمانی", resourceKey: id }));

const values: LayoutItem[] = [
  ["value-0", "احترام"],
  ["value-1", "صداقت"],
  ["value-2", "اعتماد"],
  ["value-3", "همکاری"],
].map(([id, title]) => ({ id, title, subtitle: "ارزش سازمانی" }));

const policies: LayoutItem[] = [
  "ساعت کاری و مرخصی",
  "حقوق، بیمه و مزایا",
  "رفتار حرفه‌ای",
  "امنیت و محرمانگی",
  "ارتباطات داخلی",
  "بهداشت و ایمنی",
  "تحویل اطلاعات و تجهیزات",
  "منابع، اموال و یادگیری",
].map((title, index) => ({ id: `policy-${index}`, title, subtitle: "قانون و رویه" }));

function normalizedOrder(items: LayoutItem[], saved?: string[]) {
  const ids = items.map((item) => item.id);
  const valid = (saved ?? []).filter(
    (id, index, all) => ids.includes(id) && all.indexOf(id) === index,
  );
  return [...valid, ...ids.filter((id) => !valid.includes(id))];
}

export default function LayoutManager({ access }: { access: CurrentAccess }) {
  const [customizations, setCustomizations] =
    useState<HandbookCustomizations>(emptyCustomizations);
  const [draftOrders, setDraftOrders] = useState<Record<string, string[]>>({});
  const [dragging, setDragging] = useState<{ groupKey: string; itemId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ itemId: string; after: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("کارت را بگیرید و در جای دلخواه رها کنید.");

  useEffect(() => {
    fetch("/api/customizations")
      .then((response) => response.json())
      .then((data) => setCustomizations(normalizeCustomizations(data.customizations)))
      .catch(() => {
        setFeedback("error");
        setMessage("دریافت چیدمان فعلی انجام نشد.");
      })
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo<LayoutGroup[]>(() => {
    const structure = customizations.structure;
    const visibleLeadership = leadership
      .filter((item) => !structure.removedPeople.includes(item.id))
      .concat(
        structure.addedPeople
          .filter((person) => person.group === "leadership")
          .map((person) => ({ id: person.id, title: person.name, subtitle: person.role || "هیئت‌مدیره" })),
      );
    const visiblePersonnel = personnel
      .filter((item) => !structure.removedPeople.includes(item.id))
      .concat(
        structure.addedPeople
          .filter((person) => person.group === "personnel")
          .map((person) => ({ id: person.id, title: person.name, subtitle: person.role || "پرسنل" })),
      );
    const visibleUnits = units
      .filter((item) => !structure.removedUnits.includes(item.id))
      .concat(
        structure.addedUnits.map((unit) => ({
          id: unit.id,
          title: unit.title,
          subtitle: "واحد سازمانی",
          resourceKey: unit.id,
        })),
      );
    const visiblePolicies = policies
      .filter((item) => !structure.removedPolicies.includes(item.id))
      .concat(
        structure.addedPolicies.map((policy) => ({
          id: policy.id,
          title: policy.title,
          subtitle: "قانون و رویه",
        })),
      );

    return [
      { key: "section-products-layout-products", title: "محصولات", description: "ترتیب نمایش محصولات در معارفه برقتو", section: "products", items: products },
      { key: "section-leadership-layout-people", title: "هیئت‌مدیره", description: "ترتیب کارت اعضای هیئت‌مدیره", section: "leadership", items: visibleLeadership },
      { key: "section-personnel-layout-people", title: "پرسنل", description: "ترتیب کارت همکاران", section: "personnel", items: visiblePersonnel },
      { key: "section-units-layout-units", title: "واحدها", description: "ترتیب واحدهای سازمانی؛ مسئول فقط کارت واحد مجاز خود را جابه‌جا می‌کند", section: "units", items: visibleUnits },
      { key: "section-values-layout-values", title: "فرهنگ و ارزش‌ها", description: "ترتیب ارزش‌های سازمانی", section: "values", items: values },
      { key: "section-policies-layout-policies", title: "قوانین و رویه‌ها", description: "ترتیب موضوعات ضروری هندبوک", section: "policies", items: visiblePolicies },
    ];
  }, [customizations]);

  function itemAllowed(group: LayoutGroup, item: LayoutItem) {
    return can(access, group.section, "canReorder", item.resourceKey ?? "*");
  }

  const visibleGroups = groups.filter((group) =>
    group.items.some((item) => itemAllowed(group, item)),
  );

  function orderedItems(group: LayoutGroup) {
    const order = normalizedOrder(
      group.items,
      draftOrders[group.key] ?? customizations.orders[group.key],
    );
    return order
      .map((id) => group.items.find((item) => item.id === id))
      .filter((item): item is LayoutItem => Boolean(item));
  }

  function applyOrder(group: LayoutGroup, order: string[]) {
    setDraftOrders((current) => ({ ...current, [group.key]: order }));
    setFeedback("idle");
    setMessage("چیدمان تغییر کرده است؛ برای ثبت نهایی ذخیره کنید.");
  }

  function placeItem(group: LayoutGroup, draggedId: string, targetId: string, after: boolean) {
    if (draggedId === targetId) return;
    const order = orderedItems(group).map((item) => item.id);
    const next = order.filter((id) => id !== draggedId);
    const targetIndex = next.indexOf(targetId);
    next.splice(Math.max(0, targetIndex + (after ? 1 : 0)), 0, draggedId);
    applyOrder(group, next);
  }

  function moveItem(group: LayoutGroup, itemId: string, offset: number) {
    const order = orderedItems(group).map((item) => item.id);
    const index = order.indexOf(itemId);
    const target = Math.max(0, Math.min(order.length - 1, index + offset));
    if (index === target) return;
    order.splice(index, 1);
    order.splice(target, 0, itemId);
    applyOrder(group, order);
  }

  function startDrag(event: ReactDragEvent<HTMLElement>, group: LayoutGroup, item: LayoutItem) {
    if (!itemAllowed(group, item)) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
    setDragging({ groupKey: group.key, itemId: item.id });
  }

  function dragOver(event: ReactDragEvent<HTMLElement>, group: LayoutGroup, item: LayoutItem) {
    if (!dragging || dragging.groupKey !== group.key) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDropTarget({ itemId: item.id, after: event.clientY > rect.top + rect.height / 2 });
  }

  function drop(event: ReactDragEvent<HTMLElement>, group: LayoutGroup, item: LayoutItem) {
    event.preventDefault();
    if (dragging?.groupKey === group.key) {
      const rect = event.currentTarget.getBoundingClientRect();
      placeItem(group, dragging.itemId, item.id, event.clientY > rect.top + rect.height / 2);
    }
    setDragging(null);
    setDropTarget(null);
  }

  async function save() {
    if (!Object.keys(draftOrders).length || saving) return;
    setSaving(true);
    setFeedback("idle");
    setMessage("در حال ذخیره چیدمان...");
    try {
      const latestResponse = await fetch("/api/customizations");
      const latestData = await latestResponse.json();
      const latest = normalizeCustomizations(latestData.customizations);
      const next: HandbookCustomizations = {
        ...latest,
        orders: { ...latest.orders, ...draftOrders },
      };
      const response = await fetch("/api/customizations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره انجام نشد.");
      setCustomizations(normalizeCustomizations(data.customizations));
      setDraftOrders({});
      setFeedback("success");
      setMessage("عملیات با موفقیت انجام شد.");
    } catch (error) {
      setFeedback("error");
      setMessage(error instanceof Error ? error.message : "ذخیره چیدمان انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="layout-manager" dir="rtl">
      <LogoutButton />
      <header className="layout-manager__header">
        <div className="layout-manager__brand">
          <img src="/bargheto-logo.png" alt="برقتو" />
          <div>
            <span>مدیریت هندبوک</span>
            <h1>چیدمان کارت‌ها</h1>
            <p>{access.fullName} · {access.role === "super_admin" ? "ادمین کل" : access.title || "مسئول بخش"}</p>
          </div>
        </div>
        <div className="layout-manager__header-actions">
          <Link href="/admin">بازگشت به ویرایش محتوا</Link>
          <Link href="/user" target="_blank">مشاهده نسخه کاربر</Link>
        </div>
      </header>

      <section className={`layout-manager__notice${feedback !== "idle" ? ` is-${feedback}` : ""}`} aria-live="polite">
        <span aria-hidden="true">{feedback === "success" ? "✓" : feedback === "error" ? "!" : "↕"}</span>
        <p>{message}</p>
      </section>

      {loading ? (
        <div className="layout-manager__empty">در حال دریافت چیدمان...</div>
      ) : visibleGroups.length ? (
        <div className="layout-manager__groups">
          {visibleGroups.map((group) => {
            const ordered = orderedItems(group);
            return (
              <section className="layout-board" key={group.key}>
                <div className="layout-board__heading">
                  <div>
                    <span>{ordered.length.toLocaleString("fa-IR")} کارت</span>
                    <h2>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                  {access.role === "super_admin" && (
                    <button type="button" onClick={() => applyOrder(group, group.items.map((item) => item.id))}>
                      بازنشانی ترتیب
                    </button>
                  )}
                </div>
                <div className="layout-board__list">
                  {ordered.map((item, index) => {
                    const allowed = itemAllowed(group, item);
                    const dropClass = dropTarget?.itemId === item.id
                      ? dropTarget.after ? " is-drop-after" : " is-drop-before"
                      : "";
                    return (
                      <article
                        className={`layout-sort-card${dragging?.itemId === item.id ? " is-dragging" : ""}${dropClass}${allowed ? "" : " is-locked"}`}
                        draggable={allowed}
                        onDragStart={(event) => startDrag(event, group, item)}
                        onDragOver={(event) => dragOver(event, group, item)}
                        onDrop={(event) => drop(event, group, item)}
                        onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                        key={item.id}
                      >
                        <span className="layout-sort-card__handle" aria-hidden="true">⠿</span>
                        <span className="layout-sort-card__number">{(index + 1).toLocaleString("fa-IR")}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </div>
                        {allowed ? (
                          <div className="layout-sort-card__buttons">
                            <button type="button" onClick={() => moveItem(group, item.id, -1)} disabled={index === 0}>بالاتر</button>
                            <button type="button" onClick={() => moveItem(group, item.id, 1)} disabled={index === ordered.length - 1}>پایین‌تر</button>
                          </div>
                        ) : (
                          <span className="layout-sort-card__locked">فقط مشاهده</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="layout-manager__empty">برای این حساب دسترسی جابه‌جایی کارت تعریف نشده است.</div>
      )}

      <button
        type="button"
        className={`layout-manager__save${feedback === "success" ? " is-success" : ""}`}
        onClick={save}
        disabled={saving || !Object.keys(draftOrders).length}
      >
        {saving ? "در حال ذخیره..." : feedback === "success" ? "✓ ذخیره شد" : "ذخیره چیدمان"}
      </button>
    </main>
  );
}
