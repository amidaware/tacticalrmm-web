export type ActionType = "web" | "rest";

export interface URLAction {
  id: number;
  name: string;
  desc?: string;
  action_type: ActionType;
  pattern: string;
  rest_method: string;
  rest_body: string;
  rest_headers: string;
}

export interface URLActionRunResponse {
  url: string;
  result: string;
}
