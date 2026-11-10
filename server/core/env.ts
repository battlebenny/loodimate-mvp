// Server-side secrets. Always passed in by the platform adapter, never read here.
export type Env = {
  AIRTABLE_API_TOKEN: string
  AIRTABLE_BASE_ID: string
  BGG_API_TOKEN: string
}
