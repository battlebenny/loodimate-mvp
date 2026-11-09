import type { AirtableClient } from './client.js'

/** What services need from Airtable; implemented by AirtableClient (and a fake in tests). */
export type Db = Pick<AirtableClient, 'list' | 'getByIds' | 'create' | 'update' | 'uploadAttachment'>
