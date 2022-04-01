require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("dotenv").config();
const { parseEther, formatEther } = require("ethers/lib/utils");


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address + " - " + formatEther(await account.getBalance()) + " ETH");
  }
});

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, { ethers }) => {
    const account = ethers.utils.getAddress(taskArgs.account);
    const balance = await ethers.provider.getBalance(account);

    console.log(formatEther(balance), "ETH");
  });

task("add-days", "Adds given number of days to next block timestamp")
  .addParam("days", "Days to add")
  .setAction(async ({ days }, { ethers }) => {
    await ethers.provider.send("evm_increaseTime", [86400 * days]);
    console.log("Done.");
  });

///////////////////////////////////////////////////////////////////////
//  

function parseAddressOrIndex(ethers, input) {
  if (ethers.utils.isAddress(input)) {
    return input;
  } else {
    return Number(input);
  }
}

task("ballot-create", "Create new ballot from Ballot contract.")
  .addParam("sender", "Creator's address (will be owner). All user addresses are addressOrIndex type")
  .addParam("candidates", "Candidates addresses (comma separated)")
  .setAction(async (
    {
      sender,
      candidates
    }, 
    { ethers }
  ) => {
    const ownerSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, sender));
    const candidatesPromises = candidates
      .split(",")
      .map(async (addr) => await ethers.provider
        .getSigner(parseAddressOrIndex(ethers, addr))
        .getAddress());
    
    const candidatesAddrs = await Promise.all(candidatesPromises);
    
    const Ballot = await ethers.getContractFactory("Ballot", ownerSigner);
    const ballot = await Ballot.deploy(candidatesAddrs);
    const txRes = await ((await ballot.deployed()).deployTransaction).wait();

    console.log("Owner: ", await ownerSigner.getAddress());
    const gasCost = txRes.gasUsed.mul(txRes.effectiveGasPrice);
    console.log("Gas cost: ", formatEther(gasCost), "ETH");
    console.log("Candidates: ", candidatesAddrs);
    console.log("Ballot deployed to: ", ballot.address);
  });

task("ballot-vote", "Vote for a candidate")
  .addParam("address", "Ballot contract's address")
  .addParam("sender", "Voter's address")
  .addParam("candidate", "The candidate's address")
  .addParam("payment", "Payment to vote in ETH (requires 0.1 ETH)")
  .setAction(async ({ address, sender, candidate, payment }, { ethers }) => {
    const ballot = await ethers.getContractAt("Ballot", address);
    
    const voterSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, sender));
    const candidateSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, candidate));

    const voteTx = await ballot
        .connect(voterSigner)
        .vote(await candidateSigner.getAddress(), { value : parseEther(payment) });
    const txRes = await voteTx.wait();

    console.log("Voter: ", await voterSigner.getAddress());
    console.log("Voted for candidate: ", await candidateSigner.getAddress());
    const gasCost = txRes.gasUsed.mul(txRes.effectiveGasPrice);
    console.log("Gas cost: ", formatEther(gasCost), "ETH");
  });

task("ballot-close", "Close ballot")
  .addParam("address", "Ballot contract's address")
  .addParam("sender", "Address of tx sender (who closes)")
  .setAction(async ({ address, sender }, { ethers }) => {
    const ballot = await ethers.getContractAt("Ballot", address);

    const senderSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, sender));

    const closeTx = await ballot
        .connect(senderSigner)
        .closeBallot();
    const txRes = await closeTx.wait();

    console.log("Sender: ", await senderSigner.getAddress());
    console.log("Winner: ", await ballot.winner());
    const gasCost = txRes.gasUsed.mul(txRes.effectiveGasPrice);
    console.log("Gas cost: ", formatEther(gasCost), "ETH");
  });

task("ballot-withdraw", "Withdraw money from contract")
  .addParam("address", "Ballot contract's address")
  .addParam("sender", "Address of tx sender (receives money)")
  .setAction(async ({ address, sender }, { ethers }) => {
    const ballot = await ethers.getContractAt("Ballot", address);

    const senderSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, sender));
    const oldBalance = await senderSigner.getBalance();

    const withdrawTx = await ballot
        .connect(senderSigner)
        .withdraw();
    const txRes = await withdrawTx.wait();

    const newBalance = await senderSigner.getBalance();
    
    console.log("Sender: ", await senderSigner.getAddress());
    const gasCost = txRes.gasUsed.mul(txRes.effectiveGasPrice);
    const received = newBalance.sub(oldBalance).add(gasCost);
    console.log("Gas cost: ", formatEther(gasCost), "ETH");
    console.log("Received: ", formatEther(received), "ETH");
  });

task("ballot-show", "Prints some of Ballot contract's properties")
  .addParam("address", "The contract's address")
  .setAction(async ({ address }, { ethers }) => {
    const contract = await ethers.getContractAt("Ballot", address);

    console.log("owner: ", await contract.owner(), "\n",
                "winner: ", await contract.winner(), "\n",
                "bank: ", formatEther(await contract.bank()), "ETH", "\n",
                "closed: ", await contract.closed(), "\n",
                "endTime: ", new Date((await contract.endTime()).toNumber() * 1000).toDateString(), "\n",
                "candidates: ", await contract.getCandidates(), "\n",
                "address: ", contract.address);
  });

task("ballot-get-user", "Prints ballot's user info")
  .addParam("address", "The contract's address")
  .addParam("user", "User's address")
  .setAction(async ({ address, user }, { ethers }) => {
    const ballot = await ethers.getContractAt("Ballot", address);

    const userSigner = ethers.provider.getSigner(parseAddressOrIndex(ethers, user));

    const [voted, isCandidate, scoredVotes] = await ballot.getUser(await userSigner.getAddress());
    console.log("voted:", voted, "\n",
                "isCandidate:", isCandidate, "\n",
                "scoredVotes:", scoredVotes.toNumber());
  });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: process.env.PROJECT_URL,
      accounts: JSON.parse(process.env.PRIVATE_KEYS_LIST),
      gas: 2100000,
      gasPrice: 8000000000
     },
   }
};
