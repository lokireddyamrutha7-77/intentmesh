// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../types/ProtocolTypes.sol";

interface IVerificationAdapter {
    function verifyProof(bytes32 intentHash, ProtocolTypes.VerificationProof calldata proof) external returns (bool);

    function getVerificationStatus(bytes32 intentHash) external view returns (ProtocolTypes.VerificationStatus);

    function isProofConsumed(bytes32 proofHash) external view returns (bool);
}
