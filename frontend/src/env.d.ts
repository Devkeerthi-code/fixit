interface ImportMetaEnv {
  /** "true" only in the GitHub Pages demo build (see .env.demo). */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
