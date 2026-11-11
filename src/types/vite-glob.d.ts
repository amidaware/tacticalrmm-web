// vite 2 static glob import (used by src/i18n/index.ts)
interface ImportMeta {
  globEager<M = unknown>(pattern: string): Record<string, M>;
}
