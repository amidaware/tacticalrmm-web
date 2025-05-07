/* eslint-disable @typescript-eslint/no-explicit-any */
export type Option =
  | { label: string; value: number | string; cat: string; img_right?: string }
  | { category: string };

export function isLabeledOption(option: Option): option is {
  label: string;
  value: number | string;
  cat: string;
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

export type Filter = string | string[] | { to: string; from: string };

export type FilterObject = {
  [key: string]: Filter;
};

export type FilterTerm = {
  column: string;
  values: string[] | { to: string; from: string }[];
};

// filter type guards
export function isStringArrayFilter(value: Filter): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isDateFilter(
  value: Filter,
): value is { to: string; from: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value &&
    typeof value.from === "string" &&
    typeof value.to === "string"
  );
}

export interface TableView {
  id?: number;
  name: string;
  table: string;
  filter: string;
}
