interface Window {
  _env_?: {
    PROD_URL?: string;
    WS_PROTO?: string;
  };
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*?worker" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
}
