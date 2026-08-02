"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type CSSProperties,
  type ElementType,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  emptyCustomizations,
  normalizeCustomizations,
  textFontStacks,
  type HandbookCustomizations,
  type TextFont,
  type TextStyle,
} from "../../../lib/customizations";
import type { UnitPageDefinition } from "../../../lib/unit-pages";
import LogoutButton from "../../components/LogoutButton";

type SelectedText = { field: string; fallback: string };

const colorPresets = ["#0a2e57", "#0877f9", "#fabb25", "#16a56d", "#4f4f4f", "#b44141"];
const unitImageIds = new Set([
  "unit-finance-accounting",
  "unit-sales",
  "unit-marketing",
  "unit-support",
  "unit-product",
  "unit-development",
  "unit-efficiency",
  "unit-services",
]);

function textKey(unitId: string, field: string) {
  return `section-units-resource-${unitId}-unit-page-${field}`;
}

function imageKey(unitId: string, field: string) {
  return `section-units-resource-${unitId}-unit-page-${field}`;
}

function styleCss(style?: TextStyle): CSSProperties | undefined {
  return style
    ? { fontFamily: textFontStacks[style.font], fontSize: `${style.fontSize}px`, color: style.color }
    : undefined;
}

function rgbToHex(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "#4f4f4f";
  return `#${[match[1], match[2], match[3]].map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
}

export default function UnitPageClient({
  definition,
  canEditText,
  canEditImage,
  editorName,
  editorRole,
}: {
  definition: UnitPageDefinition;
  canEditText: boolean;
  canEditImage: boolean;
  editorName: string;
  editorRole: string;
}) {
  const [customizations, setCustomizations] = useState<HandbookCustomizations>(emptyCustomizations);
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>({});
  const [draftStyles, setDraftStyles] = useState<Record<string, TextStyle>>({});
  const [removedStyles, setRemovedStyles] = useState<string[]>([]);
  const [draftImages, setDraftImages] = useState<Record<string, string>>({});
  const [selectedText, setSelectedText] = useState<SelectedText | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<TextStyle>({ font: "brand", fontSize: 16, color: "#4f4f4f" });
  const [selectedImageField, setSelectedImageField] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/customizations")
      .then((response) => response.json())
      .then((data) => setCustomizations(normalizeCustomizations(data.customizations)))
      .catch(() => {
        setFeedback("error");
        setMessage("دریافت آخرین اطلاعات این واحد انجام نشد.");
      })
      .finally(() => setLoading(false));
  }, []);

  const addedUnit = customizations.structure.addedUnits.find((unit) => unit.id === definition.id);
  const unitLabel = addedUnit?.title ?? definition.label;
  const unitIntro = addedUnit?.description || definition.intro;
  const defaultImage = unitImageIds.has(definition.id)
    ? `/unit-${definition.id.replace(/^unit-/, "")}.webp`
    : "/team-energy.png";
  const editable = canEditText || canEditImage;
  const isDirty = Object.keys(draftTexts).length > 0 || Object.keys(draftStyles).length > 0 || removedStyles.length > 0 || Object.keys(draftImages).length > 0;

  function value(field: string, fallback: string) {
    const key = textKey(definition.id, field);
    return draftTexts[key] ?? customizations.texts[key] ?? fallback;
  }

  function textStyle(field: string) {
    const key = textKey(definition.id, field);
    if (removedStyles.includes(key)) return undefined;
    return draftStyles[key] ?? customizations.textStyles[key];
  }

  function image(field: string, fallback = defaultImage) {
    const key = imageKey(definition.id, field);
    const url = draftImages[key] ?? customizations.images[key];
    if (url === "__deleted__") return null;
    return url ?? fallback;
  }

  function openTextEditor(field: string, fallback: string, element: HTMLElement) {
    if (!canEditText) return;
    const key = textKey(definition.id, field);
    const saved = textStyle(field);
    const computed = window.getComputedStyle(element);
    setSelectedStyle(saved ?? {
      font: "brand",
      fontSize: Math.max(10, Math.min(64, Math.round(Number.parseFloat(computed.fontSize) || 16))),
      color: rgbToHex(computed.color),
    });
    setSelectedText({ field, fallback });
    setFeedback("idle");
  }

  function changeSelectedText(next: string) {
    if (!selectedText) return;
    const key = textKey(definition.id, selectedText.field);
    setDraftTexts((current) => ({ ...current, [key]: next }));
    setFeedback("idle");
  }

  function changeSelectedStyle(next: TextStyle) {
    if (!selectedText) return;
    const key = textKey(definition.id, selectedText.field);
    const normalized: TextStyle = {
      font: next.font,
      fontSize: Math.max(10, Math.min(64, Math.round(next.fontSize))),
      color: /^#[0-9a-f]{6}$/i.test(next.color) ? next.color.toLowerCase() : "#4f4f4f",
    };
    setSelectedStyle(normalized);
    setDraftStyles((current) => ({ ...current, [key]: normalized }));
    setRemovedStyles((current) => current.filter((item) => item !== key));
    setFeedback("idle");
  }

  function resetSelectedStyle() {
    if (!selectedText) return;
    const key = textKey(definition.id, selectedText.field);
    setDraftStyles((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setRemovedStyles((current) => Array.from(new Set([...current, key])));
    setSelectedStyle({ font: "brand", fontSize: 16, color: "#4f4f4f" });
  }

  function EditableText({
    as: Tag,
    field,
    fallback,
    className,
  }: {
    as: ElementType;
    field: string;
    fallback: string;
    className?: string;
  }) {
    return (
      <Tag
        className={`${className ?? ""}${canEditText ? " unit-editable-text" : ""}`}
        style={styleCss(textStyle(field))}
        onClick={canEditText ? (event: { currentTarget: HTMLElement; stopPropagation: () => void }) => {
          event.stopPropagation();
          openTextEditor(field, fallback, event.currentTarget);
        } : undefined}
      >
        {value(field, fallback)}
      </Tag>
    );
  }

  function chooseImage(field: string) {
    if (!canEditImage) return;
    setSelectedImageField(field);
    fileInput.current?.click();
  }

  async function imageDimensions(file: File) {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const candidate = new Image();
        candidate.onload = () => resolve({ width: candidate.naturalWidth, height: candidate.naturalHeight });
        candidate.onerror = reject;
        candidate.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedImageField) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback("error");
      setMessage("فقط تصویر JPG، PNG یا WebP قابل بارگذاری است.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback("error");
      setMessage("حجم تصویر باید کمتر از ۵ مگابایت باشد.");
      return;
    }

    try {
      const dimensions = await imageDimensions(file);
      const hero = selectedImageField === "hero-image";
      const minWidth = hero ? 1200 : 800;
      const minHeight = hero ? 900 : 800;
      const ratio = dimensions.width / Math.max(dimensions.height, 1);
      const ratioOk = hero ? ratio >= 1.25 && ratio <= 1.45 : ratio >= 0.9 && ratio <= 1.1;
      if (dimensions.width < minWidth || dimensions.height < minHeight || !ratioOk) {
        setFeedback("error");
        setMessage(hero
          ? "این عکس برای تصویر اصلی مناسب نیست؛ عکس افقی ۱۲۰۰×۹۰۰ پیکسل با نسبت ۴:۳ بارگذاری کنید."
          : "این عکس برای کارت فرد مناسب نیست؛ عکس مربعی ۸۰۰×۸۰۰ پیکسل بارگذاری کنید.");
        return;
      }

      setUploading(true);
      setFeedback("idle");
      setMessage("در حال بارگذاری تصویر...");
      const form = new FormData();
      form.append("file", file);
      form.append("sectionKey", "units");
      form.append("resourceKey", definition.id);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "بارگذاری انجام نشد.");
      const key = imageKey(definition.id, selectedImageField);
      setDraftImages((current) => ({ ...current, [key]: data.url }));
      setMessage("تصویر آماده است؛ برای ثبت نهایی ذخیره کنید.");
    } catch (error) {
      setFeedback("error");
      setMessage(error instanceof Error ? error.message : "بارگذاری تصویر انجام نشد.");
    } finally {
      setUploading(false);
    }
  }

  function deleteImage(field: string) {
    if (!canEditImage) return;
    const key = imageKey(definition.id, field);
    setDraftImages((current) => ({ ...current, [key]: "__deleted__" }));
    setFeedback("idle");
    setMessage("تصویر حذف شد؛ برای ثبت نهایی ذخیره کنید.");
  }

  async function save() {
    if (!isDirty || saving) return;
    setSaving(true);
    setFeedback("idle");
    setMessage("در حال ذخیره صفحه واحد...");
    try {
      const latestResponse = await fetch("/api/customizations");
      const latestData = await latestResponse.json();
      const latest = normalizeCustomizations(latestData.customizations);
      const nextStyles = { ...latest.textStyles, ...draftStyles };
      removedStyles.forEach((key) => delete nextStyles[key]);
      const next: HandbookCustomizations = {
        ...latest,
        texts: { ...latest.texts, ...draftTexts },
        textStyles: nextStyles,
        images: { ...latest.images, ...draftImages },
      };
      const response = await fetch("/api/customizations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ذخیره انجام نشد.");
      setCustomizations(normalizeCustomizations(data.customizations));
      setDraftTexts({});
      setDraftStyles({});
      setRemovedStyles([]);
      setDraftImages({});
      setFeedback("success");
      setMessage("عملیات با موفقیت انجام شد؛ تغییرات برای کاربران قابل مشاهده است.");
    } catch (error) {
      setFeedback("error");
      setMessage(error instanceof Error ? error.message : "ذخیره صفحه واحد انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  const members = [0, 1, 2, 3].map((index) => ({
    index,
    name: index === 0 ? `مسئول واحد ${unitLabel}` : `همکار ${index + 1} واحد ${unitLabel}`,
    role: index === 0 ? `سرپرست ${unitLabel}` : `کارشناس ${unitLabel}`,
  }));

  return (
    <main className={`unit-page${editable ? " unit-page--editable" : ""}`} dir="rtl">
      <LogoutButton />
      <header className="unit-page__topbar">
        <Link href="/user" className="unit-page__brand"><img src="/bargheto-logo.png" alt="برقتو" /></Link>
        <nav aria-label="مسیر صفحه">
          <Link href="/user">هندبوک</Link><span>/</span><span>واحد {unitLabel}</span>
        </nav>
        {editable && <div className="unit-page__editor-badge"><span>حالت ویرایش</span><strong>{editorName}</strong><small>{editorRole}</small></div>}
      </header>

      <section className="unit-page__hero">
        <div className="unit-page__hero-copy">
          <span className="unit-page__eyebrow">آشنایی با واحدهای برقتو</span>
          <EditableText as="h1" field="title" fallback={`واحد ${unitLabel}`} />
          <EditableText as="p" field="intro" fallback={unitIntro} />
          <div className="unit-page__hero-meta"><span>ماموریت روشن</span><span>همکاری شفاف</span><span>یادگیری مستمر</span></div>
        </div>
        <div className={`unit-page__hero-image${image("hero-image") ? "" : " is-empty"}`}>
          {image("hero-image") ? <img src={image("hero-image")!} alt={`تیم ${unitLabel}`} /> : <span aria-hidden="true">⚡</span>}
          {canEditImage && <div className="unit-image-actions"><button type="button" onClick={() => chooseImage("hero-image")}><span>تغییر تصویر</span><small>۱۲۰۰×۹۰۰ · افقی</small></button><button type="button" onClick={() => deleteImage("hero-image")}>حذف</button></div>}
        </div>
      </section>

      <section className="unit-page__section unit-page__team">
        <div className="unit-page__section-heading">
          <span>اول از همه، آدم‌ها</span>
          <EditableText as="h2" field="team-title" fallback={`اعضای واحد ${unitLabel}`} />
          <EditableText as="p" field="team-description" fallback="با همکارانی که این واحد را می‌سازند آشنا شوید؛ نام، نقش و تصویر واقعی هر فرد توسط مسئول واحد تکمیل می‌شود." />
        </div>
        <div className="unit-members">
          {members.map((member) => {
            const memberImage = image(`member-${member.index}-image`, member.index === 0 ? defaultImage : "/team-energy.png");
            return (
              <article className="unit-member-card" key={member.index}>
                <div className={`unit-member-card__image${memberImage ? "" : " is-empty"}`}>
                  {memberImage ? <img src={memberImage} alt={value(`member-${member.index}-name`, member.name)} /> : <span aria-hidden="true">＋</span>}
                  {canEditImage && <div className="unit-image-actions"><button type="button" onClick={() => chooseImage(`member-${member.index}-image`)}><span>تغییر عکس</span><small>۸۰۰×۸۰۰ · مربعی</small></button><button type="button" onClick={() => deleteImage(`member-${member.index}-image`)}>حذف</button></div>}
                </div>
                <div className="unit-member-card__copy">
                  <EditableText as="h3" field={`member-${member.index}-name`} fallback={member.name} />
                  <EditableText as="p" field={`member-${member.index}-role`} fallback={member.role} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="unit-page__mission">
        <div>
          <span className="unit-page__eyebrow">چرا این واحد وجود دارد؟</span>
          <EditableText as="h2" field="mission-title" fallback="مأموریت ما" />
        </div>
        <EditableText as="p" field="mission" fallback={definition.mission} />
      </section>

      <section className="unit-page__section">
        <div className="unit-page__section-heading">
          <span>خروجی‌های اصلی</span>
          <EditableText as="h2" field="responsibilities-title" fallback="مسئولیت‌های کلیدی" />
          <EditableText as="p" field="responsibilities-description" fallback="سه حوزه‌ای که نتیجه این واحد با آن‌ها سنجیده می‌شود." />
        </div>
        <div className="unit-responsibilities">
          {definition.responsibilities.map((item, index) => (
            <article key={index}>
              <span>{(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span>
              <EditableText as="h3" field={`responsibility-${index}-title`} fallback={item.title} />
              <EditableText as="p" field={`responsibility-${index}-description`} fallback={item.description} />
            </article>
          ))}
        </div>
      </section>

      <section className="unit-page__section unit-page__workflow">
        <div className="unit-page__section-heading">
          <span>از درخواست تا نتیجه</span>
          <EditableText as="h2" field="workflow-title" fallback={`روش همکاری با واحد ${unitLabel}`} />
          <EditableText as="p" field="workflow-description" fallback="برای اینکه درخواست‌ها سریع و شفاف پیش بروند، این مسیر ساده را دنبال می‌کنیم." />
        </div>
        <div className="unit-workflow">
          {definition.workflow.map((item, index) => (
            <article key={index}>
              <div><span>{index + 1}</span><i /></div>
              <EditableText as="h3" field={`workflow-${index}-title`} fallback={item.title} />
              <EditableText as="p" field={`workflow-${index}-description`} fallback={item.description} />
            </article>
          ))}
        </div>
      </section>

      <section className="unit-page__onboarding">
        <div className="unit-page__onboarding-copy">
          <span className="unit-page__eyebrow">برای همکار جدید</span>
          <EditableText as="h2" field="onboarding-title" fallback="شروع خوب در هفته اول" />
          <EditableText as="p" field="onboarding-description" fallback={`اگر تازه به واحد ${unitLabel} پیوسته‌اید، این چهار قدم شروع شما را ساده‌تر می‌کند.`} />
        </div>
        <div className="unit-checklist">
          {definition.checklist.map((item, index) => (
            <div key={index}><span>✓</span><EditableText as="p" field={`checklist-${index}`} fallback={item} /></div>
          ))}
        </div>
      </section>

      <section className="unit-page__contact">
        <div>
          <span>نیاز به همکاری با این واحد دارید؟</span>
          <EditableText as="h2" field="contact-title" fallback={`ارتباط با واحد ${unitLabel}`} />
          <EditableText as="p" field="contact-description" fallback="درخواست خود را با موضوع روشن، نتیجه مورد انتظار و زمان موردنیاز ثبت کنید تا سریع‌تر پاسخ بگیرید." />
        </div>
        <div className="unit-page__contact-card"><span>کانال ارتباطی</span><EditableText as="strong" field="contact-channel" fallback="در این قسمت مسیر تماس یا ابزار داخلی را وارد کنید" /></div>
      </section>

      <footer className="unit-page__footer"><img src="/bargheto-logo.png" alt="برقتو" /><p>هندبوک برقتو · آشنایی شفاف برای شروعی بهتر</p><Link href="/user">بازگشت به هندبوک</Link></footer>

      {selectedText && canEditText && (
        <aside className="unit-text-editor" aria-label="ویرایش متن واحد">
          <header><div><span>ویرایش صفحه واحد</span><strong>متن و ظاهر</strong></div><button type="button" onClick={() => setSelectedText(null)}>×</button></header>
          <div className="unit-text-editor__body">
            <label>متن<textarea rows={4} value={value(selectedText.field, selectedText.fallback)} onChange={(event) => changeSelectedText(event.target.value)} /></label>
            <label>فونت<select value={selectedStyle.font} onChange={(event) => changeSelectedStyle({ ...selectedStyle, font: event.target.value as TextFont })}><option value="brand">فونت پیش‌فرض برقتو</option><option value="tahoma">Tahoma</option><option value="arial">Arial</option><option value="serif">Serif</option></select></label>
            <label><span className="unit-text-editor__label-row"><span>اندازه</span><bdi>{selectedStyle.fontSize}px</bdi></span><input type="range" min="10" max="64" value={selectedStyle.fontSize} onChange={(event) => changeSelectedStyle({ ...selectedStyle, fontSize: Number(event.target.value) })} /></label>
            <label>رنگ<div className="unit-text-editor__color"><input type="color" value={selectedStyle.color} onChange={(event) => changeSelectedStyle({ ...selectedStyle, color: event.target.value })} /><bdi>{selectedStyle.color}</bdi></div></label>
            <div className="unit-text-editor__presets">{colorPresets.map((color) => <button type="button" style={{ backgroundColor: color }} className={selectedStyle.color === color ? "is-active" : ""} onClick={() => changeSelectedStyle({ ...selectedStyle, color })} aria-label={`انتخاب رنگ ${color}`} key={color} />)}</div>
            <button type="button" className="unit-text-editor__reset" onClick={resetSelectedStyle}>بازگشت ظاهر متن به پیش‌فرض</button>
          </div>
        </aside>
      )}

      {editable && (
        <button type="button" className={`unit-page__save${feedback === "success" ? " is-success" : ""}`} onClick={save} disabled={saving || !isDirty}>
          {saving ? "در حال ذخیره..." : feedback === "success" ? "✓ ذخیره شد" : "ذخیره تغییرات واحد"}
        </button>
      )}

      {message && <div className={`unit-page__toast${feedback !== "idle" ? ` is-${feedback}` : ""}`} role={feedback === "error" ? "alert" : "status"}><span>{feedback === "success" ? "✓" : feedback === "error" ? "!" : "i"}</span><p>{message}</p></div>}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadImage} />
      {(loading || uploading) && <div className="unit-page__busy">{loading ? "در حال دریافت اطلاعات واحد..." : "در حال بارگذاری تصویر..."}</div>}
    </main>
  );
}
