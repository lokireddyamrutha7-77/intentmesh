import assert from "node:assert";
import { describe, it } from "node:test";
import {
  EligibilityReason,
  Intent,
  SolverCapabilities,
  SolverProfile,
} from "@intentmesh/protocol-types";
import { evaluateEligibility, ISolverContractAdapter, SolverClient, SolverSdkConfig } from "../src";

class MockContractAdapter implements ISolverContractAdapter {
  public registeredSolvers = new Map<string, SolverProfile>();
  public capabilitiesMap = new Map<string, SolverCapabilities>();

  async registerSolver(metadataURI: string) {
    const solver = "0x2222222222222222222222222222222222222222";
    const profile: SolverProfile = {
      solver,
      isActive: true,
      registeredAt: 1000n,
      metadataURI,
    };
    this.registeredSolvers.set(solver, profile);
    return { transactionHash: "0xhash1", success: true };
  }

  async setSolverStatus(isActive: boolean) {
    const solver = "0x2222222222222222222222222222222222222222";
    const p = this.registeredSolvers.get(solver);
    if (p) p.isActive = isActive;
    return { transactionHash: "0xhash2", success: true };
  }

  async addChainCapability(chainId: bigint) {
    return { transactionHash: "0xhash3", success: true };
  }

  async removeChainCapability(chainId: bigint) {
    return { transactionHash: "0xhash4", success: true };
  }

  async addTokenCapability(chainId: bigint, token: string) {
    return { transactionHash: "0xhash5", success: true };
  }

  async removeTokenCapability(chainId: bigint, token: string) {
    return { transactionHash: "0xhash6", success: true };
  }

  async depositBond(amountWei: bigint) {
    return { transactionHash: "0xhash7", success: true };
  }

  async getSolverProfile(solver: string): Promise<SolverProfile> {
    return (
      this.registeredSolvers.get(solver) || {
        solver,
        isActive: true,
        registeredAt: 1000n,
        metadataURI: "ipfs://mock",
      }
    );
  }

  async getCapabilities(solver: string): Promise<SolverCapabilities> {
    return (
      this.capabilitiesMap.get(solver) || {
        solver,
        supportedChains: [1n, 10n],
        supportedTokens: {
          "1": ["0xusdc1"],
          "10": ["0xusdc10", "0xweth10"],
        },
      }
    );
  }

  async getBond(solver: string) {
    return { solver, totalBond: 5000n, lockedBond: 1000n, availableBond: 4000n };
  }

  async getCapacity(solver: string, chainId: bigint, token: string) {
    return {
      solver,
      chainId,
      token,
      declaredCapacity: 10000n,
      reservedCapacity: 2000n,
      availableCapacity: 8000n,
    };
  }
}

describe("Solver SDK & Eligibility Evaluator Tests", () => {
  const config: SolverSdkConfig = {
    chainId: 1n,
    solverRegistryAddress: "0x1111111111111111111111111111111111111111",
    solverBondManagerAddress: "0x2222222222222222222222222222222222222222",
    capacityRegistryAddress: "0x3333333333333333333333333333333333333333",
  };

  const sampleIntent: Intent = {
    intentHash: "0xintenthash1",
    user: "0xuser1",
    sourceChainId: 1n,
    sourceToken: "0xusdc1",
    sourceAmount: 1000n,
    destinationChainId: 10n,
    destinationToken: "0xusdc10",
    recipient: "0xrecipient1",
    minOutputAmount: 950n,
    deadline: 5000n,
    nonce: 0n,
    verificationPolicy: "0xpolicy1",
    createdAt: 1000n,
  };

  const activeProfile: SolverProfile = {
    solver: "0xsolver1",
    isActive: true,
    registeredAt: 1000n,
    metadataURI: "ipfs://solver1",
  };

  const activeCapabilities: SolverCapabilities = {
    solver: "0xsolver1",
    supportedChains: [1n, 10n],
    supportedTokens: {
      "1": ["0xusdc1"],
      "10": ["0xusdc10"],
    },
  };

  it("should evaluate eligible intent correctly", () => {
    const result = evaluateEligibility(sampleIntent, activeProfile, activeCapabilities, 2000n);
    assert.strictEqual(result.eligible, true);
    assert.deepStrictEqual(result.reasons, [EligibilityReason.ELIGIBLE]);
  });

  it("should detect inactive solver", () => {
    const inactiveProfile = { ...activeProfile, isActive: false };
    const result = evaluateEligibility(sampleIntent, inactiveProfile, activeCapabilities, 2000n);
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reasons.includes(EligibilityReason.SOLVER_INACTIVE));
  });

  it("should detect unsupported source chain", () => {
    const limitedCapabilities: SolverCapabilities = {
      solver: "0xsolver1",
      supportedChains: [10n], // Missing chain 1
      supportedTokens: { "10": ["0xusdc10"] },
    };
    const result = evaluateEligibility(sampleIntent, activeProfile, limitedCapabilities, 2000n);
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reasons.includes(EligibilityReason.SOURCE_CHAIN_UNSUPPORTED));
  });

  it("should detect unsupported destination token", () => {
    const limitedCapabilities: SolverCapabilities = {
      solver: "0xsolver1",
      supportedChains: [1n, 10n],
      supportedTokens: {
        "1": ["0xusdc1"],
        "10": ["0xweth10"], // Missing 0xusdc10
      },
    };
    const result = evaluateEligibility(sampleIntent, activeProfile, limitedCapabilities, 2000n);
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reasons.includes(EligibilityReason.DESTINATION_TOKEN_UNSUPPORTED));
  });

  it("should detect expired intent", () => {
    const result = evaluateEligibility(sampleIntent, activeProfile, activeCapabilities, 6000n); // 6000 > deadline 5000
    assert.strictEqual(result.eligible, false);
    assert.ok(result.reasons.includes(EligibilityReason.EXPIRED_INTENT));
  });

  it("should instantiate SolverClient with injected adapter", async () => {
    const adapter = new MockContractAdapter();
    const client = new SolverClient(config, adapter);

    assert.strictEqual(client.getConfig().chainId, 1n);

    const regResult = await client.registerSolver("ipfs://mysolver");
    assert.strictEqual(regResult.success, true);

    const profile = await client.getSolverProfile("0x2222222222222222222222222222222222222222");
    assert.strictEqual(profile.metadataURI, "ipfs://mysolver");
  });

  it("should fail instantiation when config or adapter missing", () => {
    const adapter = new MockContractAdapter();
    assert.throws(() => new SolverClient({ ...config, solverRegistryAddress: "" }, adapter));
    assert.throws(() => new SolverClient(config, null as any));
  });
});
