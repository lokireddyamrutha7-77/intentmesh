import { Intent } from "@intentmesh/protocol-types";

export function validateIntentSchema(intent: Partial<Intent>): boolean {
  if (!intent.user || intent.user === "0x0000000000000000000000000000000000000000") return false;
  if (!intent.sourceToken || intent.sourceToken === "0x0000000000000000000000000000000000000000") return false;
  if (!intent.destinationToken || intent.destinationToken === "0x0000000000000000000000000000000000000000") return false;
  if (!intent.recipient || intent.recipient === "0x0000000000000000000000000000000000000000") return false;
  if (!intent.sourceAmount || intent.sourceAmount <= 0n) return false;
  if (!intent.minOutputAmount || intent.minOutputAmount <= 0n) return false;
  if (!intent.sourceChainId || intent.sourceChainId <= 0n) return false;
  if (!intent.destinationChainId || intent.destinationChainId <= 0n) return false;
  return true;
}

export function computeCanonicalIntentHash(intent: Partial<Intent>): string {
  const payload = `${intent.user}:${intent.sourceChainId}:${intent.sourceToken}:${intent.sourceAmount}:${intent.destinationChainId}:${intent.destinationToken}:${intent.recipient}:${intent.minOutputAmount}:${intent.deadline}:${intent.nonce}:${intent.verificationPolicy}`;
  let hash = 0n;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash * 31n + BigInt(payload.charCodeAt(i))) % 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
  }
  return "0x" + hash.toString(16).padStart(64, "0");
}
