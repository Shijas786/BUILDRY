/**
 * Canonical Firestore collection IDs for Buildry.
 * Use these everywhere (server Admin SDK + client SDK) to avoid typos and to document the data model.
 *
 * “Upcoming” collections are reserved for features not fully wired yet; creating a doc in them
 * will auto-create the collection in Firestore when you implement each feature.
 */
export const FS = {
  /* ─── Core identity (live) ─── */
  USERS: 'users',
  BUILDER_PROFILES: 'builder_profiles',

  /* ─── Token launch registry: doc id = Firebase uid; written on every Bags launch ─── */
  USER_TOKEN_LAUNCHES: 'user_token_launches',

  /* ─── Social graph & feed (live) ─── */
  POSTS: 'posts',
  POST_COMMENTS: 'post_comments',
  POST_LIKES: 'post_likes',
  BUILDER_FOLLOWERS: 'builder_followers',

  /* ─── Profile projects (live; client + future API) ─── */
  PROJECTS: 'projects',

  /* ─── Wallet verification (live) ─── */
  WALLET_LINK_CHALLENGES: 'wallet_link_challenges',
  WALLET_ADDRESS_CLAIMS: 'wallet_address_claims',

  /* ─── Notifications & activity (upcoming) ─── */
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_PREFS: 'notification_prefs',
  ACTIVITY_EVENTS: 'activity_events',

  /* ─── Messaging (upcoming) ─── */
  DM_THREADS: 'dm_threads',
  DM_MESSAGES: 'dm_messages',

  /* ─── Reputation & trust (upcoming) ─── */
  BUILDER_ENDORSEMENTS: 'builder_endorsements',
  PROJECT_BACKERS: 'project_backers',

  /* ─── Product / discovery (upcoming) ─── */
  TOKEN_WATCHLIST: 'token_watchlist',
  SAVED_POSTS: 'saved_posts',
  BUILDER_VIEWS: 'builder_views',

  /* ─── Teams & orgs (upcoming) ─── */
  ORGANIZATIONS: 'organizations',
  ORG_MEMBERS: 'org_members',

  /* ─── Safety (upcoming) ─── */
  MODERATION_REPORTS: 'moderation_reports',
  USER_BLOCKS: 'user_blocks',

  /* ─── Jobs, deals, grants (live; Admin API) ─── */
  JOBS: 'jobs',
  JOB_APPLICATIONS: 'job_applications',
  DEALS: 'deals',
  DEAL_INVESTMENTS: 'deal_investments',
  GRANTS: 'grants',
  GRANT_APPLICATIONS: 'grant_applications',

  /* ─── Registry doc (optional bootstrap) ─── */
  SYSTEM_METADATA: 'system_metadata',
} as const

export type FirestoreCollectionName = (typeof FS)[keyof typeof FS]

/** Document IDs / key patterns (where not using random Firestore ids). */
export const FS_DOC_IDS = {
  SCHEMA_REGISTRY: 'schema_registry',
  FOLLOW: (builderId: string, followerId: string) => `${builderId}_${followerId}`,
  POST_LIKE: (postId: string, userId: string) => `${postId}_${userId}`,
  WALLET_CLAIM: (chain: 'sol' | 'evm', address: string) => `${chain}_${address}`,
} as const
