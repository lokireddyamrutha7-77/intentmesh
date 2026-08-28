import { ExecutionResult } from "@intentmesh/chain-adapters";
import { Intent, VerificationProof, VerificationStatus } from "@intentmesh/protocol-types";

export interface VerificationCheckResult {
  isValid: boolean;
  status: VerificationStatus;
  intentHash: string;
  proof: VerificationProof | null;
  checks: {
    intentHashMatch: boolean;
    destinationChainMatch: boolean;
    destinationTokenMatch: boolean;
    recipientMatch: boolean;
    minOutputSatisfied: boolean;
    transactionConfirmed: boolean;
    deadlineSatisfied: boolean;
  };
  failureReasons: string[];
}

export class DeterministicVerificationEngine {
  public verifyExecution(
    intent: Intent,
    executionResult: ExecutionResult,
    currentTimestampSeconds: number = Math.floor(Date.now() / 1000)
  ): VerificationCheckResult {
    const failureReasons: string[] = [];

    const intentHashMatch = executionResult.intentHash.toLowerCase() === intent.intentHash.toLowerCase();
    if (!intentHashMatch) failureReasons.push("INTENT_HASH_MISMATCH");

    const destinationChainMatch = executionResult.destinationChainId === intent.destinationChainId;
    if (!destinationChainMatch) failureReasons.push("DESTINATION_CHAIN_MISMATCH");

    const destinationTokenMatch = executionResult.destinationToken.toLowerCase() === intent.destinationToken.toLowerCase();
    if (!destinationTokenMatch) failureReasons.push("DESTINATION_TOKEN_MISMATCH");

    const recipientMatch = executionResult.recipient.toLowerCase() === intent.recipient.toLowerCase();
    if (!recipientMatch) failureReasons.push("RECIPIENT_MISMATCH");

    const minOutputSatisfied = executionResult.outputAmount >= intent.minOutputAmount;
    if (!minOutputSatisfied) failureReasons.push("INSUFFICIENT_OUTPUT_AMOUNT");

    const transactionConfirmed = executionResult.status === "CONFIRMED";
    if (!transactionConfirmed) failureReasons.push("TRANSACTION_NOT_CONFIRMED");

    const deadlineSatisfied = BigInt(executionResult.timestamp) <= intent.deadline;
    if (!deadlineSatisfied) failureReasons.push("EXPIRED_DEADLINE");

    const isValid =
      intentHashMatch &&
      destinationChainMatch &&
      destinationTokenMatch &&
      recipientMatch &&
      minOutputSatisfied &&
      transactionConfirmed &&
      deadlineSatisfied;

    const status: VerificationStatus = isValid
      ? VerificationStatus.VALID
      : VerificationStatus.INVALID;

    const proof: VerificationProof | null = isValid
      ? {
          intentHash: intent.intentHash,
          destinationChainId: intent.destinationChainId,
          destinationToken: intent.destinationToken,
          recipient: intent.recipient,
          deliveredAmount: executionResult.outputAmount,
          transactionHash: executionResult.transactionHash,
          blockNumber: BigInt(executionResult.blockNumber),
          blockTimestamp: BigInt(executionResult.timestamp),
          status,
        }
      : null;

    return {
      isValid,
      status,
      intentHash: intent.intentHash,
      proof,
      checks: {
        intentHashMatch,
        destinationChainMatch,
        destinationTokenMatch,
        recipientMatch,
        minOutputSatisfied,
        transactionConfirmed,
        deadlineSatisfied,
      },
      failureReasons,
    };
  }
}
