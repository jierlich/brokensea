require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
const environment = require('./env')

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {},
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${environment.alchemyAPIKey}`,
      accounts: [environment.deployerPK]
    }
  },
  etherscan: {
    apiKey: environment.etherscanAPIKey
  },
  solidity: {
    version: "0.8.4",
    optimizer: {
      enabled: true,
      runs: 1_000_000
    }
  }
};