// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Tournament {
    address public owner;

    struct PlayerScore {
        uint256 playerId;
        uint256 score;
    }

    mapping(uint256 => mapping(string => PlayerScore[])) public tournaments;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
    owner = newOwner;
}


    function submitScore(
        uint256 tournamentId,
        string calldata position,
        uint256 playerId,
        uint256 score
    ) external onlyOwner {
        tournaments[tournamentId][position].push(PlayerScore(playerId, score));
    }

    function getScores(
        uint256 tournamentId,
        string calldata position
    ) external view returns (PlayerScore[] memory) {
        return tournaments[tournamentId][position];
    }
}
