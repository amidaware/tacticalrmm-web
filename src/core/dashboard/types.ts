/* eslint-disable @typescript-eslint/no-explicit-any */
export type Option =
  | { label: string; value: number | string; cat?: string; img_right?: string }
  | { category: string };

export function isLabeledOption(option: Option): option is {
  label: string;
  value: number | string;
  cat?: string;
  img_right?: string;
} {
  return (
    typeof option === "object" &&
    option !== null &&
    "label" in option &&
    typeof (option as any).label === "string" &&
    "value" in option &&
    (typeof (option as any).value === "number" ||
      typeof (option as any).value === "string")
  );
}

export function isCategoryOption(
  option: Option,
): option is { category: string } {
  return (
    typeof option === "object" &&
    option !== null &&
    "category" in option &&
    typeof (option as any).category === "string"
  );
}
