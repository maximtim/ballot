const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  var argv = require('minimist')(process.argv.slice(2));

  await hre.run('compile');
  await hre.run('ballot-deploy', { 
    sender: argv['owner'].toString()
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
