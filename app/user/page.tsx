"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultHandbookContent,
  type HandbookContent,
} from "../../lib/handbook";
import {
  emptyCustomizations,
  normalizeCustomizations,
  textFontStacks,
  type HandbookCustomizations,
} from "../../lib/customizations";
import { can, type CurrentAccess, type PermissionCapability, type SectionKey } from "../../lib/permissions";
import LogoutButton from "../components/LogoutButton";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  sectionKey: SectionKey;
  resourceKey: string | null;
  step: number;
  createdAt: string;
};

type ViewerAccess = {
  role: "user" | "section_manager" | "super_admin";
  assignedUnit: string | null;
  fullName?: string;
  title?: string;
};

const notificationSeenStorageKey = "bargheto-notifications-seen-at-v1";

const products = [
  {
    icon: "☀",
    title: "نیروگاه خورشیدی خانگی",
    description:
      "طراحی و اجرای سامانه خورشیدی متناسب با مصرف خانه برای تولید برق پاک و کاهش هزینه انرژی.",
  },
  {
    icon: "◌",
    title: "طرح تعویض موتور کولر",
    description:
      "جایگزینی موتورهای قدیمی با موتور کم‌مصرف برای کاهش مصرف برق و بهبود عملکرد کولر.",
  },
  {
    icon: "✓",
    title: "گواهی صرفه‌جویی",
    description:
      "تبدیل صرفه‌جویی تأییدشده انرژی به گواهی قابل‌ارائه و ایجاد ارزش اقتصادی از کاهش مصرف.",
  },
  {
    icon: "⚡",
    title: "تأمین برق صنعتگران",
    description:
      "تأمین پایدار و اقتصادی برق واحدهای صنعتی با قرارداد متناسب با الگوی مصرف و نیاز کسب‌وکار.",
  },
  {
    icon: "≈",
    title: "استخر خورشیدی",
    description:
      "راهکار خورشیدی برای تأمین انرژی تجهیزات استخر، کاهش هزینه بهره‌برداری و استفاده هوشمند از انرژی پاک.",
  },
];

const cultureValues = [
  ["احترام", "در گفتار، رفتار و تصمیم‌ها به حقوق و شخصیت یکدیگر احترام می‌گذاریم."],
  ["صداقت", "اطلاعات را شفاف منتقل می‌کنیم و مسئولیت نتیجه کار خود را می‌پذیریم."],
  ["اعتماد", "تعهدات را دقیق و به‌موقع انجام می‌دهیم تا اعتماد در تیم حفظ شود."],
  ["همکاری", "موفقیت برقتو نتیجه هماهنگی تیم‌ها و کمک متقابل اعضای سازمان است."],
];

const teams = [
  {
    id: "unit-finance-accounting",
    title: "مالی و حسابداری",
    description: "ثبت و کنترل جریان‌های مالی، حسابداری، بودجه و تسویه‌ها",
  },
  {
    id: "unit-sales",
    title: "فروش",
    description: "شناخت نیاز مشتری، ارائه پیشنهاد و پیشبرد فرایند فروش",
  },
  {
    id: "unit-marketing",
    title: "مارکتینگ",
    description: "توسعه برند، اجرای کمپین‌ها و ایجاد ارتباط مؤثر با بازار",
  },
  {
    id: "unit-support",
    title: "پشتیبانی",
    description: "پاسخ‌گویی، پیگیری درخواست‌ها و حفظ تجربه مناسب مشتری",
  },
  {
    id: "unit-product",
    title: "محصول",
    description: "تبدیل نیاز بازار و کاربران به راهکارها و محصولات قابل‌استفاده",
  },
  {
    id: "unit-development",
    title: "توسعه",
    description: "توسعه فنی سامانه‌ها، زیرساخت‌ها و راهکارهای دیجیتال برقتو",
  },
  {
    id: "unit-efficiency",
    title: "صرفه‌جویی",
    description: "طراحی و پیگیری طرح‌های بهینه‌سازی مصرف و گواهی صرفه‌جویی",
  },
  {
    id: "unit-services",
    title: "خدمات",
    description: "هماهنگی عملیات اجرایی و تحویل منظم خدمات به مشتریان",
  },
];

const leadership = [
  {
    name: "امید علوی",
    role: "مدیرعامل و هم‌بنیان‌گذار",
    bio: "راهبری مسیر رشد برقتو، توسعه کسب‌وکار و ایجاد راهکارهای شفاف و هوشمند در بازار انرژی.",
    position: "31% center",
  },
  {
    name: "ساسان سیفی",
    role: "عضو هیئت‌مدیره و هم‌بنیان‌گذار",
    bio: "همراه راهبردی برقتو در توسعه سازمان، ساخت فرهنگ حرفه‌ای و پیشبرد مأموریت‌های کلیدی شرکت.",
    position: "48% center",
  },
];

const personnel = [
  {
    id: "personnel-finance-accounting",
    name: "همکار واحد مالی و حسابداری",
    role: "کارشناس مالی و حسابداری",
    bio: "ثبت و کنترل جریان‌های مالی، حسابداری، بودجه‌بندی، گزارش‌گیری و پیگیری تسویه‌های شرکت.",
    image: "/unit-finance-accounting.webp",
    position: "center",
  },
  {
    id: "personnel-sales",
    name: "همکار واحد فروش",
    role: "کارشناس فروش",
    bio: "شناخت نیاز مشتری، طراحی پیشنهاد مناسب و همراهی تا نهایی‌شدن فرایند تأمین برق.",
    image: "/unit-sales.webp",
    position: "center",
  },
  {
    id: "personnel-marketing",
    name: "همکار واحد مارکتینگ",
    role: "کارشناس مارکتینگ",
    bio: "برنامه‌ریزی کمپین‌ها، توسعه برند و ایجاد ارتباط روشن و مؤثر میان خدمات برقتو و بازار.",
    image: "/unit-marketing.webp",
    position: "center",
  },
  {
    id: "personnel-support",
    name: "همکار واحد پشتیبانی",
    role: "کارشناس پشتیبانی",
    bio: "پاسخ‌گویی به مشتریان، پیگیری درخواست‌ها و حفظ تجربه‌ای منظم، سریع و قابل‌اعتماد.",
    image: "/unit-support.webp",
    position: "center",
  },
  {
    id: "personnel-product",
    name: "همکار واحد محصول",
    role: "کارشناس محصول",
    bio: "شناخت مسئله کاربران، طراحی تجربه و تبدیل نیازهای بازار به راهکارهای قابل‌استفاده.",
    image: "/unit-product.webp",
    position: "center",
  },
  {
    id: "personnel-development",
    name: "همکار واحد توسعه",
    role: "کارشناس توسعه",
    bio: "توسعه فنی سامانه‌ها، زیرساخت‌ها و قابلیت‌های دیجیتال موردنیاز محصولات برقتو.",
    image: "/unit-development.webp",
    position: "center",
  },
  {
    id: "personnel-efficiency",
    name: "همکار واحد صرفه‌جویی",
    role: "کارشناس صرفه‌جویی انرژی",
    bio: "طراحی و پیگیری طرح‌های بهینه‌سازی مصرف، اندازه‌گیری نتایج و گواهی صرفه‌جویی انرژی.",
    image: "/unit-efficiency.webp",
    position: "center",
  },
  {
    id: "personnel-services",
    name: "همکار واحد خدمات",
    role: "کارشناس خدمات",
    bio: "هماهنگی عملیات اجرایی، پیگیری تحویل و اطمینان از ارائه منظم خدمات به مشتریان.",
    image: "/unit-services.webp",
    position: "center",
  },
];

const policyGroups = [
  {
    icon: "◷",
    title: "ساعت کاری و مرخصی",
    summary: "زمان حضور، استراحت و هماهنگی مرخصی",
    items: [
      "هفته کاری از شنبه تا چهارشنبه و ساعت حضور ۸:۳۰ تا ۱۷:۳۰ است؛ پنجشنبه تعطیل در نظر گرفته شده است.",
      "زمان صبحانه ۸:۰۰ تا ۸:۳۰ و زمان ناهار ۱۲:۳۰ تا ۱۳:۳۰ است.",
      "مرخصی باید با اطلاع قبلی، هماهنگی با سرپرست یا مدیر بخش و به‌صورت رسمی ثبت شود.",
      "مرخصی بیماری، زایمان و موارد اضطراری نیازمند ارائه مستندات و تأیید مسئول مربوطه است.",
    ],
  },
  {
    icon: "✓",
    title: "حقوق، بیمه و مزایا",
    summary: "تعهدات مالی و مزایای همکاری",
    items: [
      "حقوق در پایان هر ماه به حساب اعلام‌شده در قرارداد استخدامی واریز می‌شود.",
      "همکاران تحت پوشش بیمه پایه و تکمیلی قرار می‌گیرند و حق بیمه براساس حقوق کامل محاسبه می‌شود.",
      "مزایایی مانند پاداش و موارد مشابه، متناسب با عملکرد و سیاست‌های شرکت تخصیص می‌یابد.",
      "برای تکمیل استخدام، ضمانت مطابق مفاد قرارداد و با هدف نگهداری صحیح از اموال شرکت دریافت می‌شود.",
    ],
  },
  {
    icon: "◎",
    title: "رفتار حرفه‌ای",
    summary: "احترام، تمرکز و انضباط کاری",
    items: [
      "گفت‌وگوها باید محترمانه، حرفه‌ای و متمرکز بر اهداف شرکت باشند؛ غیبت، بدگویی و گفت‌وگوی مخرب پذیرفته نیست.",
      "وظایف باید دقیق، کامل و در زمان تعیین‌شده انجام شوند و واگذاری کار یا خروج از محل بدون هماهنگی مجاز نیست.",
      "تلفن همراه در حالت بی‌صدا باشد و تماس‌های طولانی یا پرصدای شخصی در فضای عمومی انجام نشود.",
      "استعمال دخانیات در فضاهای مشترک ساختمان و ایجاد بو یا مزاحمت در محیط کار ممنوع است.",
    ],
  },
  {
    icon: "⌁",
    title: "امنیت و محرمانگی",
    summary: "حفاظت از اطلاعات مشتریان و شرکت",
    items: [
      "اطلاعات مشتریان، اسناد، فایل‌ها، ایمیل‌ها و داده‌های شرکت باید محرمانه و دور از دسترس افراد غیرمجاز نگهداری شوند.",
      "رمز عبور قوی انتخاب کنید، به‌روزرسانی‌های امنیتی را به‌موقع انجام دهید و فقط نرم‌افزارهای تأییدشده را نصب کنید.",
      "داده‌های سازمانی باید در فضای ابری تعیین‌شده شرکت ذخیره و از همان مسیر بازیابی شوند.",
      "نامه‌های ورودی و خروجی از مسیر مسئول دفتر ثبت می‌شوند و مفاد توافق‌نامه محرمانگی برای همه لازم‌الاجراست.",
    ],
  },
  {
    icon: "↔",
    title: "ارتباطات داخلی",
    summary: "کانال رسمی، جلسه مؤثر و بازخورد",
    items: [
      "برای هماهنگی کاری از ایمیل سازمانی و سامانه‌های رسمی مورد تأیید شرکت استفاده کنید.",
      "جلسات باید هدف، دستور کار و زمان مشخص داشته باشند و تصمیم‌ها در صورت‌جلسه ثبت شوند.",
      "پیشنهادها و مشکلات را مستقیم، محترمانه و از طریق مدیر مربوطه یا منابع انسانی مطرح کنید.",
      "اختلاف نظر باید با رویکرد مثبت و حرفه‌ای حل شود و حریم خصوصی همکاران حفظ شود.",
    ],
  },
  {
    icon: "+",
    title: "بهداشت و ایمنی",
    summary: "محیط سالم و آمادگی در شرایط اضطراری",
    items: [
      "بهداشت فردی، پوشش تمیز و متناسب با محیط حرفه‌ای و نظافت فضای مشترک رعایت شود.",
      "در صورت بیماری یا علائم جدی، برای حفظ سلامت دیگران در محل کار حاضر نشوید و موضوع را هماهنگ کنید.",
      "در کارهای فنی از تجهیزات ایمنی مناسب استفاده کنید و خرابی ابزارها را سریع گزارش دهید.",
      "در بحران‌هایی مانند آتش‌سوزی یا زلزله، آرامش خود را حفظ و طبق مسیرها و دستورالعمل‌های اضطراری عمل کنید.",
    ],
  },
  {
    icon: "⇄",
    title: "تحویل اطلاعات و تجهیزات",
    summary: "شروع و پایان مسئولانه همکاری",
    items: [
      "در شروع همکاری، اطلاعات و تجهیزات موردنیاز را از مسئول قبلی یا منابع انسانی دریافت کنید.",
      "در پایان همکاری، تمام اطلاعات، مسئولیت‌ها و تجهیزات باید به جانشین و مسئول دفتر تحویل شود.",
      "تسویه‌حساب نهایی پس از تحویل کامل موارد و تأیید مسئول مربوطه انجام می‌شود.",
    ],
  },
  {
    icon: "♻",
    title: "منابع، اموال و یادگیری",
    summary: "استفاده مسئولانه و بهبود مستمر",
    items: [
      "امکانات شرکت فقط برای اهداف کاری استفاده شوند و انجام امور شخصی در ساعات کاری به حداقل برسد.",
      "برای تجهیزات مشترک نوبت را رعایت کنید، پس از استفاده محیط را مرتب تحویل دهید و خرابی را گزارش کنید.",
      "در مصرف کاغذ، آب، برق و انرژی صرفه‌جویی و مواد قابل بازیافت را تفکیک کنید.",
      "این دفترچه به‌صورت دوره‌ای توسط مدیریت و منابع انسانی بازنگری و متناسب با نیازهای جدید به‌روزرسانی می‌شود.",
    ],
  },
];

type UserPageProps = {
  adminMode?: boolean;
  access?: CurrentAccess;
  customizations?: HandbookCustomizations;
  onAdminAdd?: (
    target: "leadership" | "personnel" | "unit" | "policy" | "section",
  ) => void;
};

export default function UserPage({
  adminMode = false,
  access,
  customizations: controlledCustomizations,
  onAdminAdd,
}: UserPageProps = {}) {
  const [content, setContent] = useState<HandbookContent>(
    defaultHandbookContent,
  );
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [savedCustomizations, setSavedCustomizations] =
    useState<HandbookCustomizations>(emptyCustomizations);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [viewerAccess, setViewerAccess] = useState<ViewerAccess | null>(null);
  const customizations = controlledCustomizations ?? savedCustomizations;
  const managerView = !adminMode && viewerAccess?.role === "section_manager";
  const assignedUnit = managerView ? viewerAccess.assignedUnit : null;

  const stepTitles = [
    "معرفی برقتو",
    "هیئت‌مدیره",
    "پرسنل",
    "فرهنگ و قوانین",
  ];
  const progress = Math.round(((activeStep + 1) / stepTitles.length) * 100);
  const structure = customizations.structure;
  const visibleLeadership = leadership
    .map((person, index) => ({ ...person, id: `leadership-${index}` }))
    .filter((person) => !structure.removedPeople.includes(person.id))
    .concat(
      structure.addedPeople
        .filter((person) => person.group === "leadership")
        .map((person) => ({ ...person, position: "center" })),
    );
  const visiblePersonnel = personnel
    .filter((person) => !structure.removedPeople.includes(person.id))
    .concat(
      structure.addedPeople
        .filter((person) => person.group === "personnel")
        .map((person) => ({
          ...person,
          image: "/team-energy.png",
          position: "center",
        })),
    );
  const visibleUnits = teams
    .filter((unit) => !structure.removedUnits.includes(unit.id))
    .concat(structure.addedUnits);
  const visiblePolicies = policyGroups
    .map((policy, index) => ({ ...policy, id: `policy-${index}` }))
    .filter((policy) => !structure.removedPolicies.includes(policy.id))
    .concat(
      structure.addedPolicies.map((policy) => ({
        ...policy,
        icon: "+",
        items: [policy.body],
      })),
    );
  const sectionVisible = (id: string) =>
    !structure.hiddenSections.includes(id);
  const allowed = (
    section: SectionKey,
    capability: PermissionCapability,
    resourceKey = "*",
  ) => Boolean(adminMode && access && can(access, section, capability, resourceKey));

  useEffect(() => {
    if (adminMode) return;
    const unitViewRequested = new URLSearchParams(window.location.search).get("view") === "units";
    fetch("/api/access")
      .then((response) => response.json())
      .then((data: ViewerAccess) => {
        setViewerAccess(data);
        if (data.role === "section_manager" || unitViewRequested) setActiveStep(2);
      })
      .catch(() => {
        setViewerAccess(unitViewRequested ? { role: "section_manager", assignedUnit: null } : { role: "user", assignedUnit: null });
        if (unitViewRequested) setActiveStep(2);
      });
  }, [adminMode]);

  useEffect(() => {
    fetch("/api/content")
      .then((response) => response.json())
      .then((data) => {
        if (data.content) setContent(data.content);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (controlledCustomizations) return;
    fetch("/api/customizations")
      .then((response) => response.json())
      .then((data) =>
        setSavedCustomizations(normalizeCustomizations(data.customizations)),
      )
      .catch(() => undefined);
  }, [controlledCustomizations]);

  useEffect(() => {
    const loadNotifications = () => {
      fetch("/api/notifications")
        .then((response) => response.json())
        .then((data) => {
          const items = Array.isArray(data.notifications)
            ? (data.notifications as NotificationItem[])
            : [];
          setNotifications(items);
          const latest = items[0]?.createdAt;
          const seenAt = window.localStorage.getItem(notificationSeenStorageKey);
          setHasUnreadNotifications(Boolean(latest && (!seenAt || latest > seenAt)));
        })
        .catch(() => undefined);
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadNotifications();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".learner");
    if (!root) return;
    const stage = root.querySelector<HTMLElement>(".onboarding-stage");
    if (!stage) return;

    const legacyTextSelector =
      "h1,h2,h3,p,blockquote,li,small,.section-kicker,.person-card__summary strong,.person-card__summary span";
    const textSelector =
      "h1,h2,h3,p,blockquote,li,small,strong,span";
    const legacyTextNodes = Array.from(
      stage.querySelectorAll<HTMLElement>(legacyTextSelector),
    ).filter((node) => !node.querySelector(legacyTextSelector));
    const textNodes = Array.from(stage.querySelectorAll<HTMLElement>(textSelector))
      .filter((node) => !node.querySelector(textSelector));

    function stableTextKey(node: HTMLElement) {
      const section = node.closest<HTMLElement>("[data-permission-section]")?.dataset.permissionSection;
      const resource = node.closest<HTMLElement>("[data-permission-resource]")?.dataset.permissionResource;
      const scope = section
        ? `section-${section}-${resource ? `resource-${resource}-` : ""}`
        : "";
      const entity = node.closest<HTMLElement>("[data-content-id]");
      if (entity?.dataset.contentId) {
        const entityParts: string[] = [];
        let entityCurrent: HTMLElement | null = node;
        while (entityCurrent && entityCurrent !== entity) {
          const entityParent: HTMLElement | null = entityCurrent.parentElement;
          if (!entityParent) break;
          const sameTag = Array.from(entityParent.children).filter(
            (child) => child.tagName === entityCurrent!.tagName,
          );
          entityParts.unshift(
            `${entityCurrent.tagName.toLowerCase()}-${sameTag.indexOf(entityCurrent)}`,
          );
          entityCurrent = entityParent;
        }
        return `${scope}entity-${entity.dataset.contentId}-${entityParts.join(".")}`;
      }
      const parts: string[] = [];
      let current: HTMLElement | null = node;
      while (current && current !== stage) {
        const parent: HTMLElement | null = current.parentElement;
        if (!parent) break;
        const sameTag = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName,
        );
        parts.unshift(
          `${current.tagName.toLowerCase()}-${sameTag.indexOf(current)}`,
        );
        current = parent;
      }
      return `${scope}step-${activeStep}-${parts.join(".")}`;
    }

    textNodes.forEach((node) => {
      const key = stableTextKey(node);
      const previousScopedKey = key.replace(
        /^section-([a-z_]+)-resource-[a-z0-9-]+-/,
        "section-$1-",
      );
      const unscopedKey = previousScopedKey.replace(/^section-[a-z_]+-/, "");
      const entityId =
        node.closest<HTMLElement>("[data-content-id]")?.dataset.contentId;
      const legacyIndex = legacyTextNodes.indexOf(node);
      const legacyKey =
        legacyIndex >= 0 ? `step-${activeStep}-text-${legacyIndex}` : undefined;
      node.dataset.editText = key;
      const savedText =
        customizations.texts[key] ?? customizations.texts[previousScopedKey] ??
        customizations.texts[unscopedKey] ??
        ((!entityId || entityId.startsWith("leadership-")) && legacyKey
          ? customizations.texts[legacyKey]
          : undefined);
      if (savedText !== undefined) {
        node.innerText = savedText;
      }
      const savedStyle =
        customizations.textStyles[key] ?? customizations.textStyles[previousScopedKey] ??
        customizations.textStyles[unscopedKey] ??
        ((!entityId || entityId.startsWith("leadership-")) && legacyKey
          ? customizations.textStyles[legacyKey]
          : undefined);
      node.style.fontFamily = savedStyle ? textFontStacks[savedStyle.font] : "";
      node.style.fontSize = savedStyle ? `${savedStyle.fontSize}px` : "";
      node.style.color = savedStyle?.color ?? "";
    });

    const imageSelector = "img,.person-card__photo";
    const legacyImages = Array.from(
      stage.querySelectorAll<HTMLElement>(imageSelector),
    );
    const images = Array.from(root.querySelectorAll<HTMLElement>(imageSelector));

    function positionalImageKey(node: HTMLElement) {
      const imageRoot = stage.contains(node) ? stage : root;
      const parts: string[] = [];
      let current: HTMLElement | null = node;
      while (current && current !== imageRoot) {
        const parent: HTMLElement | null = current.parentElement;
        if (!parent) break;
        const sameTag = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName,
        );
        parts.unshift(
          `${current.tagName.toLowerCase()}-${sameTag.indexOf(current)}`,
        );
        current = parent;
      }
      const scope = stage.contains(node) ? `step-${activeStep}` : "global";
      return `${scope}-image-${parts.join(".")}`;
    }

    function stableImageKey(node: HTMLElement) {
      const entity = node.closest<HTMLElement>("[data-content-id]");
      const section = node.closest<HTMLElement>("[data-permission-section]")?.dataset.permissionSection;
      const resource = node.closest<HTMLElement>("[data-permission-resource]")?.dataset.permissionResource;
      const raw = entity?.dataset.contentId
        ? `entity-${entity.dataset.contentId}-image`
        : positionalImageKey(node);
      return `${section ? `section-${section}-${resource ? `resource-${resource}-` : ""}` : ""}${raw}`;
    }

    images.forEach((node) => {
      const key = stableImageKey(node);
      const previousScopedKey = key.replace(
        /^section-([a-z_]+)-resource-[a-z0-9-]+-/,
        "section-$1-",
      );
      const unscopedKey = previousScopedKey.replace(/^section-[a-z_]+-/, "");
      const previousStableKey = positionalImageKey(node);
      const entityId =
        node.closest<HTMLElement>("[data-content-id]")?.dataset.contentId;
      const legacyIndex = legacyImages.indexOf(node);
      const legacyKey =
        legacyIndex >= 0 ? `step-${activeStep}-image-${legacyIndex}` : undefined;
      node.dataset.editImage = key;
      const url =
        customizations.images[key] ?? customizations.images[previousScopedKey] ??
        customizations.images[unscopedKey] ??
        (!entityId || entityId.startsWith("leadership-")
          ? customizations.images[previousStableKey]
          : undefined) ??
        ((!entityId || entityId.startsWith("leadership-")) && legacyKey
          ? customizations.images[legacyKey]
          : undefined);
      if (!url) return;
      const deleted = url === "__deleted__";
      node.classList.toggle("is-image-deleted", deleted);
      node.dataset.imageDeleted = deleted ? "true" : "false";
      if (node instanceof HTMLImageElement) {
        node.src = deleted
          ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'/%3E"
          : url;
      } else {
        node.style.backgroundImage = deleted ? "none" : `url("${url}")`;
      }
    });

    const groups = Array.from(
      stage.querySelectorAll<HTMLElement>(
        ".people-grid,.team-grid,.value-grid,.policy-list,.product-showcase__grid",
      ),
    );
    groups.forEach((group, groupIndex) => {
      const section = group.closest<HTMLElement>("[data-permission-section]")?.dataset.permissionSection;
      const legacyGroupKey = `${section ? `section-${section}-` : ""}step-${activeStep}-group-${groupIndex}`;
      const groupKey = group.dataset.layoutGroup ?? legacyGroupKey;
      group.dataset.sortGroup = groupKey;
      Array.from(group.children).forEach((child, itemIndex) => {
        const item = child as HTMLElement;
        item.dataset.sortKey =
          item.dataset.contentId ?? `${groupKey}-item-${itemIndex}`;
        item.dataset.layoutItem = item.dataset.sortKey;
        if (section && (["company", "products", "leadership", "personnel", "units", "values", "policies", "custom_sections"] as string[]).includes(section)) {
          item.classList.remove("layout-card--small", "layout-card--medium", "layout-card--large");
          item.classList.add("layout-card");
        }
      });
      const order = customizations.orders[groupKey] ?? customizations.orders[legacyGroupKey] ?? customizations.orders[legacyGroupKey.replace(/^section-[a-z_]+-/, "")];
      order?.forEach((itemKey) => {
        const item = Array.from(group.children).find(
          (child) => (child as HTMLElement).dataset.sortKey === itemKey,
        );
        if (item) group.appendChild(item);
      });
      Array.from(group.children).forEach((child, itemIndex) => {
        child.querySelectorAll<HTMLElement>("[data-layout-sequence]").forEach((sequence) => {
          sequence.innerText = (itemIndex + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
        });
      });
    });
  }, [activeStep, customizations]);

  function goToStep(step: number) {
    setActiveStep(Math.max(0, Math.min(step, stepTitles.length - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleNotifications() {
    setNotificationsOpen((open) => {
      const next = !open;
      if (next && notifications[0]?.createdAt) {
        window.localStorage.setItem(
          notificationSeenStorageKey,
          notifications[0].createdAt,
        );
        setHasUnreadNotifications(false);
      }
      return next;
    });
  }

  function openNotification(item: NotificationItem) {
    goToStep(item.step);
    setNotificationsOpen(false);
    window.setTimeout(() => {
      const selector = item.resourceKey
        ? `[data-permission-resource="${item.resourceKey}"]`
        : `[data-permission-section="${item.sectionKey}"]`;
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("notification-focus");
      window.setTimeout(() => target.classList.remove("notification-focus"), 2400);
    }, 180);
  }

  return (
    <main
      className={`learner${adminMode ? " learner--admin" : ""}`}
      dir="rtl"
    >
      {!adminMode && <LogoutButton />}
      <header className="learner__header">
        <Link href="/" className="portal__brand">
          <img src="/bargheto-logo.png" alt="برقتو" />
        </Link>
        <div className="learner__header-tools">
          {!adminMode && (
            <Link href="/login" className="learner__management-login">
              ورود مدیریت
            </Link>
          )}
          <div className="learner-notifications">
            <button
              type="button"
              className={`learner-notifications__bell${hasUnreadNotifications ? " has-unread" : ""}`}
              onClick={toggleNotifications}
              aria-label={hasUnreadNotifications ? "اعلان جدید دارید" : "اعلان‌ها"}
              aria-expanded={notificationsOpen}
            >
              <span aria-hidden="true">🔔</span>
              {hasUnreadNotifications && <i />}
            </button>
            {notificationsOpen && (
              <div className="learner-notifications__panel" role="dialog" aria-label="تغییرات جدید هندبوک">
                <div className="learner-notifications__heading">
                  <strong>تغییرات جدید</strong>
                  <span>{notifications.length ? `${notifications.length} اعلان اخیر` : "بدون اعلان"}</span>
                </div>
                <div className="learner-notifications__list">
                  {notifications.map((item) => (
                    <button type="button" onClick={() => openNotification(item)} key={item.id}>
                      <span>{item.title}</span>
                      <small>{item.message}</small>
                      <time>{new Date(item.createdAt).toLocaleDateString("fa-IR")}</time>
                    </button>
                  ))}
                  {!notifications.length && <p>هنوز تغییری برای نمایش ثبت نشده است.</p>}
                </div>
              </div>
            )}
          </div>
          <div className="learner__progress">
            <div>
              <span>پیشرفت مسیر شما</span>
              <strong>{progress}٪</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      <nav className="onboarding-steps" aria-label="مراحل آشنایی">
        {stepTitles.map((title, index) => (
          <button
            type="button"
            className={index === activeStep ? "is-active" : ""}
            aria-current={index === activeStep ? "step" : undefined}
            onClick={() => goToStep(index)}
            key={title}
          >
            <span className="onboarding-steps__number">{index + 1}</span>
            <span
              className="onboarding-steps__title"
              data-edit-text={`nav-step-${index}`}
            >
              {customizations.texts[`nav-step-${index}`] ?? title}
            </span>
          </button>
        ))}
      </nav>

      {activeStep === 0 && (
        <div className="onboarding-stage">
          <section className="learner-hero" data-permission-section="company">
            <div className="learner-hero__copy">
              <span className="section-kicker">مرحله اول · معرفی برقتو</span>
              <h1>{content.welcomeTitle}</h1>
              <p>{content.aboutBody}</p>
            </div>
            <div className="learner-hero__visual">
              <img
                className="learner-hero__image"
                src="/team-energy.png"
                alt="تیم برقتو در حال همکاری برای مدیریت هوشمند انرژی"
              />
              {allowed("company", "canEditImage") && (
                <button
                  type="button"
                  className="hero-image-upload-trigger"
                  data-image-trigger
                >
                  <span aria-hidden="true">＋</span>
                  <span>بارگذاری یا تغییر تصویر هیرو</span>
                  <small className="image-upload-spec">پیشنهادی: ۱۲۰۰×۸۰۰ پیکسل · افقی</small>
                </button>
              )}
            </div>
            {sectionVisible("products") && (
            <section className="product-showcase product-showcase--hero" data-permission-section="products">
              <div className="product-showcase__heading">
                <div>
                  <span className="section-kicker">محصولات برقتو</span>
                  <h2>راهکارهای ما برای انرژی هوشمند</h2>
                </div>
                <p>روی هر محصول بروید تا بیشتر بدانید.</p>
              </div>
              <div className="product-showcase__grid" data-layout-group="section-products-layout-products">
                {products.map((product, index) => (
                  <article
                    className="product-card"
                    data-content-id={`product-${index}`}
                    key={product.title}
                    tabIndex={0}
                  >
                    {allowed("products", "canEditText") && (
                      <div className="product-card__admin-actions">
                        <button
                          type="button"
                          className="admin-preview-card-button"
                          data-card-preview-trigger
                          aria-label={`نمایش و ویرایش توضیح ${product.title}`}
                        >
                          ویرایش پیش‌نمایش
                        </button>
                      </div>
                    )}
                    <div className="product-card__top">
                      <div className="product-card__icon" aria-hidden="true">
                        {product.icon}
                      </div>
                      <span data-layout-sequence>۰{index + 1}</span>
                    </div>
                    <div className="product-card__copy">
                      <h3>{product.title}</h3>
                      <p>{product.description}</p>
                    </div>
                    <span className="product-card__hint">مشاهده توضیحات</span>
                  </article>
                ))}
              </div>
            </section>
            )}
          </section>

          {sectionVisible("company") && (
          <section className="company-intro" data-permission-section="company">
            <div className="company-intro__visual" aria-hidden="true">
              <img src="/company-intro.jpg" alt="" />
            </div>
            <div>
              <span className="section-kicker">
                {loading ? "در حال دریافت محتوا" : "معارفه برقتو"}
              </span>
              <h2>نخستین پلتفرم خدمات خرده‌فروشی برق</h2>
              <p>
                شرکت چرخه سبز انرژی پاک با نام تجاری برقتو از تابستان ۱۴۰۲ با
                هدف ساده‌سازی تأمین برق و مدیریت هوشمند انرژی فعالیت می‌کند.
              </p>
              <ul>
                <li>تأمین برق پایدار و اقتصادی</li>
                <li>قراردادهای متناسب با نیاز مشتری</li>
                <li>راهکارهای صرفه‌جویی و انرژی تجدیدپذیر</li>
              </ul>
            </div>
          </section>
          )}

          {structure.customSections
            .filter((section) => section.visible)
            .map((section) => (
              <section
                className="custom-handbook-section"
                data-content-id={section.id}
                data-permission-section="custom_sections"
                key={section.id}
              >
                <span className="section-kicker">بخش اختصاصی</span>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
        </div>
      )}

      {activeStep === 1 && (
        <div className="onboarding-stage">
          <section className="people-section" data-permission-section="leadership">
            <div className="people-section__heading">
              <div>
                <span className="section-kicker">مرحله دوم</span>
                <h2>معرفی هیئت‌مدیره</h2>
                <p>با راهبران و بنیان‌گذاران برقتو آشنا شوید.</p>
              </div>
              <div className="people-section__admin-actions">
                <span>عکس‌های موقت؛ قابل جایگزینی</span>
                {allowed("leadership", "canManageItems") && onAdminAdd && (
                  <button
                    type="button"
                    className="admin-inline-add"
                    onClick={() => onAdminAdd("leadership")}
                  >
                    <span aria-hidden="true">＋</span>
                    افزودن عضو هیئت‌مدیره
                  </button>
                )}
              </div>
            </div>
            <div className="people-grid people-grid--leadership" data-layout-group="section-leadership-layout-people">
              {visibleLeadership.map((person) => (
                <article
                  className="person-card"
                  data-content-id={person.id}
                  key={person.id}
                  tabIndex={0}
                >
                  <div
                    className="person-card__photo"
                    style={{ backgroundPosition: person.position }}
                  />
                  {(allowed("leadership", "canEditImage") || allowed("leadership", "canEditText")) && (
                    <div className="person-card__admin-actions">
                      {allowed("leadership", "canEditImage") && <button
                        type="button"
                        className="admin-image-card-button"
                        data-image-trigger
                        aria-label={`تغییر عکس ${person.name}`}
                      >
                        <span>تغییر عکس</span>
                        <small className="image-upload-spec">۸۰۰×۱۰۰۰ · عمودی</small>
                      </button>}
                      {allowed("leadership", "canEditText") && <button
                        type="button"
                        className="admin-preview-card-button"
                        data-card-preview-trigger
                        aria-label={`نمایش و ویرایش معرفی ${person.name}`}
                      >
                        ویرایش معرفی
                      </button>}
                    </div>
                  )}
                  <div className="person-card__summary">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </div>
                  <div className="person-card__bio">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                    <p>{person.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {sectionVisible("founders") && (
          <section className="founders-note" data-permission-section="leadership">
            <div className="founders-note__mark">“</div>
            <div>
              <span className="section-kicker">پیام بنیان‌گذاران</span>
              <blockquote>
                این دفترچه راهنمای ساختن محیطی حرفه‌ای، منظم، شاداب و کارآمد
                است؛ محیطی که رشد همکاران و جایگاه برقتو را هم‌زمان دنبال
                می‌کند.
              </blockquote>
              <p>امید علوی و ساسان سیفی</p>
            </div>
          </section>
          )}
        </div>
      )}

      {activeStep === 2 && (
        <div className="onboarding-stage">
          <section className="people-section" data-permission-section="personnel">
            <div className="people-section__heading">
              <div>
                <span className="section-kicker">مرحله سوم</span>
                <h2>معرفی پرسنل و واحدها</h2>
                <p>
                  نشانگر را روی هر تصویر ببرید؛ در موبایل برای مشاهده معرفی،
                  کارت را لمس کنید.
                </p>
              </div>
              <div className="people-section__admin-actions">
                <span>اطلاعات موقت؛ قابل تکمیل</span>
                {allowed("personnel", "canManageItems") && onAdminAdd && (
                  <button
                    type="button"
                    className="admin-inline-add"
                    onClick={() => onAdminAdd("personnel")}
                  >
                    <span aria-hidden="true">＋</span>
                    افزودن پرسنل
                  </button>
                )}
              </div>
            </div>
            <div className="people-grid" data-layout-group="section-personnel-layout-people">
              {visiblePersonnel.map((person) => {
                const candidateUnitId = person.id.replace(/^personnel-/, "unit-");
                const linkedUnitId = teams.some((unit) => unit.id === candidateUnitId)
                  ? candidateUnitId
                  : null;
                const canOpenPersonUnit = Boolean(
                  linkedUnitId && (!managerView || assignedUnit === linkedUnitId),
                );
                const managerCardClass = managerView && linkedUnitId
                  ? assignedUnit === linkedUnitId
                    ? " is-assigned-unit"
                    : " is-unit-locked"
                  : "";
                return (
                <article
                  className={`person-card${managerCardClass}`}
                  data-content-id={person.id}
                  key={person.id}
                  tabIndex={adminMode ? 0 : canOpenPersonUnit ? -1 : undefined}
                >
                  <div
                    className="person-card__photo"
                    style={{
                      backgroundImage: `url("${person.image}")`,
                      backgroundPosition: person.position,
                      backgroundSize: "cover",
                    }}
                  />
                  {!adminMode && canOpenPersonUnit && linkedUnitId && (
                    <Link
                      className="person-card__unit-link"
                      href={`/units/${linkedUnitId}`}
                      aria-label={`ورود به ${person.name}`}
                    >
                      <span className="sr-only">ورود به صفحه {person.name}</span>
                    </Link>
                  )}
                  {!adminMode && managerView && linkedUnitId && assignedUnit === linkedUnitId && (
                    <span className="person-card__access-badge">واحد شما</span>
                  )}
                  {!adminMode && managerView && linkedUnitId && assignedUnit !== linkedUnitId && (
                    <span className="person-card__access-badge person-card__access-badge--locked">قفل</span>
                  )}
                  {(allowed("personnel", "canEditImage") || allowed("personnel", "canEditText")) && (
                    <div className="person-card__admin-actions">
                      {allowed("personnel", "canEditImage") && <button
                        type="button"
                        className="admin-image-card-button"
                        data-image-trigger
                        aria-label={`تغییر عکس ${person.name}`}
                      >
                        <span>تغییر عکس</span>
                        <small className="image-upload-spec">۸۰۰×۱۰۰۰ · عمودی</small>
                      </button>}
                      {allowed("personnel", "canEditText") && <button
                        type="button"
                        className="admin-preview-card-button"
                        data-card-preview-trigger
                        aria-label={`نمایش و ویرایش معرفی ${person.name}`}
                      >
                        ویرایش معرفی
                      </button>}
                    </div>
                  )}
                  <div className="person-card__summary">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </div>
                  <div className="person-card__bio">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                    <p>{person.bio}</p>
                  </div>
                </article>
                );
              })}
            </div>
          </section>

          {sectionVisible("units") && (
          <section className="content-section" data-permission-section="units">
            <div className="content-section__index">۰۳</div>
            <div>
              <span className="section-kicker">ساختار همکاری</span>
              <h2>تیم‌هایی که برقتو را می‌سازند</h2>
              <p>
                هر تیم مأموریت تخصصی خود را دارد، اما نتیجه نهایی از هماهنگی
                میان همه واحدها ساخته می‌شود.
              </p>
              {allowed("units", "canManageItems") && onAdminAdd && (
                <button
                  type="button"
                  className="admin-inline-add"
                  onClick={() => onAdminAdd("unit")}
                >
                  <span aria-hidden="true">＋</span>
                  افزودن واحد
                </button>
              )}
              <div className="team-grid" data-layout-group="section-units-layout-units">
                {visibleUnits.map((unit, index) => {
                  const canOpenUnit = adminMode
                    ? allowed("units", "canEditText", unit.id) || allowed("units", "canEditImage", unit.id)
                    : !managerView || assignedUnit === unit.id;
                  const managerCardClass = managerView
                    ? assignedUnit === unit.id
                      ? " is-assigned-unit"
                      : " is-locked-unit"
                    : "";
                  return (
                    <article
                      className={managerCardClass.trim() || undefined}
                      data-content-id={unit.id}
                      data-permission-resource={unit.id}
                      key={unit.id}
                    >
                      <span data-layout-sequence>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{unit.title}</h3>
                        <p>{unit.description}</p>
                        {canOpenUnit ? (
                          <Link className="team-card__link" href={`/units/${unit.id}`}>
                            <b>{adminMode ? "ویرایش صفحه واحد" : managerView ? "ورود به واحد شما" : "آشنایی با این واحد"}</b>
                            <i aria-hidden="true">←</i>
                          </Link>
                        ) : (
                          <span className="team-card__link team-card__link--disabled" aria-disabled="true">
                            <b>دسترسی این واحد را ندارید</b>
                            <i aria-hidden="true">🔒</i>
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
          )}
        </div>
      )}

      {activeStep === 3 && (
        <div className="onboarding-stage">
          {sectionVisible("values") && (
          <section className="content-section" data-permission-section="values">
            <div className="content-section__index">۰۴</div>
            <div>
              <span className="section-kicker">فرهنگ برقتو</span>
              <h2>{content.aboutTitle}</h2>
              <div className="value-grid" data-layout-group="section-values-layout-values">
                {cultureValues.map(([title, description], index) => (
                  <article data-content-id={`value-${index}`} key={title}>
                    <span>{title}</span>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
          )}
          {sectionVisible("policies") && (
          <section className="policy-section" data-permission-section="policies">
            <div className="policy-section__heading">
              <div>
                <span className="section-kicker">راهنمای شروع همکاری</span>
                <h2>چیزهایی که باید از روز اول بدانید</h2>
                <p>
                  خلاصه کاربردی سیاست‌ها و رویه‌های داخلی شرکت چرخه سبز انرژی
                  پاک.
                </p>
              </div>
              <span className="policy-section__count">
                {visiblePolicies.length} موضوع ضروری
              </span>
            </div>
            {allowed("policies", "canManageItems") && onAdminAdd && (
              <button
                type="button"
                className="admin-inline-add"
                onClick={() => onAdminAdd("policy")}
              >
                <span aria-hidden="true">＋</span>
                افزودن قانون
              </button>
            )}
            <div className="policy-list" data-layout-group="section-policies-layout-policies">
              {visiblePolicies.map((group, index) => (
                <details
                  data-content-id={group.id}
                  key={group.id}
                  open={index === 0}
                >
                  <summary>
                    <span className="policy-icon">{group.icon}</span>
                    <span>
                      <strong>{group.title}</strong>
                      <small>{group.summary}</small>
                    </span>
                    <i>+</i>
                  </summary>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
          )}
          <div className="completion-card">
            <span>✓</span>
            <div>
              <strong>مسیر آشنایی اولیه تکمیل شد</strong>
              <p>اکنون با برقتو، همکاران و اصول شروع همکاری آشنا هستید.</p>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
