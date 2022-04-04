const { expect } = require("chai");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Ballot", function () {
  let ballot, owner, first, second, third;
  let title = "testVoting";
  let candidatesAddrs;

  beforeEach(async function () {
    [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    ballot = await Ballot.deploy();
    await ballot.deployed();
    candidatesAddrs = [ first.address, second.address ];
  });

  it("should deploy successfully", async function () {
    expect(ballot.address).to.be.properAddress;
  });

  describe("Ballot.createVoting", function () {
    it("should create new correct voting", async function () {
      const createTx = await ballot.connect(owner).createVoting(title, candidatesAddrs);
      const txRes = await createTx.wait();

      expect((await ballot.getVotingSummary(title)).created).to.be.true;
    });

    it("should revert on empty candidates", async function () {
      await expect(ballot.connect(owner).createVoting(title, []))
        .to.be.revertedWith('Must be more than 0 candidates');
    });

    it("should revert on non-owner caller", async function () {
      await expect(ballot.connect(first).createVoting(title, candidatesAddrs))
        .to.be.revertedWith('Only owner can create voting');
    });

    it("should revert on the same name", async function () {
      const createTx = await ballot.connect(owner).createVoting(title, candidatesAddrs);
      const txRes = await createTx.wait();

      await expect(ballot.connect(owner).createVoting(title, candidatesAddrs))
        .to.be.revertedWith('Voting already exists');
    });
  });

  describe("Ballot.vote", function () {
    beforeEach(async function () {
      const createTx = await ballot.connect(owner).createVoting(title, candidatesAddrs);
      const txRes = await createTx.wait();
    });

    it("should revert if voting not found", async function () {
      await expect(ballot.vote("bad", first.address, { value : parseEther("0.1") }))
        .to.be.revertedWith('Voting not found');
    });

    it("should revert if too small payment", async function () {
      await expect(ballot.vote(title, first.address, { value : parseEther("0.09") }))
        .to.be.revertedWith('Not enough ETH sent');
    });

    it("should revert if receiver is not candidate", async function () {
      await expect(ballot.vote(title, third.address, { value : parseEther("0.1") }))
        .to.be.revertedWith('Receiver is not candidate');
    });

    it("should make correct vote", async function () {
      // changeEtherBalance doesnt work in my project for some reason, so i calculate manually
      expect((await ballot.getVotingSummary(title)).bank).to.equal(0);

      const oldBalance = await owner.getBalance();

      const tx = await ballot.vote(title, first.address, { value : parseEther("0.5") });
      const txResult = await tx.wait();

      const newBalance = await owner.getBalance();

      const gasCost = txResult.gasUsed.mul(txResult.effectiveGasPrice);
      expect(oldBalance.sub(newBalance)).to.equal(parseEther("0.1").add(gasCost));

      expect((await ballot.getVotingSummary(title)).bank).to.equal(parseEther("0.1"));
    });

    it("should revert if already voted", async function () {
      const tx = await ballot.vote(title, first.address, { value : parseEther("0.5") });
      const txResult = await tx.wait();

      await expect(ballot.vote(title, first.address, { value : parseEther("0.5") }))
        .to.be.revertedWith('Sender already voted');
    });

    it("should revert if voting is already closed", async function () {
      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();

      await expect(ballot.vote(title, first.address, { value : parseEther("0.5") }))
        .to.be.revertedWith('Voting already closed');
    });

  });

  describe("Ballot.closeVoting", function () {
    beforeEach(async function () {
      const createTx = await ballot.connect(owner).createVoting(title, candidatesAddrs);
      const txRes = await createTx.wait();
    });

    it("should revert if time has not passed", async function () {
      await expect(ballot.closeVoting(title))
        .to.be.revertedWith('Required time has not passed yet (3 days)');
    });

    it("should revert if voting not found", async function () {
      await expect(ballot.closeVoting("bad"))
        .to.be.revertedWith('Voting not found');
    });

    it("should revert if already closed", async function () {
      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();

      await expect(ballot.closeVoting(title))
        .to.be.revertedWith('Voting already closed');
    });

    it("should success if time passed", async function () {
      const tx = await ballot.vote(title, first.address, { value : parseEther("0.5") });
      const txResult = await tx.wait();

      expect((await ballot.getVotingSummary(title)).winner).to.equal(ethers.constants.AddressZero);
      expect(await ballot.getBalance(owner.address)).to.equal(0);
      expect(await ballot.getBalance(first.address)).to.equal(0);
    
      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();

      expect((await ballot.getVotingSummary(title)).winner).to.equal(first.address);
      expect(await ballot.getBalance(owner.address)).to.equal(parseEther("0.01"));
      expect(await ballot.getBalance(first.address)).to.equal(parseEther("0.09"));
    });
  });

  describe("Ballot.withdraw", function () {
    beforeEach(async function () {
      const createTx = await ballot.connect(owner).createVoting(title, candidatesAddrs);
      const txRes = await createTx.wait();
    });

    it("should revert if sender has no money to withdraw", async function () {
      await expect(ballot.connect(owner).withdraw())
        .to.be.revertedWith('Nothing to withdraw');
    });

    it("should revert if sender has no money to withdraw (double spending)", async function () {
      const tx = await ballot.vote(title, first.address, { value : parseEther("0.5") });
      const txResult = await tx.wait();

      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();

      const winner = (await ballot.getVotingSummary(title)).winner;
      const winnerSigner = ethers.provider.getSigner(winner);
      const winnerTx = await ballot.connect(winnerSigner).withdraw();
      await winnerTx.wait();

      await expect(ballot.connect(winnerSigner).withdraw())
        .to.be.revertedWith('Nothing to withdraw');
    });

    it("should be successfull when all good", async function () {
      const summary = await ballot.getVotingSummary(title);
      await expect(summary.candidates)
            .to.contain(first.address)
            .and.contain(second.address);

      const voteTx = await ballot.connect(owner).vote(title, first.address, { value : parseEther("0.1") });
      await voteTx.wait();

      const voteTx2 = await ballot.connect(second).vote(title, first.address, { value : parseEther("0.1") });
      await voteTx2.wait();

      const voteTx3 = await ballot.connect(third).vote(title, second.address, { value : parseEther("0.15") });
      await voteTx3.wait();

      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();

      const winnerAddress = (await ballot.getVotingSummary(title)).winner;
      const winner = ethers.provider.getSigner(winnerAddress);
      expect(winnerAddress).to.equal(first.address);

      const [ voted, isCandidate, scoredVotes ] = await ballot.getVotingUserInfo(title, winnerAddress);
      expect(voted).to.be.false;
      expect(isCandidate).to.be.true;
      expect(scoredVotes).to.equal(2);

      const oldBalanceWinner = await winner.getBalance();
      const winnerTx = await ballot.connect(winner).withdraw();
      const winnerTxResult = await winnerTx.wait();
      const newBalanceWinner = await winner.getBalance();
      const gasCostWinner = winnerTxResult.gasUsed.mul(winnerTxResult.effectiveGasPrice);
      expect(newBalanceWinner.sub(oldBalanceWinner)).to.equal(parseEther("0.27").sub(gasCostWinner));

      const oldBalanceOwner = await owner.getBalance();
      const ownerTx = await ballot.connect(owner).withdraw();
      const ownerTxResult = await ownerTx.wait();
      const newBalanceOwner = await owner.getBalance();
      const gasCostOwner = ownerTxResult.gasUsed.mul(ownerTxResult.effectiveGasPrice);
      expect(newBalanceOwner.sub(oldBalanceOwner)).to.equal(parseEther("0.03").sub(gasCostOwner));
    });

    it("should handle multiple votings", async function () {
      const title2 = "test2";
      const createTx = await ballot.connect(owner).createVoting(title2, candidatesAddrs);
      const txRes = await createTx.wait();

      const title3 = "test3";
      const createTx3 = await ballot.connect(owner).createVoting(title3, candidatesAddrs);
      const txRes3 = await createTx3.wait();

      const votings = await ballot.getVotingsNames();
      expect(votings)
            .to.contain(title)
            .and.contain(title2)
            .and.contain(title3);

      const voteTx = await ballot.connect(owner).vote(title, first.address, { value : parseEther("0.1") });
      await voteTx.wait();

      const voteTx2 = await ballot.connect(second).vote(title, first.address, { value : parseEther("0.1") });
      await voteTx2.wait();

      const voteTx3 = await ballot.connect(third).vote(title2, second.address, { value : parseEther("0.15") });
      await voteTx3.wait();

      const voteTx4 = await ballot.connect(third).vote(title3, first.address, { value : parseEther("0.3") });
      await voteTx4.wait();

      await ethers.provider.send("evm_increaseTime", [86400 * 4]);
      const closeTx = await ballot.closeVoting(title);
      await closeTx.wait();
      const closeTx2 = await ballot.closeVoting(title2);
      await closeTx2.wait();
      const closeTx3 = await ballot.closeVoting(title3);
      await closeTx3.wait();

      await withdrawAndCheckBalance(first, "0.27");
      await withdrawAndCheckBalance(second, "0.09");
      await withdrawAndCheckBalance(owner, "0.04");
    });

    async function withdrawAndCheckBalance(sender, expectBalance){
      const oldBalanceSender = await sender.getBalance();
      const senderTx = await ballot.connect(sender).withdraw();
      const senderTxResult = await senderTx.wait();
      const newBalanceSender = await sender.getBalance();
      const gasCostSender = senderTxResult.gasUsed.mul(senderTxResult.effectiveGasPrice);
      expect(newBalanceSender.sub(oldBalanceSender)).to.equal(parseEther(expectBalance).sub(gasCostSender));
    }
  });

  describe("Ballot.getVotingUserInfo", function () {
    it("should revert if voting not found", async function () {
      await expect(ballot.connect(owner).getVotingUserInfo(title, first.address))
        .to.be.revertedWith('Voting doesnt exist');
    });
  });

  describe("Ballot.getVotingSummary", function () {
    it("should revert if voting not found", async function () {
      await expect(ballot.connect(owner).getVotingSummary(title))
        .to.be.revertedWith('Voting doesnt exist');
    });
  });
});
