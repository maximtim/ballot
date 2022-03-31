const { expect } = require("chai");
const { parseEther, formatEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Ballot", function () {
  it("ballot-create:0-candidates", async function () {
    const Ballot = await ethers.getContractFactory("Ballot");
    
    await expect(Ballot.deploy([]))
        .to.be.revertedWith('Must be more than 0 candidates');
  });

  it("ballot-create:success", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();
  });

  it("ballot-vote:closed", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await ethers.provider.send("evm_increaseTime", [86400 * 4]);
    const closeTx = await ballot.closeBallot();
    await closeTx.wait();

    await expect(ballot.vote(first.address, { value : parseEther("0.1") }))
        .to.be.revertedWith('Ballot closed already');
  });

  it("ballot-vote:not-ehough-money", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(ballot.vote(first.address, { value : parseEther("0.05") }))
        .to.be.revertedWith('Not enough ETH sent');
  });

  it("ballot-vote:already-voted", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    const voteTx = await ballot.vote(first.address, { value : parseEther("0.1") });
    await voteTx.wait();

    await expect(ballot.vote(first.address, { value : parseEther("0.1") }))
        .to.be.revertedWith('Sender already voted');
  });

  it("ballot-vote:is-not-candidate", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(ballot.vote(third.address, { value : parseEther("0.1") }))
        .to.be.revertedWith('Receiver is not candidate');
  });

  it("ballot-vote:success", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(await ballot.bank()).to.equal(0);

    const oldBalance = await owner.getBalance();

    const tx = await ballot.vote(first.address, { value : parseEther("0.5") });
    const txResult = await tx.wait();

    const newBalance = await owner.getBalance();

    const gasCost = txResult.gasUsed.mul(txResult.effectiveGasPrice);
    expect(oldBalance.sub(newBalance)).to.equal(parseEther("0.1").add(gasCost));

    await expect(await ballot.bank()).to.equal(parseEther("0.1"));
  });

  it("ballot-close:time-not-passed", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(ballot.closeBallot())
        .to.be.revertedWith('Required time has not passed yet (3 days)');
  });

  it("ballot-close:success", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(await ballot.winner()).to.equal(ethers.constants.AddressZero);
    
    await ethers.provider.send("evm_increaseTime", [86400 * 4]);
    const closeTx = await ballot.closeBallot();
    await closeTx.wait();

    await expect(await ballot.winner()).to.be.properAddress;
  });

  it("ballot-withdraw:not-closed", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(ballot.withdraw())
        .to.be.revertedWith('Ballot must be closed');
  });

  it("ballot-withdraw:no-money", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await ethers.provider.send("evm_increaseTime", [86400 * 4]);
    const closeTx = await ballot.closeBallot();
    await closeTx.wait();

    await expect(ballot.withdraw())
        .to.be.revertedWith('Nothing to withdraw');
  });

  it("ballot-withdraw:success(full-test)", async function () {
    const [ owner, first, second, third ] = await ethers.getSigners();
    const Ballot = await ethers.getContractFactory("Ballot", owner);
    const ballot = await Ballot.deploy([ first.address, second.address ]);
    await ballot.deployed();

    await expect(await ballot.getCandidates())
            .to.contain(first.address)
            .and.contain(second.address);

    const voteTx = await ballot.vote(first.address, { value : parseEther("0.1") });
    await voteTx.wait();

    const voteTx2 = await ballot.connect(second).vote(first.address, { value : parseEther("0.1") });
    await voteTx2.wait();

    const voteTx3 = await ballot.connect(third).vote(second.address, { value : parseEther("0.15") });
    await voteTx3.wait();

    await ethers.provider.send("evm_increaseTime", [86400 * 4]);
    const closeTx = await ballot.closeBallot();
    await closeTx.wait();

    const winnerAddress = await ballot.winner();
    const winner = ethers.provider.getSigner(winnerAddress);
    expect(winnerAddress).to.equal(first.address);

    const [ voted, isCandidate, scoredVotes ] = await ballot.getUser(winnerAddress);
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
});
