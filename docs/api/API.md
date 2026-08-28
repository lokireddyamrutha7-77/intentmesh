# IntentMesh Protocol — Backend Orchestration API Specification

This document defines the HTTP REST and SSE API endpoints exposed by `@intentmesh/api` (`apps/api/src/index.ts`).

---

## Authority & Security Boundaries

> [!IMPORTANT]
> The Backend API is an **off-chain orchestrator**. Smart contracts remain authoritative for financial state, token escrow custody, settlement authorization, refund authorization, capacity reservations, and bond locking. The API **NEVER** custodies user private keys or releases funds independently. AI advisory models have **ZERO** authorization authority.

---

## Environment Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP listening port |
| `SOURCE_CHAIN_ID` | `31337` | Local Anvil Source Chain ID |
| `DESTINATION_CHAIN_ID` | `31338` | Local Anvil Destination Chain ID |
| `SOURCE_CHAIN_RPC_URL` | `http://127.0.0.1:8545` | Local Source Chain RPC URL |
| `DESTINATION_CHAIN_RPC_URL` | `http://127.0.0.1:8546` | Local Destination Chain RPC URL |

---

## API Endpoints Reference

### 1. System Health
`GET /api/health` or `GET /health`

**Response (`200 OK`)**:
```json
{
  "status": "OK",
  "protocol": "IntentMesh Backend Orchestrator API",
  "version": "0.1.0",
  "sourceChainId": "31337",
  "destinationChainId": "31338",
  "anvilNodes": {
    "sourceConnected": true,
    "destinationConnected": true
  },
  "deployments": {
    "IntentRegistry": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "InputEscrow": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"
  },
  "timestamp": 1740000000000
}
```

---

### 2. Intent Management
`GET /api/intents`  
`GET /api/intents/:intentHash`  
`POST /api/intents`

**Create Intent Request (`POST /api/intents`)**:
```json
{
  "user": "0xuser_alice",
  "sourceChainId": "31337",
  "sourceToken": "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  "sourceAmount": "1000000000",
  "destinationChainId": "31338",
  "destinationToken": "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  "recipient": "0xrecipient_bob",
  "minOutputAmount": "950000000",
  "deadline": "1740003600"
}
```

**Response (`201 Created`)**:
```json
{
  "intentHash": "0xd97cd2cb44aafd01e104655d2548a9be0edba45235f657913ddb706bc6c394d4",
  "state": 3,
  "unsignedTx": {
    "target": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "function": "createAndFundIntent(...)",
    "params": [...]
  }
}
```

---

### 3. Solver & Discovery API
`GET /api/solvers`  
`GET /api/solvers/:solver`

---

### 4. Batch Auction API
`GET /api/auctions`  
`GET /api/auctions/:auctionId`  
`POST /api/auctions`

---

### 5. Risk Assessment API
`GET /api/risk/:solver`

**Response (`200 OK`)**:
```json
{
  "assessment": {
    "solver": "0xsolver_a_reliable",
    "riskScore": 92,
    "riskLevel": "LOW",
    "hardSafetyPass": true,
    "lookbackDays": 14,
    "sampleCount": 12,
    "evidenceSufficient": true,
    "hardFailures": []
  }
}
```

---

### 6. Executions & Failure Management
`GET /api/executions/:executionId`

---

### 7. Realtime Event Feed (SSE / JSON)
`GET /api/events` (Pass `Accept: text/event-stream` for live SSE stream)

---

### 8. Master Demo Orchestration
`POST /api/demo/golden-path`  
`POST /api/demo/failure-recovery`  
`POST /api/demo/refund`
