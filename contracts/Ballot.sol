//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Ballot {

    struct User {
        bool voted;

        bool isCandidate;
        uint scoredVotes;
    }

    mapping (address => User) users;
    address payable[] candidates;
    bool public closed;
    uint public endTime;
    uint public bank;
    mapping (address => uint) pendingTxs;

    address payable public owner;
    address payable public winner;

    ////////////////////////////////////////////////////////////////////

    modifier costs(uint _amount) {
        require(msg.value >= _amount, 'Not enough ETH sent');
        _;
        if (msg.value > _amount)
            payable(msg.sender).transfer(msg.value - _amount);
    }

    modifier onlyIfOpened {
        require(closed == false, 'Ballot closed already');
        _;
    }

    ////////////////////////////////////////////////////////////////////

    constructor(address payable[] memory candidates_) {
        require(candidates_.length > 0, 'Must be more than 0 candidates');
        owner = payable(msg.sender);

        for (uint i = 0; i < candidates_.length; i++) {
            users[candidates_[i]].isCandidate = true;
        }

        candidates = candidates_;
        endTime = block.timestamp + 3 days;
    }

    function vote(address candidate_) 
        public 
        payable 
        onlyIfOpened
        costs(0.1 ether)
    {
        User storage sender = users[msg.sender];
        User storage candidate = users[candidate_];
        require(sender.voted == false, 'Sender already voted');
        require(candidate.isCandidate == true, 'Receiver is not candidate');

        sender.voted = true;
        candidate.scoredVotes ++;

        bank += 0.1 ether;
    }

    function closeBallot() 
        public 
        onlyIfOpened
    {
        require(block.timestamp > endTime, 'Required time has not passed yet (3 days)');

        closed = true;
        uint maxVotes = 0;

        for (uint i = 0; i < candidates.length; i++) {
            address payable current = candidates[i];
            uint scoredVotes = users[current].scoredVotes;
            if (scoredVotes > maxVotes) {
                winner = current;
                maxVotes = scoredVotes;
            }
        }

        uint commission = bank*1/10;
        pendingTxs[owner] += commission;
        pendingTxs[winner] += bank - commission;
    }

    function withdraw() public {
        require(closed, 'Ballot must be closed');

        uint amount = pendingTxs[msg.sender];
        require(amount > 0, 'Nothing to withdraw');
        
        pendingTxs[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    //////////////////////////////////////////////////////////////////////

    function getCandidates() public view returns (address payable[] memory) {
        return candidates;
    }

    function getUser(address user_) public view returns (bool voted, bool isCandidate, uint scoredVotes) {
        User storage user = users[user_];
        return (user.voted, user.isCandidate, user.scoredVotes);
    }
}