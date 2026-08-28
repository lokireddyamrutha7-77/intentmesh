import {
  EligibilityResult,
  Intent,
  SolverBond,
  SolverCapabilities,
  SolverCapacity,
  SolverProfile,
} from "@intentmesh/protocol-types";

export interface SolverSdkConfig {
  chainId: bigint;
  rpcUrl?: string;
  solverRegistryAddress: string;
  solverBondManagerAddress: string;
  capacityRegistryAddress: string;
}

export interface TransactionResult {
  transactionHash: string;
  success: boolean;
  blockNumber?: bigint;
}

/**
 * Interface contract adapter allowing typed provider/signer injection
 * for blockchain execution without hardcoding credentials or mock defaults.
 */
export interface ISolverContractAdapter {
  registerSolver(metadataURI: string): Promise<TransactionResult>;
  setSolverStatus(isActive: boolean): Promise<TransactionResult>;
  addChainCapability(chainId: bigint): Promise<TransactionResult>;
  removeChainCapability(chainId: bigint): Promise<TransactionResult>;
  addTokenCapability(chainId: bigint, token: string): Promise<TransactionResult>;
  removeTokenCapability(chainId: bigint, token: string): Promise<TransactionResult>;
  depositBond(amountWei: bigint): Promise<TransactionResult>;

  getSolverProfile(solver: string): Promise<SolverProfile>;
  getCapabilities(solver: string): Promise<SolverCapabilities>;
  getBond(solver: string): Promise<SolverBond>;
  getCapacity(solver: string, chainId: bigint, token: string): Promise<SolverCapacity>;
}
