# Ethernal Foundation

> Personal retirement fund management protocol built on Arbitrum and Polygon.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Ethernal Platform                    │
├──────────────┬──────────────────┬───────────────────────┤
│   Frontend   │   Faucet API     │   Contracts           │
│   (Vercel)   │   (Render)       │   (Blockchain)        │
│              │                  │                       │
│  React 19    │  FastAPI         │  Vyper 0.4.3          │
│  Vite 7      │  PostgreSQL      │  Arbitrum Sepolia     │
│  Wagmi v3    │  Redis           │  Polygon Amoy         │
│  TypeScript  │  Celery          │                       │
└──────────────┴──────────────────┴───────────────────────┘
                        │
              ┌─────────┴─────────┐
              │    Supabase DB    │
              │    Upstash Redis  │
              └───────────────────┘
```

---

## 📦 Monorepo Structure

```
Ethernal-Eternal/
├── Frontend/               # React DApp
├── contracts/              # Vyper smart contracts
└── mock-usdc/              # MockUSDC token + Faucet API
```

---

## 🔗 Smart Contracts (Vyper 0.4.3)

### Deployed — Arbitrum Sepolia

|         Contract    |                Address                       |
|---------------------|----------------------------------------------|
| DateTime            | `0x5BAF1093f814933A57fEc03369b096298b254ffc` |
| Treasury            | `0xaED0b89de18B03f1eAea92CA5e0dc6CFCD2E9A7b` |
| ProtocolRegistry    | `0x639818C51fb56827fAc0a446c886F8fAa11f86d1` |
| Token (stub)        | `0x3a7253e65efF8624C77848A2A49B1966C682BD82` |
| Governance (stub)   | `0xd311d1B9D13F70edF7af352A751A2786AD332AF5` |
| UserPreferences     | `0xd591be275DF02Fd49685A9aEEf89C5a6dCF49D25` |
| PersonalFund        | `0x92A9454c3Db04C73ADdae8029023Ab47782a29Cb` |
| PersonalFundFactory | `0x50bcc3E1583F8fc7D00d7050a3Bc2E3035fD5495` |
| MockUSDC            | `0x6e1371974D923397ecE9eE7525ac50ad7087c77f` |

### Contract Architecture

```
PersonalFundFactory
    └── deploys → PersonalFund (per user)
                      └── pays fees → Treasury
                                          └── admin approval → Early Retirement

ProtocolRegistry  ← global config
UserPreferences   ← per-user settings
DateTime          ← library for date calculations
Token             ← stub (future token implementation)
Governance        ← stub (not used, Ethernal LLC is not a DAO)
```

### Deploy

```bash
cd contracts

# Install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Deploy to testnet
python3 scripts/deploy.py arbitrum-sepolia
python3 scripts/deploy.py polygon-amoy

# Verify contracts
python3 scripts/verify.py arbitrum-sepolia
```

### Networks

|      Network     |   Chain ID  |         Explorer             |
|------------------|-------------|------------------------------|
| Arbitrum Sepolia | 421614      | https://sepolia.arbiscan.io  |
| Polygon Amoy     | 80002       | https://amoy.polygonscan.com |
| Arbitrum One     | 42161       | https://arbiscan.io          |
| Polygon          | 137         | https://polygonscan.com      |

---

## 🚰 MockUSDC Faucet API (FastAPI)

Production-ready API for testnet USDC distribution.

### Stack

|     Service    |        Provider       |       Purpose       |
|----------------|-----------------------|---------------------|
| API            | FastAPI + Gunicorn    | Web server          |
| Database       | PostgreSQL (Supabase) | Transaction history |
| Cache          | Redis (Upstash)       | Rate limiting       |
| Queue          | Celery                | Background jobs     |
| Monitoring     | Sentry                | Error tracking      |
| Deployment     | Render                | Hosting             |

### Endpoints

```
GET  /                 → API info
GET  /health           → Health check
POST /faucet           → Request USDC tokens
GET  /balance/:address → Check balance
GET  /stats            → Public statistics
GET  /admin/stats      → Admin statistics (API key required)
```

### Rate Limits

- **Per IP:** 1 request / hour
- **Per wallet:** 1 request / 24 hours
- Backed by Redis — persists across restarts

### Setup

```bash
cd mock-usdc

# Install
pip install -r requirements-production.txt

# Configure
cp .env.example .env
# Edit .env with your keys

# Initialize database
alembic upgrade head

# Run locally
uvicorn api.main:app --reload --port 8000

# Run Celery worker
celery -A api.tasks.celery_app worker -l info
```

### Environment Variables

```bash
# Blockchain
NETWORK_NAME=Arbitrum Sepolia
CHAIN_ID=421614
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
CONTRACT_ADDRESS=0x6e1371974D923397ecE9eE7525ac50ad7087c77f
FAUCET_ADDRESS=0x...
FAUCET_PRIVATE_KEY=0x...

# Services
DATABASE_URL=postgresql://...    # Supabase
REDIS_URL=redis://...            # Upstash
SENTRY_DSN=https://...           # Sentry

# Security
ADMIN_API_KEY=your-secret-key
FAUCET_AMOUNT=100
```

### Deploy to Render

```bash
git push origin main
# Render auto-deploys via render.yaml
```

---

## 🖥️ Frontend (React DApp)

### Stack

|    Technology   | Version |       Purpose     |
|-----------------|---------|-------------------|
| React           | 19.2.0  | UI Framework      |
| Vite            | 7.3.1   | Build tool        |
| TypeScript      | 5.9     | Type safety       |
| Tailwind CSS    | 4       | Styling           |
| Wagmi           | 3.4.4   | Web3 hooks        |
| Viem            | 2.46.1  | TypeScript Web3   |
| Reown AppKit    | 1.8.18  | Wallet connection |
| Zustand         | 5.0.11  | State management  |
| TanStack Query  | 5.90.21 | Data fetching     |
| React Router    | 7.13.0  | Routing           |
| React Hook Form | 7.71.1  | Forms             |
| Zod             | 4.3.6   | Validation        |
| Sentry          | 10      | Error tracking    |

### Setup

```bash
cd Frontend

# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your keys

# Run
pnpm dev         # http://localhost:3000
pnpm build       # Production build
pnpm preview     # Preview build
pnpm test        # Run tests
pnpm lint        # Lint code
```

### Environment Variables

```bash
VITE_API_URL=http://localhost:8000
VITE_CHAIN_ID=421614
VITE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_USDC_ADDRESS=0x6e1371974D923397ecE9eE7525ac50ad7087c77f
VITE_REOWN_PROJECT_ID=your_project_id_here
VITE_SENTRY_DSN=
```

### Deploy to Vercel

```bash
# Connect GitHub repo to Vercel
# Add environment variables in Vercel dashboard
# Auto-deploys on push to main
```

---

## 🔑 External Services

|  Service   |        Purpose      |              URL            |
|------------|---------------------|-----------------------------|
| Supabase   | PostgreSQL database | https://supabase.com        |
| Upstash    | Redis cache         | https://upstash.com         |
| Render     | API hosting         | https://render.com          |
| Vercel     | Frontend hosting    | https://vercel.com          |
| Sentry     | Error tracking      | https://sentry.io           |
| Arbiscan   | Contract explorer   | https://sepolia.arbiscan.io |
| Reown      | Wallet connection   | https://reown.com           |
| Cloudflare | Turnstile anti-bot  | https://cloudflare.com      |

---

## 💰 Infrastructure Cost

|  Service |   Free Tier    |    Paid    |
|----------|----------------|------------|
| Render   | ✅ 750h/month  | $7/month   |
| Supabase | ✅ 500MB       | $25/month  |
| Upstash  | ✅ 10k req/day | $0.2/100k  |
| Vercel   | ✅ Unlimited   | $20/month  |
| Sentry   | ✅ 5k events   | $26/month  |

**Total testnet: $0/month**
**Total production: ~$25-80/month**

---

## 🔐 Security Notes

- `FAUCET_PRIVATE_KEY` — hot wallet, fund only with minimum needed
- `ADMIN_API_KEY` — protect admin endpoints, rotate periodically
- `FAUCET_PRIVATE_KEY` ≠ `DEPLOYER_PRIVATE_KEY` — use separate wallets
- Never commit `.env` files
- Rate limiting is Redis-backed and survives restarts

---

## 📋 Development Checklist

### Testnet
- [x] MockUSDC deployed and verified (Arbitrum Sepolia)
- [x] All contracts deployed (Arbitrum Sepolia)
- [x] All contracts verified (manual via Arbiscan)
- [ ] All contracts deployed (Polygon Amoy)
- [ ] Faucet API deployed (Render)
- [ ] Frontend deployed (Vercel)
- [ ] End-to-end testing

### Production
- [ ] Contracts deployed (Arbitrum One)
- [ ] Contracts deployed (Polygon)
- [ ] Security audit
- [ ] Frontend production build
- [ ] Monitoring configured (Sentry)
- [ ] Domain configured

---

## 📄 License

Copyright (c) 2025 Ethernal Foundation — All rights reserved.

