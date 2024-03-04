import { date } from "quasar";
import { validateTimePeriod } from "@/utils/validation";
import trmmLogo from "@/assets/trmm_256.png";

import type { Script } from "@/types/scripts";
import type { Agent } from "@/types/agents";
import type { Client } from "@/types/clients";
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

export type Option = OptionWithoutCategory | SelectOptionCategory;

export function removeExtraOptionCategories(array: Option[]) {
  const tmp = [];
  // loop through options and if two categories are next to each other remove the top one
  for (let i = 0; i < array.length; i++) {
    if (i === array.length - 1) {
      // check if last item is not a category and add it
      if (!array[i].category) tmp.push(array[i]);
    } else if (!(array[i].category && array[i + 1].category)) {
      tmp.push(array[i]);
    }
  }
  return tmp;
}

export interface FormatOptionsParams {
  label: string;
  value?: string;
  flat?: boolean;
  allowDuplicates?: boolean;
  appendToOptionObject?: { [x: string]: never };
  copyPropertiesList?: string[];
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
  if (!flat)
    // returns array of options in object format [{label: label, value: 1}]
    return data.map((i) => {
      const option = {
        label: i[label],
        value: i[value],
        ...appendToOptionObject, // will add properties to the options object
      } as Option;

      copyPropertiesList.forEach((prop) => {
        if (Object.hasOwn(i, prop)) {
          option[prop] = i[prop];
        }
      });
      return option;
    });
  // returns options as an array of strings ["label", "label1"]
  else if (!allowDuplicates) return data.map((i) => i[label]);
  else {
    const options = [] as Option[];
    data.forEach((i) => {
      if (!options.includes(i[label])) options.push(i[label]);
    });
    return options;
  }
}

export function formatScriptOptions(data: Script[]) {
  const options = [] as Option[];
  const categories = [] as string[];
  let create_unassigned = false;
  data.forEach((script) => {
    if (!!script.category && !categories.includes(script.category)) {
      categories.push(script.category);
    } else if (!script.category) {
      create_unassigned = true;
    }
  });

  if (create_unassigned) categories.push("Unassigned");

  categories.sort().forEach((cat) => {
    options.push({ category: cat });
    const tmp = [] as Option[];
    data.forEach((script) => {
      if (script.category === cat) {
        tmp.push({
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
        });
      } else if (cat === "Unassigned" && !script.category) {
        tmp.push({
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
        });
      }
    });
    const sorted = tmp.sort((a, b) => a.label.localeCompare(b.label));
    options.push(...sorted);
  });

  return options;
}

export function formatAgentOptions(
  data: Agent[],
  flat = false,
  value_field = "agent_id",
) {
  if (flat) {
    // returns just agent hostnames in array
    return _formatOptions(data, {
      label: "hostname",
      value: value_field,
      flat: true,
      allowDuplicates: false,
    });
  } else {
    // returns options with categories in object format
    const options = [] as Option[];
    const agents = data.map((agent) => ({
      label: agent.hostname,
      value: agent[value_field],
      cat: `${agent.client} > ${agent.site}`,
    }));

    const categories = [] as string[];
    agents.forEach((option) => {
      if (!categories.includes(option.cat)) {
        categories.push(option.cat);
      }
    });

    categories.sort().forEach((cat) => {
      options.push({ category: cat });
      const tmp = [] as Option[];
      agents.forEach((agent) => {
        if (agent.cat === cat) {
          tmp.push(agent);
        }
      });

      const sorted = tmp.sort((a, b) => a.label.localeCompare(b.label));
      options.push(...sorted);
    });

    return options;
  }
}

export function formatCustomFieldOptions(data: CustomField[], flat = false) {
  if (flat) {
    return _formatOptions(data, { label: "name", flat: true });
  } else {
    const categories = ["Client", "Site", "Agent"];
    const options = [] as Option[];

    categories.forEach((cat) => {
      options.push({ category: cat });
      const tmp = [] as Option[];
      data.forEach((custom_field) => {
        if (custom_field.model === cat.toLowerCase()) {
          tmp.push({
            label: custom_field.name,
            value: custom_field.id,
            cat: cat,
          });
        }
      });

      const sorted = tmp.sort((a, b) => a.label.localeCompare(b.label));
      options.push(...sorted);
    });

    return options;
  }
}

export function formatClientOptions(data: Client[], flat = false) {
  return _formatOptions(data, { label: "name", flat: flat });
}

export function formatSiteOptions(data: Client[], flat = false) {
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
  values: CustomFieldValue[],
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
  if (noTimezone) {
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

export function copyObjectWithoutKeys(
  objToCopy: object,
  keysToExclude: string[],
): object {
  const copied = Object.entries(objToCopy).reduce((obj, [key, value]) => {
    if (!keysToExclude.includes(key)) {
      obj[key] = value;
    }
    return obj;
  }, {});

  return copied;
}
