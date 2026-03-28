# Buildry

Buildry is a social platform for founders, developers, investors, and recruiters to build reputation in public.

Core product loop:
- Share updates, milestones, launches, and hiring posts
- Build a public profile with verified social + onchain proof
- Discover builders, deals, grants, and opportunities
- Launch and track builder tokens with Bags

---

## What Is Live

- Auth: email/password + Google OAuth + wallet connect
- Role system: developer / founder / investor / recruiter
- Social feed: post composer, likes, comments, infinite list
- Profile system: tabs for posts, projects, tokens, activity, services
- Settings: profile editing, social connections, skills, projects, availability
- Follow system: follow/unfollow builders
- Invest hub: deals, grants/fellowships, token trading entry points
- Bags integration: token launch, quote/swap APIs, creator token data
- Verification model: GitHub contributions + Solana/EVM onchain deployment/activity stats

---

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Firebase Auth + Firestore
- Zustand (role + UI state)
- Reown AppKit + Wagmi + Solana wallet adapter (multi-chain wallet UX)
- Bags SDK / API
- GitHub API (public activity + repository signal)
- Helius + Etherscan integrations for onchain activity

---

## Quick Start

```bash
git clone https://github.com/Shijas786/BUILDRY.git
cd BUILDRY
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Environment Variables

Create `.env.local`:

```env
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# Optional: only if Firebase OIDC Provider ID is not `linkedin` (default client id is oidc.linkedin)
# NEXT_PUBLIC_FIREBASE_LINKEDIN_PROVIDER_ID=oidc.linkedin

# Firebase Admin (server routes)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Auth/social helpers (production: e.g. buildry.in — no scheme)
NEXT_PUBLIC_APP_DOMAIN=localhost
NEXT_PUBLIC_TELEGRAM_BOT_NAME=
TELEGRAM_BOT_TOKEN=

# Wallet / chain
NEXT_PUBLIC_REOWN_PROJECT_ID=
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Bags
BAGS_API_KEY=
PLATFORM_TREASURY_WALLET=
PLATFORM_FEE_BPS=150

# Reputation / data providers
HELIUS_API_KEY=
ETHERSCAN_API_KEY=
NEYNAR_API_KEY=
TAPESTRY_API_KEY=

# Optional AI layer
CHAINGPT_API_KEY=
```

Notes:
- The app can run with partial/missing keys (some modules degrade gracefully).
- Keep `.env.local` out of git.

---

## Production domain (`buildry.in`)

Use this checklist when pointing **GoDaddy** at **Vercel** and enabling auth everywhere.

### 1) Vercel — attach the domain

1. [Vercel Dashboard](https://vercel.com) → project **buildry** → **Settings** → **Domains**.
2. Add **`buildry.in`** and **`www.buildry.in`**.
3. Vercel will show the exact DNS targets; if you use external DNS at GoDaddy, the usual pattern is:
   - **A** record: **Host** `@` → **Value** `76.76.21.21`
   - **CNAME** record: **Host** `www` → **Value** `cname.vercel-dns.com`  
   (Confirm in the Vercel UI — values can change.)

### 2) GoDaddy — DNS

1. GoDaddy → **My Products** → your domain **buildry.in** → **DNS** / **Manage DNS**.
2. Add or edit records as Vercel instructs (often the **A** + **www CNAME** above).
3. Remove conflicting **A**/**CNAME** on `@` or `www` if the site pointed elsewhere before.
4. Wait for propagation (often minutes; up to 48 hours).

### 3) Firebase — authorized domains

Firebase Console → **Authentication** → **Settings** → **Authorized domains** — add:

- `buildry.in`
- `www.buildry.in`

(Keep `localhost` for local dev.)

### 4) Google sign-in (Firebase / Google Cloud)

Google Cloud Console → **APIs & Services** → **Credentials** → your **Web client** → **Authorized JavaScript origins**:

- `https://buildry.in`
- `https://www.buildry.in`

### 5) Env on Vercel

Set **`NEXT_PUBLIC_APP_DOMAIN`** to `buildry.in` (no `https://`) in Vercel **Environment Variables** for **Production**, or run `npm run vercel:env-sync` after updating `.env.local`.

`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` stays **`buildry-18c42.firebaseapp.com`** unless you configure a **custom auth domain** in Firebase.

### 6) LinkedIn / other OAuth

LinkedIn (and similar) redirect URIs often stay the Firebase handler, e.g.  
`https://buildry-18c42.firebaseapp.com/__/auth/handler` — add that in the LinkedIn app if not already.

---

## Google OAuth Signup Setup (Firebase)

Buildry uses Firebase Auth for Google sign-in/sign-up.

### 1) Create Google OAuth credentials

In Google Cloud Console:
- Go to **APIs & Services -> Credentials**
- Create **OAuth client ID** (Web application)
- Add your frontend origins:
  - `http://localhost:3000`
  - your production domain (for example `https://yourdomain.com`)
- You do not need a Supabase callback URL for Firebase popup auth.

### 2) Configure Firebase Auth provider

In Firebase Console:
- Go to **Authentication -> Sign-in method**
- Enable **Google**
- Save

### 3) Add authorized domains

In Firebase Console:
- Go to **Authentication -> Settings -> Authorized domains**
- Add:
  - `localhost`
  - your production domain

### 4) Ensure local env is set

Your `.env.local` must include:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 5) Test the flow

- Run `npm run dev`
- Click **Continue with Google** in auth modal
- After consent, Firebase signs the user in immediately
- App sends new users to onboarding and returning users to feed

### Common issues

- **Popup blocked**: allow popups for your app domain and try again.
- **Google sign-in button fails**: verify Firebase Google provider is enabled.
- **Works locally, fails in prod**: production domain not added in Firebase authorized domains.

---

## LinkedIn (Settings → Socials)

Buildry links LinkedIn to your **existing** Firebase account (Google/email) from **Settings → Socials → Connect LinkedIn**. Firebase often **does not** show a “LinkedIn” tile in the provider list — use **Custom providers → OpenID Connect** instead. The app uses `OAuthProvider('oidc.linkedin')` by default (`linkWithPopup`). If you choose a different Provider ID in Firebase, set `NEXT_PUBLIC_FIREBASE_LINKEDIN_PROVIDER_ID=oidc.yourid` in `.env.local`.

### 1) LinkedIn Developer app

1. [LinkedIn Developers](https://www.linkedin.com/developers/apps) → create or open your app.
2. Under **Products**, add **Sign In with LinkedIn using OpenID Connect**.
3. **Auth** tab → **Authorized redirect URLs for your app** — add **exactly** (replace project id if yours differs):

   `https://buildry-18c42.firebaseapp.com/__/auth/handler`

4. Copy **Client ID** and **Client Secret**.

### 2) Firebase — OpenID Connect (not a “LinkedIn” row)

1. [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Sign-in method** → **Add new provider**.
2. Under **Custom providers**, choose **OpenID Connect**.
3. **Provider ID**: `linkedin` (must match the app default: client uses `oidc.linkedin`).
4. **Issuer (URL)**: `https://www.linkedin.com/oauth`  
   (LinkedIn’s discovery doc is at `https://www.linkedin.com/oauth/.well-known/openid-configuration`.)
5. **Client ID** and **Client secret**: paste from LinkedIn. Save.
6. Some projects only show OIDC after **Identity Platform** is enabled; if you do not see OpenID Connect, upgrade Auth per Firebase’s prompt for your project.

### 3) Domains

**Authentication → Settings → Authorized domains** must include where the app runs (e.g. `buildry.in`, `www.buildry.in`, `localhost`).

### 4) Test

Sign in with Google → **Settings** → **Socials** → **Connect LinkedIn**. Allow popups. If the profile URL does not auto-fill, paste your public URL and click **Save URL**.

---

## GitHub (Settings → Socials)

Buildry links GitHub to your **existing** Firebase account from **Settings → Socials → Connect GitHub** (`GithubAuthProvider` + `linkWithPopup`). Your public GitHub username is written to `github_username` for profile stats and repo imports.

### 1) GitHub OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App** (or open an existing app).
2. **Authorization callback URL** — add **exactly** (replace project id if yours differs):

   `https://buildry-18c42.firebaseapp.com/__/auth/handler`

3. Copy **Client ID** and generate a **Client secret**.

### 2) Firebase — GitHub provider

1. [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Sign-in method** → **Add new provider** → **GitHub**.
2. Paste **Client ID** and **Client secret** from GitHub. Save.

### 3) Test

Sign in with Google (or email) → **Settings** → **Socials** → **Connect GitHub**. You can still type a username and use **Save username** without OAuth.

---

## Main Routes

- `/` → public landing page
- `/feed` → social feed + live builder context
- `/explore` → builder discovery
- `/profile/[username]` → public builder profile
- `/settings` → edit profile, socials, projects, availability
- `/invest` → deals, grants, token trading
- `/jobs` → hiring board
- `/launch` → token launch flow
- `/token/[mint]` → token detail/trade context

---

## API Highlights

- `GET/POST /api/posts`
- `POST /api/posts/[id]/like`
- `GET/POST /api/posts/[id]/comments`
- `POST /api/follow`
- `GET/POST /api/jobs`
- `GET/POST /api/deals`
- `GET/POST /api/grants`
- `GET /api/profile/[username]`
- `GET /api/talent/top-builders` (legacy/mock profile source; optional)
- `GET /api/tokens/trending`
- `GET /api/tokens/[mint]`
- `POST /api/launch`
- `POST /api/quote`
- `POST /api/swap`

---

## Project Structure (Simplified)

```txt
app/
  api/
  feed/
  explore/
  invest/
  launch/
  profile/[username]/
  settings/
components/
context/
hooks/
lib/
store/
supabase/
```

---

## Current Direction

Buildry is evolving from a trading-first concept into a social reputation network for startup builders.
The focus is now:
- identity + proof,
- network growth through content,
- capital and hiring outcomes,
- token tooling as a native extension (not the whole product).

Verification is now handled manually and transparently through:
- GitHub contribution/activity signal
- Onchain activity + deployment history
