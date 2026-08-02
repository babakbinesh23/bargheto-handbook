export const unitDefinitions = [
  ["unit-finance-accounting", "مالی و حسابداری"],
  ["unit-sales", "فروش"],
  ["unit-marketing", "مارکتینگ"],
  ["unit-support", "پشتیبانی"],
  ["unit-product", "محصول"],
  ["unit-development", "توسعه"],
  ["unit-efficiency", "صرفه‌جویی"],
  ["unit-services", "خدمات"],
] as const;

export type UnitKey = (typeof unitDefinitions)[number][0];

export function isUnitKey(value: unknown): value is UnitKey {
  return unitDefinitions.some(([key]) => key === value);
}

export function unitLabel(value: string) {
  return unitDefinitions.find(([key]) => key === value)?.[1] ?? "واحد سازمانی";
}
