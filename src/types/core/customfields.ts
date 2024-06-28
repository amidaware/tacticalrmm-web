export interface CustomField {
  id: number;
  model: "agent" | "client" | "site";
  name: string;
  type: string;
  required: boolean;
  default_value: string | boolean | number | string[];
}

export interface CustomFieldValue {
  [x: string]: string | boolean | number | string[];
}
