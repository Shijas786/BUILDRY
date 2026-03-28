import { FS } from '@/lib/firestoreCollections'

/** Payload to store at `system_metadata/schema_registry` (optional onboarding doc). */
export function buildSchemaRegistryDocument() {
  return {
    version: 1,
    updated_at: Date.now(),
    collections: Object.values(FS),
    note: 'Registry of reserved collection ids. Firestore creates a collection on first write.',
  }
}
