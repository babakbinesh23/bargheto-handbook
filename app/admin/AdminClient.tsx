"use client";

import {
  ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
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
} from "../../lib/customizations";
import UserPage from "../user/page";
import { can, type CurrentAccess, type SectionKey } from "../../lib/permissions";
import AdminAccessPanel from "./AdminAccessPanel";
import LogoutButton from "../components/LogoutButton";

type SelectedItem = {
  element: HTMLElement;
  kind: "text" | "image" | "item";
  key: string;
};

type CropDraft = {
  fileName: string;
  imageHeight: number;
  imageWidth: number;
  key: string;
  previewUrl: string;
  qualityMessage: string;
  qualityOk: boolean;
  recommendedHeight: number;
  recommendedWidth: number;
  targetRatio: number;
  x: number;
  y: number;
  zoom: number;
};

type AdminAddTarget =
  | "leadership"
  | "personnel"
  | "unit"
  | "policy"
  | "section";

const textColorPresets = ["#0a2e57", "#0877f9", "#fabb25", "#16a56d", "#4f4f4f", "#b44141"];

function rgbToHex(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return "#4f4f4f";
  return `#${[match[1], match[2], match[3]]
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("")}`;
}

function applyTextStyle(element: HTMLElement, style?: TextStyle) {
  element.style.fontFamily = style ? textFontStacks[style.font] : "";
  element.style.fontSize = style ? `${style.fontSize}px` : "";
  element.style.color = style?.color ?? "";
}

function cropPlacement(draft: CropDraft) {
  const imageRatio = draft.imageWidth / draft.imageHeight;
  const baseWidth = imageRatio >= draft.targetRatio
    ? (imageRatio / draft.targetRatio) * 100
    : 100;
  const baseHeight = imageRatio >= draft.targetRatio
    ? 100
    : (draft.targetRatio / imageRatio) * 100;
  return {
    width: baseWidth * draft.zoom,
    height: baseHeight * draft.zoom,
  };
}

function cropPreviewStyle(draft: CropDraft): CSSProperties {
  const { width, height } = cropPlacement(draft);
  return {
    width: `${width}%`,
    height: `${height}%`,
    left: `${-((width - 100) * draft.x) / 100}%`,
    top: `${-((height - 100) * draft.y) / 100}%`,
  };
}

const defaultPeople = [
  ["leadership-0", "امید علوی", "هیئت‌مدیره"],
  ["leadership-1", "ساسان سیفی", "هیئت‌مدیره"],
  ["personnel-finance-accounting", "همکار واحد مالی و حسابداری", "پرسنل"],
  ["personnel-sales", "همکار واحد فروش", "پرسنل"],
  ["personnel-marketing", "همکار واحد مارکتینگ", "پرسنل"],
  ["personnel-support", "همکار واحد پشتیبانی", "پرسنل"],
  ["personnel-product", "همکار واحد محصول", "پرسنل"],
  ["personnel-development", "همکار واحد توسعه", "پرسنل"],
  ["personnel-efficiency", "همکار واحد صرفه‌جویی", "پرسنل"],
  ["personnel-services", "همکار واحد خدمات", "پرسنل"],
];

const defaultUnits = [
  ["unit-finance-accounting", "مالی و حسابداری"],
  ["unit-sales", "فروش"],
  ["unit-marketing", "مارکتینگ"],
  ["unit-support", "پشتیبانی"],
  ["unit-product", "محصول"],
  ["unit-development", "توسعه"],
  ["unit-efficiency", "صرفه‌جویی"],
  ["unit-services", "خدمات"],
];

const defaultPolicies = [
  "ساعت کاری و مرخصی",
  "حقوق، بیمه و مزایا",
  "رفتار حرفه‌ای",
  "امنیت و محرمانگی",
  "ارتباطات داخلی",
  "بهداشت و ایمنی",
  "تحویل اطلاعات و تجهیزات",
  "منابع، اموال و یادگیری",
];

const managedSections = [
  ["products", "محصولات برقتو"],
  ["company", "معارفه شرکت"],
  ["founders", "پیام بنیان‌گذاران"],
  ["units", "ساختار واحدها"],
  ["values", "ارزش‌های سازمانی"],
  ["policies", "قوانین و رویه‌ها"],
];

export default function AdminPage({ access }: { access: CurrentAccess }) {
  const [customizations, setCustomizations] =
    useState<HandbookCustomizations>(emptyCustomizations);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [textStyleDraft, setTextStyleDraft] = useState<TextStyle>({
    font: "brand",
    fontSize: 16,
    color: "#4f4f4f",
  });
  const [, setStatus] = useState("برای ویرایش، روی متن یا عکس کلیک کنید.");
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] =
    useState<"idle" | "success" | "error">("idle");
  const [managerOpen, setManagerOpen] = useState(false);
  const [accessPanelOpen, setAccessPanelOpen] = useState(false);
  const [managerTarget, setManagerTarget] =
    useState<AdminAddTarget | null>(null);
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [cropUploading, setCropUploading] = useState(false);
  const [personForm, setPersonForm] = useState({
    group: "personnel" as "leadership" | "personnel",
    name: "",
    role: "",
    bio: "",
  });
  const [unitForm, setUnitForm] = useState({ title: "", description: "" });
  const [policyForm, setPolicyForm] = useState({
    title: "",
    summary: "",
    body: "",
  });
  const [sectionForm, setSectionForm] = useState({ title: "", body: "" });
  const fileInput = useRef<HTMLInputElement>(null);
  const saveFeedbackTimer = useRef<number | null>(null);
  const cropDrag = useRef<{
    initialX: number;
    initialY: number;
    overflowX: number;
    overflowY: number;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/customizations")
      .then((response) => response.json())
      .then((data) => setCustomizations(normalizeCustomizations(data.customizations)))
      .catch(() => setStatus("نسخه فعلی نمایش داده شد؛ دریافت تغییرات قبلی ممکن نبود."));
  }, []);

  useEffect(
    () => () => {
      if (saveFeedbackTimer.current !== null) {
        window.clearTimeout(saveFeedbackTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!managerOpen || !managerTarget) return;
    const sectionId =
      managerTarget === "leadership" || managerTarget === "personnel"
        ? "structure-people"
        : `structure-${managerTarget}`;
    const timer = window.setTimeout(() => {
      const section = document.getElementById(sectionId);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [managerOpen, managerTarget]);

  function openStructureManager(target?: AdminAddTarget) {
    const section: SectionKey = target === "leadership" ? "leadership"
      : target === "personnel" ? "personnel"
      : target === "unit" ? "units"
      : target === "policy" ? "policies" : "custom_sections";
    if (!can(access, section, "canManageItems")) {
      setStatus("برای مدیریت آیتم‌های این بخش دسترسی ندارید.");
      return;
    }
    if (target === "leadership" || target === "personnel") {
      setPersonForm((previous) => ({ ...previous, group: target }));
    }
    setManagerTarget(target ?? null);
    setManagerOpen(true);
  }

  function selectFromPage(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (
      target.closest(
        ".admin-save-fab, .admin-save-toast, .admin-selection-tools, .structure-manager, .image-cropper, .admin-side-menu, .text-style-editor, .team-card__link",
      )
    )
      return;

    const previewTrigger = target.closest<HTMLElement>(
      "[data-card-preview-trigger]",
    );
    if (previewTrigger) {
      const section = permissionSection(previewTrigger);
      const resource = permissionResource(previewTrigger);
      if (!section || !can(access, section, "canEditText", resource)) return denySelection();
      event.preventDefault();
      event.stopPropagation();
      const card = previewTrigger.closest<HTMLElement>(
        ".person-card, .product-card",
      );
      if (card) {
        const opened = card.classList.toggle("is-admin-preview");
        setStatus(
          opened
            ? "پیش‌نمایش باز شد؛ روی نام، سمت یا توضیح کلیک کنید و متن را تغییر دهید."
            : "پیش‌نمایش بسته شد.",
        );
      }
      return;
    }

    const imageTrigger = target.closest<HTMLElement>("[data-image-trigger]");
    if (imageTrigger) {
      const section = permissionSection(imageTrigger);
      const resource = permissionResource(imageTrigger);
      if (!section || !can(access, section, "canEditImage", resource)) return denySelection();
      event.preventDefault();
      event.stopPropagation();
      const imageContainer = imageTrigger.closest(
        ".person-card, .learner-hero__visual",
      );
      const image = imageContainer?.querySelector<HTMLElement>(
        "[data-edit-image]",
      );
      if (image?.dataset.editImage) {
        setSelected({
          element: image,
          kind: "image",
          key: image.dataset.editImage,
        });
        setStatus("عکس انتخاب شد؛ فایل جدید را انتخاب کنید.");
        fileInput.current?.click();
      }
      return;
    }

    const image = target.closest<HTMLElement>("[data-edit-image]");
    if (image) {
      const section = permissionSection(image);
      const resource = permissionResource(image);
      if (!section || !can(access, section, "canEditImage", resource)) return denySelection();
      event.preventDefault();
      event.stopPropagation();
      setSelected({ element: image, kind: "image", key: image.dataset.editImage! });
      setStatus("عکس انتخاب شد؛ فایل جدید را انتخاب کنید.");
      fileInput.current?.click();
      return;
    }

    const text = target.closest<HTMLElement>("[data-edit-text]");
    if (text) {
      const section = permissionSection(text);
      const resource = permissionResource(text);
      if (!section || !can(access, section, "canEditText", resource)) return denySelection();
      event.preventDefault();
      text.contentEditable = "true";
      text.focus();
      document.execCommand("selectAll", false);
      const key = text.dataset.editText!;
      const savedStyle = customizations.textStyles[key];
      const computed = window.getComputedStyle(text);
      setTextStyleDraft(savedStyle ?? {
        font: "brand",
        fontSize: Math.max(10, Math.min(64, Math.round(Number.parseFloat(computed.fontSize) || 16))),
        color: rgbToHex(computed.color),
      });
      setSelected({ element: text, kind: "text", key });
      setStatus("متن را ویرایش کنید یا ظاهر آن را از پنل تنظیم کنید.");
      return;
    }

    const item = target.closest<HTMLElement>("[data-sort-key]");
    if (item) {
      const section = permissionSection(item);
      const resource = permissionResource(item);
      if (!section || !can(access, section, "canReorder", resource)) return denySelection();
      setSelected({ element: item, kind: "item", key: item.dataset.sortKey! });
      setStatus("برای جابه‌جایی کارت‌ها از صفحه «چیدمان کارت‌ها» استفاده کنید.");
    }
  }

  function permissionSection(element: HTMLElement): SectionKey | null {
    const value = element.closest<HTMLElement>("[data-permission-section]")?.dataset.permissionSection;
    return (["company", "products", "leadership", "personnel", "units", "values", "policies", "custom_sections"] as string[]).includes(value || "")
      ? value as SectionKey : null;
  }

  function permissionResource(element: HTMLElement) {
    return element.closest<HTMLElement>("[data-permission-resource]")
      ?.dataset.permissionResource ?? "*";
  }

  function denySelection() {
    setStatus("این بخش خارج از دسترسی ویرایش شماست.");
  }

  function finishTextEdit() {
    if (!selected || selected.kind !== "text") return customizations;
    const value = selected.element.innerText.trim();
    selected.element.removeAttribute("contenteditable");
    const next = {
      ...customizations,
      texts: { ...customizations.texts, [selected.key]: value },
    };
    setCustomizations(next);
    setStatus("تغییر متن آماده ذخیره است.");
    return next;
  }

  function updateSelectedTextStyle(style: TextStyle) {
    if (!selected || selected.kind !== "text") return;
    const normalized: TextStyle = {
      font: style.font,
      fontSize: Math.max(10, Math.min(64, Math.round(style.fontSize))),
      color: /^#[0-9a-f]{6}$/i.test(style.color) ? style.color.toLowerCase() : "#4f4f4f",
    };
    setTextStyleDraft(normalized);
    applyTextStyle(selected.element, normalized);
    const value = selected.element.innerText.trim();
    setCustomizations((previous) => ({
      ...previous,
      texts: { ...previous.texts, [selected.key]: value },
      textStyles: { ...previous.textStyles, [selected.key]: normalized },
    }));
    setStatus("ظاهر متن آماده ذخیره است.");
  }

  function resetSelectedTextStyle() {
    if (!selected || selected.kind !== "text") return;
    applyTextStyle(selected.element);
    setCustomizations((previous) => {
      const textStyles = { ...previous.textStyles };
      delete textStyles[selected.key];
      return {
        ...previous,
        texts: { ...previous.texts, [selected.key]: selected.element.innerText.trim() },
        textStyles,
      };
    });
    const computed = window.getComputedStyle(selected.element);
    setTextStyleDraft({
      font: "brand",
      fontSize: Math.max(10, Math.min(64, Math.round(Number.parseFloat(computed.fontSize) || 16))),
      color: rgbToHex(computed.color),
    });
    setStatus("ظاهر متن به حالت پیش‌فرض برگشت و آماده ذخیره است.");
  }

  function closeTextStyleEditor() {
    if (selected?.kind === "text") {
      finishTextEdit();
      selected.element.removeAttribute("contenteditable");
    }
    setSelected(null);
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selected || selected.kind !== "image") return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus("فقط تصویر JPG، PNG یا WebP مجاز است.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus("حجم تصویر اولیه باید کمتر از ۱۲ مگابایت باشد.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const bounds = selected.element.getBoundingClientRect();
      const targetRatio = Math.min(
        3,
        Math.max(0.45, bounds.width / Math.max(bounds.height, 1)),
      );
      const recommendedWidth = targetRatio >= 1
        ? 1200
        : Math.round(1200 * targetRatio);
      const recommendedHeight = targetRatio >= 1
        ? Math.round(1200 / targetRatio)
        : 1200;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const availableCropWidth = imageRatio >= targetRatio
        ? image.naturalHeight * targetRatio
        : image.naturalWidth;
      const availableCropHeight = imageRatio >= targetRatio
        ? image.naturalHeight
        : image.naturalWidth / targetRatio;
      const qualityOk =
        availableCropWidth >= recommendedWidth * 0.72 &&
        availableCropHeight >= recommendedHeight * 0.72;
      const qualityMessage = qualityOk
        ? `کیفیت مناسب است؛ ابعاد عکس ${image.naturalWidth}×${image.naturalHeight} پیکسل است.`
        : `این عکس برای این کادر مناسب نیست. ابعاد فعلی ${image.naturalWidth}×${image.naturalHeight} است؛ لطفاً عکس حداقل ${recommendedWidth}×${recommendedHeight} پیکسل با نسبت نزدیک ${targetRatio.toFixed(2)} بارگذاری کنید.`;
      setCropDraft((previous) => {
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        return {
          fileName: file.name,
          imageHeight: image.naturalHeight,
          imageWidth: image.naturalWidth,
          key: selected.key,
          previewUrl,
          qualityMessage,
          qualityOk,
          recommendedHeight,
          recommendedWidth,
          targetRatio,
          x: 50,
          y: 50,
          zoom: 1,
        };
      });
      setStatus("زاویه و برش تصویر را تنظیم کنید.");
    };
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setStatus("خواندن این تصویر ممکن نبود.");
    };
    image.src = previewUrl;
  }

  function closeCropper() {
    if (cropDraft) URL.revokeObjectURL(cropDraft.previewUrl);
    cropDrag.current = null;
    setCropDraft(null);
    setCropUploading(false);
  }

  function startCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!cropDraft || cropUploading) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = cropPlacement(cropDraft);
    cropDrag.current = {
      initialX: cropDraft.x,
      initialY: cropDraft.y,
      overflowX: Math.max(0, ((placement.width - 100) / 100) * bounds.width),
      overflowY: Math.max(0, ((placement.height - 100) / 100) * bounds.height),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = cropDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const nextX = drag.overflowX > 0
      ? Math.min(100, Math.max(0, drag.initialX - (deltaX / drag.overflowX) * 100))
      : drag.initialX;
    const nextY = drag.overflowY > 0
      ? Math.min(100, Math.max(0, drag.initialY - (deltaY / drag.overflowY) * 100))
      : drag.initialY;
    setCropDraft((current) =>
      current ? { ...current, x: nextX, y: nextY } : current
    );
  }

  function endCropDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (cropDrag.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropDrag.current = null;
  }

  async function uploadCroppedImage() {
    if (!cropDraft || !cropDraft.qualityOk) return;
    setCropUploading(true);
    setStatus("در حال آماده‌سازی و بارگذاری تصویر...");

    const image = new Image();
    image.src = cropDraft.previewUrl;
    const form = new FormData();
    try {
      await image.decode();

      const imageRatio = cropDraft.imageWidth / cropDraft.imageHeight;
      const baseCropWidth = imageRatio >= cropDraft.targetRatio
        ? cropDraft.imageHeight * cropDraft.targetRatio
        : cropDraft.imageWidth;
      const baseCropHeight = imageRatio >= cropDraft.targetRatio
        ? cropDraft.imageHeight
        : cropDraft.imageWidth / cropDraft.targetRatio;
      const cropWidth = baseCropWidth / cropDraft.zoom;
      const cropHeight = baseCropHeight / cropDraft.zoom;
      const sourceX =
        (cropDraft.imageWidth - cropWidth) * (cropDraft.x / 100);
      const sourceY =
        (cropDraft.imageHeight - cropHeight) * (cropDraft.y / 100);

      const outputWidth = cropDraft.targetRatio >= 1
        ? 1200
        : Math.round(1200 * cropDraft.targetRatio);
      const outputHeight = cropDraft.targetRatio >= 1
        ? Math.round(1200 / cropDraft.targetRatio)
        : 1200;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, outputWidth);
      canvas.height = Math.max(1, outputHeight);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("آماده‌سازی تصویر ممکن نبود.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => value ? resolve(value) : reject(new Error("ساخت تصویر انجام نشد.")),
          "image/webp",
          0.9,
        );
      });
      const croppedFile = new File(
        [blob],
        `${cropDraft.fileName.replace(/\.[^.]+$/, "")}-cropped.webp`,
        { type: "image/webp" },
      );
      form.append("file", croppedFile);
      const selectedSection = selected ? permissionSection(selected.element) : null;
      if (!selectedSection) throw new Error("بخش تصویر قابل تشخیص نیست.");
      form.append("sectionKey", selectedSection);
      form.append("resourceKey", selected ? permissionResource(selected.element) : "*");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCustomizations((previous) => ({
        ...previous,
        images: { ...previous.images, [cropDraft.key]: data.url },
      }));
      setStatus("تصویر با برش انتخابی آماده ذخیره است.");
      closeCropper();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "بارگذاری تصویر انجام نشد.");
      setCropUploading(false);
    }
  }

  function updateStructure(
    update: (
      structure: HandbookCustomizations["structure"],
    ) => HandbookCustomizations["structure"],
  ) {
    setCustomizations((previous) => ({
      ...previous,
      structure: update(previous.structure),
    }));
    setStatus("تغییر ساختاری آماده ذخیره است.");
  }

  function addPerson() {
    if (!can(access, personForm.group, "canManageItems")) return denySelection();
    if (!personForm.name.trim() || !personForm.role.trim()) return;
    updateStructure((structure) => ({
      ...structure,
      addedPeople: [
        ...structure.addedPeople,
        {
          id: `person-${crypto.randomUUID()}`,
          group: personForm.group,
          name: personForm.name.trim(),
          role: personForm.role.trim(),
          bio: personForm.bio.trim() || "توضیحات این همکار را تکمیل کنید.",
        },
      ],
    }));
    setPersonForm({ group: "personnel", name: "", role: "", bio: "" });
  }

  function removePerson(id: string, added: boolean) {
    updateStructure((structure) => ({
      ...structure,
      addedPeople: added
        ? structure.addedPeople.filter((person) => person.id !== id)
        : structure.addedPeople,
      removedPeople: added
        ? structure.removedPeople
        : Array.from(new Set([...structure.removedPeople, id])),
    }));
  }

  function addUnit() {
    if (!can(access, "units", "canManageItems")) return denySelection();
    if (!unitForm.title.trim()) return;
    updateStructure((structure) => ({
      ...structure,
      addedUnits: [
        ...structure.addedUnits,
        {
          id: `unit-${crypto.randomUUID()}`,
          title: unitForm.title.trim(),
          description:
            unitForm.description.trim() || "شرح مأموریت این واحد را تکمیل کنید.",
        },
      ],
    }));
    setUnitForm({ title: "", description: "" });
  }

  function removeUnit(id: string, added: boolean) {
    updateStructure((structure) => ({
      ...structure,
      addedUnits: added
        ? structure.addedUnits.filter((unit) => unit.id !== id)
        : structure.addedUnits,
      removedUnits: added
        ? structure.removedUnits
        : Array.from(new Set([...structure.removedUnits, id])),
    }));
  }

  function addPolicy() {
    if (!can(access, "policies", "canManageItems")) return denySelection();
    if (!policyForm.title.trim()) return;
    updateStructure((structure) => ({
      ...structure,
      addedPolicies: [
        ...structure.addedPolicies,
        {
          id: `policy-${crypto.randomUUID()}`,
          title: policyForm.title.trim(),
          summary: policyForm.summary.trim() || "خلاصه قانون را تکمیل کنید.",
          body: policyForm.body.trim() || "متن کامل قانون را تکمیل کنید.",
        },
      ],
    }));
    setPolicyForm({ title: "", summary: "", body: "" });
  }

  function removePolicy(id: string, added: boolean) {
    updateStructure((structure) => ({
      ...structure,
      addedPolicies: added
        ? structure.addedPolicies.filter((policy) => policy.id !== id)
        : structure.addedPolicies,
      removedPolicies: added
        ? structure.removedPolicies
        : Array.from(new Set([...structure.removedPolicies, id])),
    }));
  }

  function toggleSection(id: string) {
    if (access.role !== "super_admin") return denySelection();
    updateStructure((structure) => ({
      ...structure,
      hiddenSections: structure.hiddenSections.includes(id)
        ? structure.hiddenSections.filter((sectionId) => sectionId !== id)
        : [...structure.hiddenSections, id],
    }));
  }

  function addSection() {
    if (!can(access, "custom_sections", "canManageItems")) return denySelection();
    if (!sectionForm.title.trim()) return;
    updateStructure((structure) => ({
      ...structure,
      customSections: [
        ...structure.customSections,
        {
          id: `section-${crypto.randomUUID()}`,
          title: sectionForm.title.trim(),
          body: sectionForm.body.trim() || "محتوای این بخش را تکمیل کنید.",
          visible: true,
        },
      ],
    }));
    setSectionForm({ title: "", body: "" });
  }

  function toggleCustomSection(id: string) {
    updateStructure((structure) => ({
      ...structure,
      customSections: structure.customSections.map((section) =>
        section.id === id
          ? { ...section, visible: !section.visible }
          : section,
      ),
    }));
  }

  function removeCustomSection(id: string) {
    updateStructure((structure) => ({
      ...structure,
      customSections: structure.customSections.filter(
        (section) => section.id !== id,
      ),
    }));
  }

  async function saveAll() {
    const latest = finishTextEdit();
    if (saveFeedbackTimer.current !== null) {
      window.clearTimeout(saveFeedbackTimer.current);
    }
    setSaveFeedback("idle");
    setSaving(true);
    setStatus("در حال ذخیره برای صفحه کاربر...");
    try {
      const response = await fetch("/api/customizations", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(latest),
      });
      if (!response.ok) throw new Error();
      setStatus("همه تغییرات ذخیره شد و در صفحه کاربر قابل مشاهده است.");
      setSaveFeedback("success");
    } catch {
      setStatus("ذخیره انجام نشد؛ دوباره تلاش کنید.");
      setSaveFeedback("error");
    } finally {
      setSaving(false);
      saveFeedbackTimer.current = window.setTimeout(() => {
        setSaveFeedback("idle");
        saveFeedbackTimer.current = null;
      }, 3600);
    }
  }

  return (
    <div
      className="admin-preview admin-direct-edit"
      dir="rtl"
      onClick={selectFromPage}
      onBlur={finishTextEdit}
    >
      <LogoutButton />
      <UserPage
        adminMode
        access={access}
        customizations={customizations}
        onAdminAdd={openStructureManager}
      />

      {selected?.kind === "text" && (
        <aside className="text-style-editor" aria-label="تنظیم ظاهر متن">
          <header>
            <div>
              <span>ویرایش متن</span>
              <strong>فونت، اندازه و رنگ</strong>
            </div>
            <button type="button" onClick={closeTextStyleEditor} aria-label="بستن تنظیمات متن">×</button>
          </header>
          <div className="text-style-editor__body">
            <label>
              فونت
              <select
                value={textStyleDraft.font}
                onChange={(event) => updateSelectedTextStyle({ ...textStyleDraft, font: event.target.value as TextFont })}
              >
                <option value="brand">فونت پیش‌فرض برقتو</option>
                <option value="tahoma">Tahoma</option>
                <option value="arial">Arial</option>
                <option value="serif">Serif</option>
              </select>
            </label>
            <label>
              <span className="text-style-editor__label-row">
                <span>اندازه متن</span>
                <bdi>{textStyleDraft.fontSize}px</bdi>
              </span>
              <input
                type="range"
                min="10"
                max="64"
                step="1"
                value={textStyleDraft.fontSize}
                onChange={(event) => updateSelectedTextStyle({ ...textStyleDraft, fontSize: Number(event.target.value) })}
              />
            </label>
            <label>
              رنگ متن
              <div className="text-style-editor__color-row">
                <input
                  type="color"
                  value={textStyleDraft.color}
                  onChange={(event) => updateSelectedTextStyle({ ...textStyleDraft, color: event.target.value })}
                />
                <bdi>{textStyleDraft.color}</bdi>
              </div>
            </label>
            <div className="text-style-editor__presets" aria-label="رنگ‌های پیشنهادی">
              {textColorPresets.map((color) => (
                <button
                  type="button"
                  style={{ backgroundColor: color }}
                  className={textStyleDraft.color === color ? "is-active" : ""}
                  onClick={() => updateSelectedTextStyle({ ...textStyleDraft, color })}
                  aria-label={`انتخاب رنگ ${color}`}
                  key={color}
                />
              ))}
            </div>
            <button type="button" className="text-style-editor__reset" onClick={resetSelectedTextStyle}>
              بازگشت به ظاهر پیش‌فرض
            </button>
            <p>تغییرات پس از زدن دکمه «ذخیره تغییرات» برای کاربران نمایش داده می‌شود.</p>
          </div>
        </aside>
      )}

      <aside className="admin-side-menu" aria-label="منوی مدیریت">
        <div className="admin-identity-badge">
          <span>منوی مدیریت</span>
          <strong>{access.fullName}</strong>
          <small>{access.role === "super_admin" ? "ادمین کل" : access.title || "مسئول بخش"}</small>
        </div>
        <nav>
          {access.role === "super_admin" && (
            <section className="admin-menu-group" aria-label="مدیریت دسترسی">
              <span className="admin-menu-group__label">دسترسی‌ها</span>
              <button type="button" className="admin-menu-button admin-menu-button--access" onClick={() => setAccessPanelOpen(true)}>
                <span className="admin-menu-button__icon" aria-hidden="true">••</span>
                <span>کاربران و دسترسی‌ها</span>
                <i aria-hidden="true">‹</i>
              </button>
            </section>
          )}
          <section className="admin-menu-group" aria-label="نمایش و حساب">
            <span className="admin-menu-group__label">نمایش و حساب</span>
            <a className="admin-menu-button admin-menu-button--layout" href="/admin/layout">
              <span className="admin-menu-button__icon" aria-hidden="true">↕</span>
              <span>چیدمان کارت‌ها</span>
              <i aria-hidden="true">‹</i>
            </a>
            <a className="admin-menu-button admin-menu-button--view" href="/user" target="_blank" rel="noreferrer">
              <span className="admin-menu-button__icon" aria-hidden="true">◉</span>
              <span>مشاهده نسخه کاربر</span>
              <i aria-hidden="true">‹</i>
            </a>
          </section>
        </nav>
        <p className="admin-side-menu__hint">پس از ویرایش، دکمه «ذخیره تغییرات» را بزنید.</p>
      </aside>

      {accessPanelOpen && access.role === "super_admin" && (
        <AdminAccessPanel onClose={() => setAccessPanelOpen(false)} />
      )}

      <button
        type="button"
        className={`admin-save-fab${
          saveFeedback === "success"
            ? " is-success"
            : saveFeedback === "error"
              ? " is-error"
              : ""
        }`}
        onClick={saveAll}
        disabled={saving}
      >
        {saveFeedback === "success" && <span aria-hidden="true">✓</span>}
        {saveFeedback === "error" && <span aria-hidden="true">!</span>}
        {saving
          ? "در حال ذخیره..."
          : saveFeedback === "success"
            ? "ذخیره شد"
            : "ذخیره تغییرات"}
      </button>

      {saveFeedback !== "idle" && !saving && (
        <div
          className={`admin-save-toast ${
            saveFeedback === "success" ? "is-success" : "is-error"
          }`}
          role={saveFeedback === "success" ? "status" : "alert"}
        >
          <span aria-hidden="true">
            {saveFeedback === "success" ? "✓" : "!"}
          </span>
          {saveFeedback === "success"
            ? "عملیات با موفقیت انجام شد"
            : "ذخیره انجام نشد؛ دوباره تلاش کنید"}
        </div>
      )}

      {managerOpen && (
        <aside className="structure-manager" aria-label="مدیریت ساختار هندبوک">
          <header>
            <div>
              <span>مدیریت ساختار</span>
              <strong>افزودن، حذف و مخفی‌کردن</strong>
            </div>
            <button
              type="button"
              onClick={() => setManagerOpen(false)}
              aria-label="بستن مدیریت ساختار"
            >
              ×
            </button>
          </header>

          <section id="structure-people" style={{ display: can(access, "leadership", "canManageItems") || can(access, "personnel", "canManageItems") ? undefined : "none" }}>
            <h3>افراد</h3>
            <div className="structure-manager__fields">
              <select
                value={personForm.group}
                onChange={(event) =>
                  setPersonForm((previous) => ({
                    ...previous,
                    group: event.target.value as "leadership" | "personnel",
                  }))
                }
              >
                {can(access, "personnel", "canManageItems") && <option value="personnel">پرسنل</option>}
                {can(access, "leadership", "canManageItems") && <option value="leadership">هیئت‌مدیره</option>}
              </select>
              <input
                value={personForm.name}
                onChange={(event) =>
                  setPersonForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="نام و نام خانوادگی"
              />
              <input
                value={personForm.role}
                onChange={(event) =>
                  setPersonForm((previous) => ({
                    ...previous,
                    role: event.target.value,
                  }))
                }
                placeholder="سمت"
              />
              <textarea
                value={personForm.bio}
                onChange={(event) =>
                  setPersonForm((previous) => ({
                    ...previous,
                    bio: event.target.value,
                  }))
                }
                placeholder="معرفی کوتاه"
                rows={2}
              />
              <button type="button" onClick={addPerson}>
                افزودن فرد
              </button>
            </div>
            <div className="structure-manager__list">
              {defaultPeople
                .filter(
                  ([id]) => !customizations.structure.removedPeople.includes(id) &&
                    can(access, id.startsWith("leadership-") ? "leadership" : "personnel", "canManageItems"),
                )
                .map(([id, name, group]) => (
                  <div key={id}>
                    <span>
                      {name}
                      <small>{group}</small>
                    </span>
                    <button type="button" onClick={() => removePerson(id, false)}>
                      حذف
                    </button>
                  </div>
                ))}
              {customizations.structure.addedPeople.filter((person) => can(access, person.group, "canManageItems")).map((person) => (
                <div key={person.id}>
                  <span>
                    {person.name}
                    <small>
                      {person.group === "leadership" ? "هیئت‌مدیره" : "پرسنل"}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => removePerson(person.id, true)}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="structure-unit" style={{ display: can(access, "units", "canManageItems") ? undefined : "none" }}>
            <h3>واحدها</h3>
            <div className="structure-manager__fields">
              <input
                value={unitForm.title}
                onChange={(event) =>
                  setUnitForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="نام واحد"
              />
              <textarea
                value={unitForm.description}
                onChange={(event) =>
                  setUnitForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                placeholder="شرح مأموریت واحد"
                rows={2}
              />
              <button type="button" onClick={addUnit}>
                افزودن واحد
              </button>
            </div>
            <div className="structure-manager__list">
              {defaultUnits.map(([id, title]) => {
                if (customizations.structure.removedUnits.includes(id))
                  return null;
                return (
                  <div key={id}>
                    <span>{title}</span>
                    <button type="button" onClick={() => removeUnit(id, false)}>
                      حذف
                    </button>
                  </div>
                );
              })}
              {customizations.structure.addedUnits.map((unit) => (
                <div key={unit.id}>
                  <span>{unit.title}</span>
                  <button
                    type="button"
                    onClick={() => removeUnit(unit.id, true)}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="structure-policy" style={{ display: can(access, "policies", "canManageItems") ? undefined : "none" }}>
            <h3>قوانین</h3>
            <div className="structure-manager__fields">
              <input
                value={policyForm.title}
                onChange={(event) =>
                  setPolicyForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="عنوان قانون"
              />
              <input
                value={policyForm.summary}
                onChange={(event) =>
                  setPolicyForm((previous) => ({
                    ...previous,
                    summary: event.target.value,
                  }))
                }
                placeholder="خلاصه"
              />
              <textarea
                value={policyForm.body}
                onChange={(event) =>
                  setPolicyForm((previous) => ({
                    ...previous,
                    body: event.target.value,
                  }))
                }
                placeholder="متن قانون"
                rows={3}
              />
              <button type="button" onClick={addPolicy}>
                افزودن قانون
              </button>
            </div>
            <div className="structure-manager__list">
              {defaultPolicies.map((title, index) => {
                const id = `policy-${index}`;
                if (customizations.structure.removedPolicies.includes(id))
                  return null;
                return (
                  <div key={id}>
                    <span>{title}</span>
                    <button
                      type="button"
                      onClick={() => removePolicy(id, false)}
                    >
                      حذف
                    </button>
                  </div>
                );
              })}
              {customizations.structure.addedPolicies.map((policy) => (
                <div key={policy.id}>
                  <span>{policy.title}</span>
                  <button
                    type="button"
                    onClick={() => removePolicy(policy.id, true)}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="structure-section" style={{ display: access.role === "super_admin" || can(access, "custom_sections", "canManageItems") ? undefined : "none" }}>
            <h3>بخش‌ها</h3>
            {access.role === "super_admin" && <div className="structure-manager__switches">
              {managedSections.map(([id, title]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={
                      !customizations.structure.hiddenSections.includes(id)
                    }
                    onChange={() => toggleSection(id)}
                  />
                  {title}
                </label>
              ))}
            </div>}
            <div className="structure-manager__fields">
              <input
                value={sectionForm.title}
                onChange={(event) =>
                  setSectionForm((previous) => ({
                    ...previous,
                    title: event.target.value,
                  }))
                }
                placeholder="عنوان بخش جدید"
              />
              <textarea
                value={sectionForm.body}
                onChange={(event) =>
                  setSectionForm((previous) => ({
                    ...previous,
                    body: event.target.value,
                  }))
                }
                placeholder="محتوای بخش"
                rows={3}
              />
              <button type="button" onClick={addSection}>
                ایجاد بخش
              </button>
            </div>
            <div className="structure-manager__list">
              {customizations.structure.customSections.map((section) => (
                <div key={section.id}>
                  <span>
                    {section.title}
                    <small>{section.visible ? "نمایش داده می‌شود" : "مخفی"}</small>
                  </span>
                  <span>
                    <button
                      type="button"
                      onClick={() => toggleCustomSection(section.id)}
                    >
                      {section.visible ? "مخفی" : "نمایش"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomSection(section.id)}
                    >
                      حذف
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <footer>
            <button type="button" onClick={saveAll} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره همه تغییرات"}
            </button>
          </footer>
        </aside>
      )}

      {cropDraft && (
        <div className="image-cropper" role="dialog" aria-modal="true" aria-label="تنظیم برش تصویر">
          <div className="image-cropper__panel">
            <header>
              <div>
                <span>تنظیم تصویر</span>
                <strong>زاویه و تمرکز عکس را انتخاب کنید</strong>
                <small className="image-cropper__recommended-size">
                  اندازه مناسب این کادر: {cropDraft.recommendedWidth}×{cropDraft.recommendedHeight} پیکسل
                </small>
              </div>
              <button
                type="button"
                onClick={closeCropper}
                aria-label="بستن تنظیم تصویر"
                disabled={cropUploading}
              >
                ×
              </button>
            </header>

            <div
              className="image-cropper__preview"
              style={{
                aspectRatio: cropDraft.targetRatio,
                width: `min(600px, calc(100% - 38px), ${cropDraft.targetRatio * 52}svh)`,
              }}
              onPointerDown={startCropDrag}
              onPointerMove={moveCropDrag}
              onPointerUp={endCropDrag}
              onPointerCancel={endCropDrag}
            >
              <img
                src={cropDraft.previewUrl}
                alt="پیش‌نمایش برش تصویر"
                style={cropPreviewStyle(cropDraft)}
              />
              <span className="image-cropper__focus" aria-hidden="true" />
            </div>
            <p className="image-cropper__drag-hint">
              عکس را با ماوس یا انگشت بگیرید و بکشید تا نقطه مناسب داخل کادر قرار بگیرد.
            </p>
            <div
              className={`image-cropper__quality ${
                cropDraft.qualityOk ? "is-good" : "is-poor"
              }`}
              role={cropDraft.qualityOk ? "status" : "alert"}
            >
              <strong>
                {cropDraft.qualityOk ? "کیفیت مناسب" : "تصویر نامناسب"}
              </strong>
              <span>{cropDraft.qualityMessage}</span>
            </div>

            <div className="image-cropper__controls">
              <label>
                <span>جابه‌جایی افقی</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropDraft.x}
                  onChange={(event) =>
                    setCropDraft((current) =>
                      current ? { ...current, x: Number(event.target.value) } : current
                    )
                  }
                />
              </label>
              <label>
                <span>جابه‌جایی عمودی</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cropDraft.y}
                  onChange={(event) =>
                    setCropDraft((current) =>
                      current ? { ...current, y: Number(event.target.value) } : current
                    )
                  }
                />
              </label>
              <label>
                <span>بزرگ‌نمایی</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={cropDraft.zoom}
                  onChange={(event) =>
                    setCropDraft((current) =>
                      current ? { ...current, zoom: Number(event.target.value) } : current
                    )
                  }
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={closeCropper} disabled={cropUploading}>
                انصراف
              </button>
              <button
                type="button"
                className="image-cropper__apply"
                onClick={uploadCroppedImage}
                disabled={cropUploading || !cropDraft.qualityOk}
              >
                {cropUploading
                  ? "در حال بارگذاری..."
                  : cropDraft.qualityOk
                    ? "اعمال برش و بارگذاری"
                    : "ابتدا عکس مناسب انتخاب کنید"}
              </button>
            </footer>
          </div>
        </div>
      )}

      <input
        ref={fileInput}
        className="admin-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={uploadImage}
      />
    </div>
  );
}
