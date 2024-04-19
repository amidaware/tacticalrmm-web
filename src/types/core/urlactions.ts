export type URLActionType = "web" | "rest";

export type RESTMethodType = "get" | "post" | "put" | "delete" | "patch";

export interface URLAction {
  id: number;
  name: string;
  desc?: string;
  action_type: URLActionType;
  pattern: string;
  rest_method: RESTMethodType;
  rest_body: string;
  rest_headers: string;
}

export interface URLActionRunResponse {
  url: string;
  result: string;
}

export interface TestRunURLActionRequest {
  pattern: string;
  rest_body: string;
  rest_headers: string;
  rest_method: RESTMethodType;
  run_instance_type: string;
  run_instance_id: number | null;
}
