//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Ballot {
    uint constant PAYMENT = 0.1 ether; 
    uint constant COMMISSION_PERCENT = 10;
    uint constant DURATION = 3 days;

    struct User {
        bool voted;

        bool isCandidate;
        uint scoredVotes;
    }

    struct Voting {
        mapping (address => User) users;
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
            voting.users[candidates_[i]].isCandidate = true;
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

        User storage sender = voting.users[msg.sender];
        User storage candidate = voting.users[candidate_];
        require(sender.voted == false, 'Sender already voted');
        require(candidate.isCandidate == true, 'Receiver is not candidate');

        sender.voted = true;
        candidate.scoredVotes ++;

        voting.bank += PAYMENT;
    }

    function closeVoting(string memory votingName) 
        public
    {
        Voting storage voting = votings[votingName];
        require(voting.created, 'Voting not found');
        require(voting.closed == false, 'Voting already closed');

        require(block.timestamp > voting.endTime, 'Required time has not passed yet (3 days)');

        voting.closed = true;
        uint maxVotes = 0;

        for (uint i = 0; i < voting.candidates.length; i++) {
            address payable current = voting.candidates[i];
            uint scoredVotes = voting.users[current].scoredVotes;
            if (scoredVotes > maxVotes) {
                voting.winner = current;
                maxVotes = scoredVotes;
            }
        }

        uint commission = voting.bank * COMMISSION_PERCENT/100;
        pendingTxs[owner] += commission;
        pendingTxs[voting.winner] += voting.bank - commission;
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
        require(votings[votingName].created, 'Voting doesnt exist');
        User storage user = votings[votingName].users[user_];
        return (user.voted, user.isCandidate, user.scoredVotes);
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