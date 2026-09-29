/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string
  readonly VITE_MAP_STYLE_URL?: string
  readonly VITE_SATELLITE_STYLE_URL?: string
  readonly VITE_TERRAIN_STYLE_URL?: string
  readonly VITE_DARK_STYLE_URL?: string
  readonly VITE_LIGHT_STYLE_URL?: string
  readonly VITE_PROTOTYPE_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
