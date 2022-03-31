const hre = require("hardhat");

async function main() {
  await hre.run('compile');

  const [deployer, first, second] = await hre.ethers.getSigners();

  const Ballot = await hre.ethers.getContractFactory("Ballot", deployer);
  const ballot = await Ballot.deploy([ first.address, second.address ]);

  await ballot.deployed();

  console.log("Ballot deployed to:", ballot.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
