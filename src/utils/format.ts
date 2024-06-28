import { date } from "quasar";
import { validateTimePeriod } from "@/utils/validation";
import trmmLogo from "@/assets/trmm_256.png";

import type { Script } from "@/types/scripts";
import type { Agent } from "@/types/agents";
import type { Client, ClientWithSites } from "@/types/clients";
import type { User } from "@/types/accounts";
import type { Check } from "@/types/checks";
import { CustomField, CustomFieldValue } from "@/types/core/customfields";
import { URLAction } from "@/types/core/urlactions";

// dropdown options formatting
export interface SelectOptionCategory {
  category: string;
}

export interface OptionWithoutCategory {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
}

export type Option = SelectOptionCategory | OptionWithoutCategory | string;

export function removeExtraOptionCategories(array: Option[]) {
  const tmp: Option[] = [];
  for (let i = 0; i < array.length; i++) {
    const currentOption = array[i];
    const nextOption = array[i + 1];

    // Determine if current and next options are categories
    const isCurrentCategory =
      typeof currentOption === "object" && "category" in currentOption;
    const isNextCategory =
      typeof nextOption === "object" && "category" in nextOption;

    if (i === array.length - 1) {
      // Always add the last item if it's not a category
      if (!isCurrentCategory) {
        tmp.push(currentOption);
      }
    } else if (!(isCurrentCategory && isNextCategory)) {
      // Add the current option if it's not followed by a category option
      tmp.push(currentOption);
    }
  }
  return tmp;
}
interface FormatOptionsParams {
  label: string; // Key to use for the label
  value?: string; // Key to use for the value, defaults to "id"
  flat?: boolean; // Whether to return a flat array of strings
  allowDuplicates?: boolean; // Whether to allow duplicate labels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appendToOptionObject?: { [key: string]: any }; // Additional properties to append to each option object
  copyPropertiesList?: string[]; // List of properties to copy from the original objects
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _formatOptions<T extends { [key: string]: any }>(
  data: T[],
  {
    label,
    value = "id",
    flat = false,
    allowDuplicates = true,
    appendToOptionObject = {},
    copyPropertiesList = [],
  }: FormatOptionsParams,
): Option[] | string[] {
  if (!flat) {
    return data.map((item) => {
      const option: Partial<Option> = {
        label: item[label],
        value: item[value],
        ...appendToOptionObject,
      };

      copyPropertiesList.forEach((prop) => {
        if (Object.hasOwn(item, prop)) {
          option[prop] = item[prop];
        }
      });

      return option as Option;
    });
  } else {
    const labels = data.map((item) => item[label]);
    return allowDuplicates ? labels : [...new Set(labels)];
  }
}

export function formatScriptOptions(data: Script[]): Option[] {
  const categoryMap = new Map<string, Script[]>();
  let hasUnassigned = false;

  data.forEach((script) => {
    const category = script.category || "Unassigned";
    if (!script.category) hasUnassigned = true;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(script);
  });

  const categories = Array.from(categoryMap.keys());
  if (hasUnassigned) {
    // Ensure "Unassigned" is the last category
    const index = categories.indexOf("Unassigned");
    categories.splice(index, 1);
    categories.push("Unassigned");
  }

  categories.sort();

  const options: Option[] = [];
  categories.forEach((cat) => {
    options.push({ category: cat });

    const scripts = categoryMap
      .get(cat)!
      .sort((a, b) => a.name.localeCompare(b.name));
    scripts.forEach((script) => {
      const option: Option = {
        img_right: script.script_type === "builtin" ? trmmLogo : undefined,
        label: script.name,
        value: script.id,
        default_timeout: script.default_timeout,
        args: script.args,
        env_vars: script.env_vars,
        filename: script.filename,
        syntax: script.syntax,
        script_type: script.script_type,
        shell: script.shell,
        supported_platforms: script.supported_platforms,
      };
      options.push(option);
    });
  });

  return options;
}

export function formatAgentOptions(
  data: Agent[],
  flat = false,
  value_field: keyof Agent = "agent_id",
): Option[] | string[] {
  if (flat) {
    // Returns just agent hostnames in an array
    return _formatOptions(data, {
      label: "hostname",
      value: value_field as string,
      flat: true,
      allowDuplicates: false,
    });
  } else {
    // Returns options with categories in object format
    const options: Option[] = [];
    const agents = data.map((agent) => ({
      label: agent.hostname,
      value: agent[value_field] as string,
      cat: `${agent.client} > ${agent.site}`,
    }));

    const categories = [...new Set(agents.map((agent) => agent.cat))].sort();

    categories.forEach((cat) => {
      options.push({ category: cat });
      const agentsInCategory = agents.filter((agent) => agent.cat === cat);
      const sortedAgents = agentsInCategory.sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      options.push(
        ...sortedAgents.map(({ label, value }) => ({ label, value })),
      );
    });

    return options;
  }
}

export function formatCustomFieldOptions(
  data: CustomField[],
  flat = false,
): Option[] {
  if (flat) {
    // For a flat list, simply format the options based on the "name" property
    return _formatOptions(data, { label: "name", flat: true });
  } else {
    // Predefined categories for organizing the custom fields
    const categories = ["Client", "Site", "Agent"];
    const options: Option[] = [];

    categories.forEach((cat) => {
      // Add a category header as an option
      options.push({ category: cat, label: cat, value: cat });

      // Filter and map the custom fields that match the current category
      const matchingFields = data
        .filter((custom_field) => custom_field.model === cat.toLowerCase())
        .map((custom_field) => ({
          label: custom_field.name,
          value: custom_field.id,
        }));

      // Sort the filtered custom fields by their labels and add them to the options
      const sortedFields = matchingFields.sort((a, b) =>
        a.label.localeCompare(b.label),
      );
      options.push(...sortedFields);
    });

    return options;
  }
}

export function formatClientOptions(data: Client[], flat = false) {
  return _formatOptions(data, { label: "name", flat: flat });
}

export function formatSiteOptions(data: ClientWithSites[], flat = false) {
  const options = [] as Option[];
  data.forEach((client) => {
    options.push({ category: client.name });
    options.push(
      ..._formatOptions(client.sites, {
        label: "name",
        flat: flat,
        appendToOptionObject: { cat: client.name },
      }),
    );
  });

  return options;
}

export function formatUserOptions(data: User[], flat = false) {
  return _formatOptions(data, { label: "username", flat: flat });
}

export function formatCheckOptions(data: Check[], flat = false) {
  return _formatOptions(data, { label: "readable_desc", flat: flat });
}

export function formatURLActionOptions(data: URLAction[], flat = false) {
  return _formatOptions(data, {
    label: "name",
    flat: flat,
    copyPropertiesList: ["action_type"],
  });
}

export function formatCustomFields(
  fields: CustomField[],
  values: CustomFieldValue,
) {
  const tempArray = [];

  for (const field of fields) {
    if (field.type === "multiple") {
      tempArray.push({ multiple_value: values[field.name], field: field.id });
    } else if (field.type === "checkbox") {
      tempArray.push({ bool_value: values[field.name], field: field.id });
    } else {
      tempArray.push({ string_value: values[field.name], field: field.id });
    }
  }
  return tempArray;
}

export function formatScriptSyntax(syntax: string) {
  let temp = syntax;
  temp = temp.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  temp = temp
    .replaceAll("&lt;", '<span style="color:#d4d4d4">&lt;</span>')
    .replaceAll("&gt;", '<span style="color:#d4d4d4">&gt;</span>');
  temp = temp
    .replaceAll("[", '<span style="color:#ffd70a">[</span>')
    .replaceAll("]", '<span style="color:#ffd70a">]</span>');
  temp = temp
    .replaceAll("(", '<span style="color:#87cefa">(</span>')
    .replaceAll(")", '<span style="color:#87cefa">)</span>');
  temp = temp
    .replaceAll("{", '<span style="color:#c586b6">{</span>')
    .replaceAll("}", '<span style="color:#c586b6">}</span>');
  temp = temp.replaceAll("\n", "<br />");
  return temp;
}

// date formatting

export function getTimeLapse(unixtime: number) {
  if (date.inferDateFormat(unixtime) === "string") {
    unixtime = parseInt(date.formatDate(unixtime, "X"));
  }
  const previous = unixtime * 1000;
  const current = Date.now();
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;
  const elapsed = current - previous;
  if (elapsed < msPerMinute) {
    return Math.round(elapsed / 1000) + " seconds ago";
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + " minutes ago";
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + " hours ago";
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + " days ago";
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + " months ago";
  } else {
    return Math.round(elapsed / msPerYear) + " years ago";
  }
}

export function formatDate(
  dateString: string | number | Date,
  format = "MMM-DD-YYYY HH:mm",
) {
  if (!dateString) return "";
  return date.formatDate(dateString, format);
}

export function getNextAgentUpdateTime() {
  const d = new Date();
  let ret;
  if (d.getMinutes() <= 35) {
    ret = d.setMinutes(35);
  } else {
    ret = date.addToDate(d, { hours: 1 });
    ret.setMinutes(35);
  }
  const a = date.formatDate(ret, "MMM D, YYYY");
  const b = date.formatDate(ret, "h:mm A");
  return `${a} at ${b}`;
}

// converts a date with timezone to local for html native datetime fields -> YYYY-MM-DD HH:mm:ss
export function formatDateInputField(
  isoDateString: string | number,
  noTimezone = false,
) {
  if (noTimezone && typeof isoDateString === "string") {
    isoDateString = isoDateString.replace("Z", "");
  }
  return date.formatDate(isoDateString, "YYYY-MM-DDTHH:mm");
}

// converts a local date string "YYYY-MM-DDTHH:mm:ss" to an iso date string with the local timezone
export function formatDateStringwithTimezone(localDateString: string) {
  return date.formatDate(localDateString, "YYYY-MM-DDTHH:mm:ssZ");
}
// string formatting

export function capitalize(string: string) {
  return string[0].toUpperCase() + string.substring(1);
}

export function formatTableColumnText(text: string) {
  let string = "";
  // split at underscore if exists
  const words = text.split("_");
  words.forEach((word) => (string = string + " " + capitalize(word)));

  return string.trim();
}

export function truncateText(txt: string, chars: number) {
  if (!txt) return;

  return txt.length >= chars ? txt.substring(0, chars) + "..." : txt;
}

export function bytes2Human(bytes: number) {
  if (bytes == 0) return "0B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function convertMemoryToPercent(percent: number, memory: number) {
  const mb = memory * 1024;
  return Math.ceil((percent * mb) / 100).toLocaleString();
}

// convert time period(str) to seconds(int) (3h -> 10800) used for comparing time intervals
export function convertPeriodToSeconds(period: string) {
  if (!validateTimePeriod(period)) {
    console.error("Time Period is invalid");
    return 0;
  }

  if (period.toUpperCase().includes("S"))
    // remove last letter from string and return since already in seconds
    return parseInt(period.slice(0, -1));
  else if (period.toUpperCase().includes("M"))
    // remove last letter from string and multiple by 60 to get seconds
    return parseInt(period.slice(0, -1)) * 60;
  else if (period.toUpperCase().includes("H"))
    // remove last letter from string and multiple by 60 twice to get seconds
    return parseInt(period.slice(0, -1)) * 60 * 60;
  else if (period.toUpperCase().includes("D"))
    // remove last letter from string and multiply by 24 and 60 twice to get seconds
    return parseInt(period.slice(0, -1)) * 24 * 60 * 60;

  return 0;
}

// takes an integer and converts it to an array in binary format. i.e: 13 -> [8, 4, 1]
// Needed to work with multi-select fields in tasks form
export function convertToBitArray(number: number) {
  const bitArray = [];
  const binary = number.toString(2);
  for (let i = 0; i < binary.length; ++i) {
    if (binary[i] !== "0") {
      // last binary digit
      if (binary.slice(i).length === 1) {
        bitArray.push(1);
      } else {
        bitArray.push(
          parseInt(binary.slice(i), 2) - parseInt(binary.slice(i + 1), 2),
        );
      }
    }
  }
  return bitArray;
}

// takes an array of integers and adds them together
export function convertFromBitArray(array: number[]) {
  let result = 0;
  for (let i = 0; i < array.length; i++) {
    result += array[i];
  }
  return result;
}

export function convertCamelCase(str: string) {
  return str
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

// This will take an object and make a clone of it without including some of the keys
export function copyObjectWithoutKeys<
  T extends Record<string, unknown>,
  K extends keyof T,
>(objToCopy: T, keysToExclude: Array<K>): Omit<T, K> {
  const result: Partial<T> = {};

  Object.keys(objToCopy).forEach((key) => {
    if (!keysToExclude.includes(key as K)) {
      // Use an intermediate variable with a more permissive type
      const safeKey: keyof T = key as keyof T;
      result[safeKey] = objToCopy[safeKey];
    }
  });

  return result as Omit<T, K>;
}
