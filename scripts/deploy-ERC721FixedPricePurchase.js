const { ethers } = require("hardhat");

async function main() {
    const contractName = "ERC721FixedPricePurchase"
    const [deployer] = await ethers.getSigners();
    console.log(`${contractName} is being deployed by ${deployer.address}`)

    const contractFactory = await ethers.getContractFactory(contractName)
    const contract = await contractFactory.deploy()

    console.log((await contract.deployTransaction.wait()).gasUsed.toString())

    console.log(`${contractName} address: `, contract.address)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })