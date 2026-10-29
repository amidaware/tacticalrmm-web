declare module "gettext-tested-functions" {
  export function makeFunction(
    name: string,
    bindings: Record<string, unknown>,
  ): (...args: unknown[]) => unknown;
}
