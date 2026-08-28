import {
  EligibilityResult,
  Intent,
  SolverBond,
  SolverCapabilities,
  SolverCapacity,
  SolverProfile,
} from "@intentmesh/protocol-types";
import { evaluateEligibility } from "./eligibility";
import { ISolverContractAdapter, SolverSdkConfig, TransactionResult } from "./types";

/**
 * Strongly typed SolverClient abstraction for solver developers.
 * Interacts with protocol smart contracts via injected provider/signer adapter.
 * Contains zero embedded private keys, hardcoded wallets, or hardcoded production RPC endpoints.
 */
export class SolverClient {
  private readonly config: SolverSdkConfig;
  private readonly adapter: ISolverContractAdapter;

  constructor(config: SolverSdkConfig, adapter: ISolverContractAdapter) {
    if (!config.solverRegistryAddress) {
      throw new Error("solverRegistryAddress is required in SolverSdkConfig");
    }
    if (!config.solverBondManagerAddress) {
      throw new Error("solverBondManagerAddress is required in SolverSdkConfig");
    }
    if (!config.capacityRegistryAddress) {
      throw new Error("capacityRegistryAddress is required in SolverSdkConfig");
    }
    if (!adapter) {
      throw new Error("ISolverContractAdapter implementation must be injected");
    }

    this.config = config;
    this.adapter = adapter;
  }

  public getConfig(): SolverSdkConfig {
    return { ...this.config };
  }

  // --- Registration & Status ---

  public async registerSolver(metadataURI: string): Promise<TransactionResult> {
    if (!metadataURI || metadataURI.trim() === "") {
      throw new Error("metadataURI cannot be empty");
    }
    return this.adapter.registerSolver(metadataURI);
  }

  public async setSolverStatus(isActive: boolean): Promise<TransactionResult> {
    return this.adapter.setSolverStatus(isActive);
  }

  public async getSolverProfile(solver: string): Promise<SolverProfile> {
    if (!solver) throw new Error("solver address is required");
    return this.adapter.getSolverProfile(solver);
  }

  // --- Capability Management ---

  public async addChainCapability(chainId: bigint): Promise<TransactionResult> {
    if (chainId <= 0n) throw new Error("Invalid chainId");
    return this.adapter.addChainCapability(chainId);
  }

  public async removeChainCapability(chainId: bigint): Promise<TransactionResult> {
    if (chainId <= 0n) throw new Error("Invalid chainId");
    return this.adapter.removeChainCapability(chainId);
  }

  public async addTokenCapability(chainId: bigint, token: string): Promise<TransactionResult> {
    if (chainId <= 0n) throw new Error("Invalid chainId");
    if (!token) throw new Error("token address is required");
    return this.adapter.addTokenCapability(chainId, token);
  }

  public async removeTokenCapability(chainId: bigint, token: string): Promise<TransactionResult> {
    if (chainId <= 0n) throw new Error("Invalid chainId");
    if (!token) throw new Error("token address is required");
    return this.adapter.removeTokenCapability(chainId, token);
  }

  public async getCapabilities(solver: string): Promise<SolverCapabilities> {
    if (!solver) throw new Error("solver address is required");
    return this.adapter.getCapabilities(solver);
  }

  // --- Bond & Capacity ---

  public async depositBond(amountWei: bigint): Promise<TransactionResult> {
    if (amountWei <= 0n) throw new Error("amountWei must be positive");
    return this.adapter.depositBond(amountWei);
  }

  public async getBond(solver: string): Promise<SolverBond> {
    if (!solver) throw new Error("solver address is required");
    return this.adapter.getBond(solver);
  }

  public async getCapacity(solver: string, chainId: bigint, token: string): Promise<SolverCapacity> {
    if (!solver) throw new Error("solver address is required");
    return this.adapter.getCapacity(solver, chainId, token);
  }

  // --- Eligibility Check ---

  public async checkEligibility(intent: Intent, solver: string, currentTimestamp?: bigint): Promise<EligibilityResult> {
    const profile = await this.getSolverProfile(solver);
    const capabilities = await this.getCapabilities(solver);
    return evaluateEligibility(intent, profile, capabilities, currentTimestamp);
  }
}
