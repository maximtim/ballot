//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Ballot {
    uint constant PAYMENT = 0.1 ether; 
    uint constant COMMISSION_PERCENT = 10;
    uint constant DURATION = 3 days;

    struct Voting {
        mapping (address => bool) voted;
        mapping (address => uint) scoredVotes;
        address payable[] candidates;
        bool created;
        bool closed;
        uint endTime;
        uint bank;
        address payable winner;
    }

    mapping (string => Voting) votings;
    string[] votingNames;
    mapping (address => uint) pendingTxs;

    address payable public owner;

    ////////////////////////////////////////////////////////////////////

    modifier costs(uint _amount) {
        require(msg.value >= _amount, 'Not enough ETH sent');
        _;
        if (msg.value > _amount)
            payable(msg.sender).transfer(msg.value - _amount);
    }

    ////////////////////////////////////////////////////////////////////

    constructor () {
        owner = payable(msg.sender);
    }

    function createVoting(string memory votingName, address payable[] memory candidates_) public {
        require(msg.sender == owner, "Only owner can create voting");
        require(candidates_.length > 0, 'Must be more than 0 candidates');

        Voting storage voting = votings[votingName];
        require(voting.created == false, 'Voting already exists');

        for (uint i = 0; i < candidates_.length; i++) {
            // this is also "candidate flag"
            // user is candidate only if scoredVotes > 0
            // number of real votes then = (scoredVotes-1)
            voting.scoredVotes[candidates_[i]] ++;
        }

        voting.candidates = candidates_;
        voting.endTime = block.timestamp + DURATION;
        voting.created = true;

        votingNames.push(votingName);
    }

    function vote(string memory votingName, address candidate_) 
        public 
        payable
        costs(PAYMENT)
    {
        Voting storage voting = votings[votingName];
        require(voting.created, 'Voting not found');
        require(voting.closed == false, 'Voting already closed');

        uint scoredVotes = voting.scoredVotes[candidate_];
        require(voting.voted[msg.sender] == false, 'Sender already voted');
        require(scoredVotes > 0, 'Receiver is not candidate');

        voting.voted[msg.sender] = true;
        voting.scoredVotes[candidate_] ++;
        voting.bank += PAYMENT;

        if ((scoredVotes+1) > voting.scoredVotes[voting.winner]) {
            voting.winner = payable(candidate_);
        }
    }

    function closeVoting(string memory votingName) 
        public
    {
        Voting storage voting = votings[votingName];
        require(voting.created, 'Voting not found');
        require(voting.closed == false, 'Voting already closed');

        require(block.timestamp > voting.endTime, 'Required time has not passed yet (3 days)');

        voting.closed = true;

        uint bank = voting.bank;
        if (bank > 0) {
            uint commission = bank * COMMISSION_PERCENT/100;
            pendingTxs[owner] += commission;
            pendingTxs[voting.winner] += bank - commission;
        }
    }

    function withdraw() public {
        uint amount = pendingTxs[msg.sender];
        require(amount > 0, 'Nothing to withdraw');
        
        pendingTxs[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    //////////////////////////////////////////////////////////////////////

    function getVotingsNames() public view returns (string[] memory) {
        return votingNames;
    }

    function getVotingUserInfo(string memory votingName, address user_) public view returns (bool voted, bool isCandidate, uint scoredVotes) {
        Voting storage voting = votings[votingName];
        require(voting.created, 'Voting doesnt exist');
        uint votes = voting.scoredVotes[user_];
        return (voting.voted[user_], votes > 0, (votes > 0 ? votes - 1 : 0));
    }

    function getVotingSummary(string memory votingName) public view returns (
        bool created,
        bool closed,
        uint endTime,
        uint bank,
        address payable winner,
        address payable[] memory candidates) {
        Voting storage voting = votings[votingName];
        require(voting.created, 'Voting doesnt exist');
        return (voting.created, voting.closed, voting.endTime, voting.bank, voting.winner, voting.candidates);
    }

    function getBalance(address user) public view returns (uint amount) {
        return pendingTxs[user];
    }
}