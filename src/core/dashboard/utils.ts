import type { Option } from "./types";

export function removeExtraOptionCategories(array: Option[]): Option[] {
  const cleanedOptions: Option[] = [];
  let lastWasCategory = false;

  for (const option of array) {
    const isCategory = typeof option === "object" && "category" in option;

    if (isCategory) {
      if (!lastWasCategory) {
        cleanedOptions.push(option);
      }
      lastWasCategory = true;
    } else {
      cleanedOptions.push(option);
      lastWasCategory = false;
    }
  }

  return cleanedOptions;
}
