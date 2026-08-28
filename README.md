# IntentMesh ⚡
> **Decentralized Intent Solvers for Cross-Chain Swaps**  
> *CSI ORIGIN 2026 — Problem Statement 10: Decentralized Intent Solvers for Cross-Chain Swaps*

---

## 📌 Problem Statement Overview
In traditional cross-chain token swaps, users are forced to navigate complex bridge routes, manual liquidity pools, gas token management across multiple chains, and high slippage risks. Users don't want to manually pick a bridge, route, or relayer — they simply want to state an **outcome**:
> *"Swap 1.0 ETH on Ethereum for at least 1,000 USDC on Arbitrum by deadline Z under security policy Y."*

**IntentMesh** addresses this by establishing an open, competitive marketplace of independent solver bots that compete to fulfill user intents with their own capital.

---

## 🚀 What IntentMesh Does
IntentMesh decouples intent creation from execution and on-chain settlement:

1. **Broadcast Signed Intent**: Users sign an intent payload (specifying source chain/asset/amount, destination chain/asset, minimum output, deadline, recipient, and security verifier policy).
2. **Open Solver Competition**: Solvers (bots) discover the intent and submit competing bids (output amount, ETA, fee bps, route description).
3. **Multi-Factor Deterministic Scoring ($Q_s$)**: Bids are filtered through 6 eligibility gates and scored objectively—not just on best price, but on speed, solver reliability, capacity headroom, and staked security.
4. **Atomic Capacity & Bond Reservation**: The protocol reserves the winning solver's capacity and bond, preventing double-commits or overcommitments.
5. **Destination Execution**: The winning solver fulfills the intent on the destination chain using its own liquidity.
6. **Proof-Gated Settlement**: On-chain escrow funds are released **only when destination verification proof passes**. Payment depends strictly on cryptographic proof, never on a solver's claim.
7. **Objective Failure Recovery & Fallback Loop**: If a solver times out, partial fills, or submits a replayed proof, the protocol automatically slashes their bond, releases capacity, and re-routes the order to the next eligible runner-up solver.

---

## 🎯 Key Features Implemented

- 📝 **Create Intent Form**: Mock wallet connection (EIP-712 payload signing simulation), route selector, and signed verifier policy selection (`routine`, `elevated`, `strict`).
- 🏆 **Live Auction & Solver Scoreboard**: Real-time bidding view displaying Solvers A, B, and C with pass/fail eligibility gate badges, glowing `WIN` & `NEXT` tags, and expandable audit drawers showing raw vs. normalized sub-scores.
- 🔄 **7-Step Settlement Tracker**: Step-by-step visual lifecycle tracker (`Signed` → `Discover` → `Compete` → `Gate & Score` → `Reserve & Bond` → `Dest Fill` → `Verify & Settle`).
- ⚠️ **Forced-Failure Demo Controls**: Interactive triggers to test real protocol fault recovery:
  - `Inject Winner Timeout`: Slashes solver bond, releases capacity, and re-routes to fallback solver.
  - `Inject Partial / Wrong Fill`: Rejects settlement, preserves escrow, and falls back.
  - `Inject Replayed Proof`: Fails replay protection check, alerts, and falls back.
- 📊 **Capacity & Capital Dashboard**: Per-solver declared, reserved, pending, and available liquidity accounting with an interactive **"Test Overcommit Rejection"** button.
- 📜 **Protocol Event Feed**: Chronological log of on-chain events (`IntentCreated`, `BidsReceived`, `GatesEvaluated`, `SolverSelected`, `CapacityReserved`, `DestinationFilled`, `VerificationPassed`, `VerificationFailed`, `SettlementReleased`, `PenaltyApplied`, `FallbackTriggered`, `CapacityOvercommitRejected`) with mock transaction hashes and JSON payload inspection.
- ⚙️ **Admin Panel**: Live scoring formula weight sliders ($Q_s$) and solver reliability/bond fixture tuning.
- 📐 **Architecture Topology Page**: Component diagram showing on-chain control contracts vs off-chain execution mesh.

---

## 🧮 Multi-Factor Deterministic Quality Scoring ($Q_s$)

IntentMesh evaluates solver bids using a deterministic quality score ($Q_s$) normalized from 0 to 100:

$$Q_s = 0.30 \cdot \text{Value} + 0.15 \cdot \text{Speed} + 0.15 \cdot \text{Reliability} + 0.20 \cdot \text{Headroom} + 0.20 \cdot \text{Security} - 0.10 \cdot \text{RiskPenalty}$$

### Sub-Score Normalization
- **Value ($w_1 = 0.30$)**: Output amount relative to max bid in auction ($100 \cdot \text{output} / \text{maxOutput}$).
- **Speed ($w_2 = 0.15$)**: Inverse ratio relative to fastest solver ETA ($100 \cdot \text{minEta} / \text{eta}$).
- **Reliability ($w_3 = 0.15$)**: Historical solver completion rate ($0-100\%$).
- **Headroom ($w_4 = 0.20$)**: Available capacity ratio relative to required fill ($20 \cdot \text{available} / \text{output}$).
- **Security ($w_5 = 0.20$)**: Staked bond amount relative to $50,000 benchmark.
- **Risk Penalty ($w_6 = -0.10$)**: Active penalty deduction per active slashing flag.

---

## 🏗️ Architecture Overview

```
+---------------------------------------------------------------------------------------------------+
|                                      FRONTEND (Next.js 14 / App Router)                           |
|  - Landing Page     - Create Intent (Mock Wallet)   - Live Auction & Solver Scoreboard            |
|  - Settlement Track - Forced Failure Controls       - Capacity & Capital Dashboard                |
|  - Event Feed       - Admin / Settings Panel        - Architecture Diagram                        |
+---------------------------------------------------------------------------------------------------+
                                                  | API / Server Actions
+---------------------------------------------------------------------------------------------------+
|                                        SIMULATION BACKEND ENGINE                                   |
|  +-------------------------------------+   +--------------------------------------------------+   |
|  |           Scoring Engine            |   |             Eligibility Gates Engine             |   |
|  | Qs = 0.30 V + 0.15 S + 0.15 R +       |   | - Quote Expiry   - Min Output   - Available Cap |   |
|  |      0.20 H + 0.20 Sec - 0.10 Risk  |   | - Bond Check     - Verifier Policy - Penalty Check|   |
|  +-------------------------------------+   +--------------------------------------------------+   |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                           Simulated On-Chain Control Contracts                              |  |
|  | - IntentManager.ts      - SolverRegistry.ts     - BondManager.ts                            |  |
|  | - CapacityRegistry.ts   - SettlementVerifier.ts - EscrowManager.ts                          |  |
|  | - ProtocolEventBus.ts (Chronological on-chain event stream with tx hashes & raw payloads)   |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 💻 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Dark DeFi Glassmorphism Design System
- **Icons**: Lucide React (`lucide-react`)
- **Simulation Layer**: In-process TypeScript EVM contract simulation engine

---

## 📦 Project Folder Structure

```
MOSAIC-X/
├── app/
│   ├── admin/               # Admin panel (Scoring weight sliders & solver fixtures)
│   ├── api/                 # Next.js API routes (Intents, bids, step advances, forced failure, capacity)
│   ├── architecture/        # Architecture topology diagram page
│   ├── auction/             # Live auction scoreboard ([id] dynamic route)
│   ├── capacity/            # Capacity & capital dashboard + overcommit test
│   ├── create/              # Create intent form + EIP-712 signing modal
│   ├── events/              # Protocol event feed & JSON log inspector
│   ├── settlement/          # 7-Step settlement tracker & forced-failure demo controls
│   ├── globals.css          # Dark glassmorphism utility classes & grid background
│   ├── layout.tsx           # Main root layout with global Navbar
│   └── page.tsx             # Landing page
├── components/
│   └── Navbar.tsx           # Global header navigation & reset simulation button
├── lib/
│   ├── scoring/
│   │   └── ScoringEngine.ts # Deterministic quality score (Qs) & 6 eligibility gates
│   ├── simulation/
│   │   ├── CapacityRegistry.ts   # Available capacity accounting & overcommit rejection
│   │   ├── Engine.ts             # Protocol engine orchestrator & fallback loop
│   │   ├── EscrowManager.ts      # Source escrow lock & release
│   │   ├── EventBus.ts           # On-chain event emitter (tx hashes & block numbers)
│   │   ├── IntentManager.ts      # Intent state machine lifecycle
│   │   ├── SettlementVerifier.ts # 6-point verification checklist & replay protection
│   │   └── SolverRegistry.ts     # Solver profiles, bonds, & slashing logic
│   └── types.ts             # Domain interfaces (Intent, Solver, Bid, ProtocolEvent)
├── public/
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 🛠️ Setup & Local Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/lokireddyamrutha7-77/intentmesh.git
   cd intentmesh
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## ⚠️ Hackathon MVP Note
This project is a **live hackathon demonstration MVP**. The EVM contracts (`IntentManager`, `Escrow`, `CapacityRegistry`, `SettlementVerifier`) run as an in-process TypeScript simulation engine. No real blockchain transactions or real cryptocurrency funds are used. The backend architecture is structured so that each contract module can later be replaced with real EVM contract calls (ethers.js / viem / wagmi) without modifying the UI layer.

---

## 👥 Team & Hackathon Details

- **Hackathon**: CSI ORIGIN 2026
- **Problem Statement**: PS-10 (Decentralized Intent Solvers for Cross-Chain Swaps)
- **Team Name**: *[Insert Your Team Name]*
- **Team Members**: *[Insert Team Member Names]*
- **License**: MIT License
