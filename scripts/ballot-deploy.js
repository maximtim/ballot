const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  var argv = require('minimist')(process.argv.slice(2));
  console.log(argv);

  await hre.run('compile');
  await hre.run('ballot-create', { 
    sender: argv['owner'].toString(), 
    candidates: argv['candidates'].toString()
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
