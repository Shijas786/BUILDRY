# Buildry

> **Know who built it before you buy it.**

The first Solana trading terminal that shows the builder's verified reputation before every trade. Built on [bags.fm](https://bags.fm) · Talent Protocol · ChainGPT.

---

## The Core Vision (V3)
**A builder-first launchpad where tokens are backed by real work.**

We track commits, contracts, and onchain usage to create a trust score before enabling token creation via Bags. Generated fees are automatically routed into liquidity and growth mechanisms, turning real usage into sustainable token value. Fixing trust in builder tokens — just getting started.

### The 3 Tech Pillars of Trust
1. **[Talent Protocol](https://talentprotocol.com)** — Provable identity verification and GitHub commit indexing.
2. **[Helius APIs](https://helius.xyz)** — High-speed RPC indexing of the builder's historical onchain transaction volume.
3. **[Bags Protocol](https://bags.fm)** — 1-Click Token launches where trading fees are algorithmically reinvested.

---

## Screenshots

### Onboarding Flow
5-screen onboarding (only shown once, stored in localStorage):
- **Splash** → Problem → How It Works → Connect Wallet → Ready

### Trust Tiers (all 3 states)

**🟢 Verified** — Green card with Builder Rank, GitHub, Twitter, Farcaster chips

**🟡 Partial** — Yellow card with Twitter only, prompt to verify on Talent Protocol

**🔴 Anonymous** — Red card warning + ConfirmModal before any swap

---

## Quick Start

```bash
# 1. Clone & install
git clone <repo>
cd buildry
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Fill in your API keys (see below)

# 3. Run local dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create `.env.local`:

```env
BAGS_API_KEY=          # Get from: https://bags.fm/developers
TALENT_API_KEY=        # Get from: https://docs.talentprotocol.com
CHAINGPT_API_KEY=      # Get from: https://chaingpt.org/api
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
PLATFORM_TREASURY_WALLET=   # Your platform wallet that receives launch fee share
PLATFORM_FEE_BPS=150         # 1.5% platform fee (in basis points)
```

> **Note:** The app runs fully in demo/mock mode without API keys. All trust data and risk briefs will use realistic mock data.

---

## How Trust Resolution Works

```
Creator wallet →
  ├─ Talent Protocol /profile   ─┐
  ├─ Talent Protocol /score      ├── Promise.all (parallel)
  ├─ Talent Protocol /socials    │
  └─ Talent Protocol /accounts  ─┘
       │
       ▼
  resolveTrustTier():
    profile + builderScore  → VERIFIED 🟢
    twitterFromBags only    → PARTIAL  🟡
    nothing                 → ANONYMOUS 🔴
```

Trust data is cached for **30 minutes** server-side.
AI risk briefs are cached for **1 hour** per mint address.

---

## Tech Stack

- **Next.js 14** App Router + TypeScript
- **TailwindCSS** + CSS custom properties (Bags.fm design system)
- **@solana/wallet-adapter-react** — Phantom, Backpack, Solflare
- **@solana/web3.js** — Solana RPC
- **Zustand** — onboarding state persisted to localStorage
- **Bags.fm API** — token data, trending, trade quotes
- **Talent Protocol API** — builder identity verification
- **ChainGPT API** — AI risk assessment

---

## File Structure

```
app/
  page.tsx                  ← onboarding gate
  explore/page.tsx          ← search + trending
  token/[mint]/page.tsx     ← trade + trust detail
  api/
    tokens/{search,trending,[mint]}/route.ts
    trust/[wallet]/route.ts
    risk/[mint]/route.ts
    quote/route.ts
components/
  onboarding/OnboardingShell.tsx
  Navbar, TokenCard, TrustBadge, TrustCard
  TradePanel, AiRiskBrief, PriceChart
  ConfirmModal, SkeletonCard, WalletProviders
lib/
  bags.ts, talent.ts, chaingpt.ts, trust.ts, format.ts
hooks/
  useTokenData.ts, useTrustScore.ts, useTradeQuote.ts
store/
  onboarding.ts             ← zustand persist
```

---

## Hackathon

Built for the **Bags x Talent Protocol x ChainGPT** hackathon.
Buildry brings identity verification to the point of trade on Solana.
