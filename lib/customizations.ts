export type AddedPerson = {
  id: string;
  group: "leadership" | "personnel";
  name: string;
  role: string;
  bio: string;
};

export type AddedUnit = {
  id: string;
  title: string;
  description: string;
};

export type AddedPolicy = {
  id: string;
  title: string;
  summary: string;
  body: string;
};

export type CustomSection = {
  id: string;
  title: string;
  body: string;
  visible: boolean;
};

export type HandbookStructure = {
  addedPeople: AddedPerson[];
  removedPeople: string[];
  addedUnits: AddedUnit[];
  removedUnits: string[];
  addedPolicies: AddedPolicy[];
  removedPolicies: string[];
  customSections: CustomSection[];
  hiddenSections: string[];
};

export const textFontStacks = {
  brand: '"IRANYekanXFaNum", "IRANYekanX", Tahoma, Arial, sans-serif',
  tahoma: 'Tahoma, Arial, sans-serif',
  arial: 'Arial, Tahoma, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
} as const;

export type TextFont = keyof typeof textFontStacks;

export type TextStyle = {
  font: TextFont;
  fontSize: number;
  color: string;
};

export type HandbookCustomizations = {
  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;
  images: Record<string, string>;
  orders: Record<string, string[]>;
  sizes: Record<string, "small" | "medium" | "large">;
  structure: HandbookStructure;
};

export const emptyStructure: HandbookStructure = {
  addedPeople: [],
  removedPeople: [],
  addedUnits: [],
  removedUnits: [],
  addedPolicies: [],
  removedPolicies: [],
  customSections: [],
  hiddenSections: [],
};

export const emptyCustomizations: HandbookCustomizations = {
  texts: {},
  textStyles: {},
  images: {},
  orders: {},
  sizes: {},
  structure: emptyStructure,
};

export function normalizeCustomizations(value: unknown): HandbookCustomizations {
  if (!value || typeof value !== "object") return emptyCustomizations;
  const candidate = value as Partial<HandbookCustomizations>;
  return {
    texts:
      candidate.texts && typeof candidate.texts === "object"
        ? candidate.texts
        : {},
    textStyles:
      candidate.textStyles && typeof candidate.textStyles === "object"
        ? Object.fromEntries(
            Object.entries(candidate.textStyles).flatMap(([key, style]) => {
              if (!style || typeof style !== "object") return [];
              const raw = style as Partial<TextStyle>;
              const font = raw.font && raw.font in textFontStacks ? raw.font : null;
              const fontSize = typeof raw.fontSize === "number"
                ? Math.round(raw.fontSize)
                : null;
              const color = typeof raw.color === "string" && /^#[0-9a-f]{6}$/i.test(raw.color)
                ? raw.color.toLowerCase()
                : null;
              if (!font || fontSize === null || fontSize < 10 || fontSize > 64 || !color) return [];
              return [[key, { font, fontSize, color } satisfies TextStyle]];
            }),
          )
        : {},
    images:
      candidate.images && typeof candidate.images === "object"
        ? candidate.images
        : {},
    orders:
      candidate.orders && typeof candidate.orders === "object"
        ? candidate.orders
        : {},
    sizes:
      candidate.sizes && typeof candidate.sizes === "object"
        ? Object.fromEntries(
            Object.entries(candidate.sizes).filter(([, size]) =>
              size === "small" || size === "medium" || size === "large",
            ),
          ) as Record<string, "small" | "medium" | "large">
        : {},
    structure: {
      ...emptyStructure,
      ...(candidate.structure && typeof candidate.structure === "object"
        ? candidate.structure
        : {}),
    },
  };
}
