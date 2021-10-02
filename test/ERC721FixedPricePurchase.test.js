const { formatEther } = require("@ethersproject/units")
const { expect } = require("chai")
const { ethers } = require("hardhat")
const BN = ethers.BigNumber.from

describe("ERC721FixedPricePurchase", async () => {

    beforeEach(async () => {
        this.signers = await ethers.getSigners()

        // Deploy listing contract
        const ERC721FixedPricePurchaseContract = await ethers.getContractFactory("ERC721FixedPricePurchase", this.signers[0])
        this.ERC721FixedPricePurchase = await ERC721FixedPricePurchaseContract.deploy()
        await this.ERC721FixedPricePurchase.deployed()

        // Deploy mock contract
        const MockERC721Contract = await ethers.getContractFactory("MockERC721", this.signers[0])
        this.MockERC721 = await MockERC721Contract.deploy("MockNFT", "MOCK",)
        await this.MockERC721.deployed()

        // Mint mock ERC721s
        this.MockERC721.mint(this.signers[0].address)
        this.MockERC721.mint(this.signers[1].address)
        this.MockERC721.mint(this.signers[2].address)
        this.MockERC721.mint(this.signers[3].address)
    })
    it("works in the normal case", async () => {
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0.01"))

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[1].address)

        const prevBal1 = await getBalance(this.signers[1])
        const prevBal2 = await getBalance(this.signers[2])
        const tx = await this.ERC721FixedPricePurchase
            .connect(this.signers[2])
            .purchase(
                this.MockERC721.address,
                BN(1),
                {value: ethers.utils.parseEther("0.01")}
            )

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[2].address)

        const gasCost = await calculateGasCost(tx)
        const curBal1 = await getBalance(this.signers[1])
        const curBal2 = await getBalance(this.signers[2])
        expect(curBal1).to.equal(prevBal1.add(ethers.utils.parseEther("0.01")))
        expect(curBal2).to.equal(prevBal2.sub(gasCost).sub(ethers.utils.parseEther("0.01")))
    })

    it("blocks the sale of unlisted nfts", async () => {
        // This test is specifically concerned with the case where the purchase contract is approved to transfer the
        // ERC721 before a listing price is registered
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: 0}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Token is not listed")
    })

    it("blocks the sale of recently sold nfts", async () => {
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))

        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0.01"))


        await this.ERC721FixedPricePurchase
            .connect(this.signers[2])
            .purchase(
                this.MockERC721.address,
                BN(1),
                {value: ethers.utils.parseEther("0.01")}
            )

        // Part A: immediately after sale
        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[3])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: ethers.utils.parseEther("0.01")}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Token is not listed")

        await this.MockERC721
            .connect(this.signers[2])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))

        // Part B: reapproved but not relisted
        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[3])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: ethers.utils.parseEther("0.01")}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Token is not listed")
    })

    it("blocks the sale of delisted nfts", async () => {
        // Part A: delisting by removing approval
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0.01"))
        await this.MockERC721
            .connect(this.signers[1])
            .approve(ethers.constants.AddressZero, BN(1))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: ethers.utils.parseEther("0.01")}
                )
        ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved")

        // Part B: delisting by setting price to 0
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0.01"))
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0"))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: 0}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Token is not listed")
    })

    it("blocks purchases that underpay", async () => {
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("1"))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: 0}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Buyer didn't send enough ether")

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .purchase(
                    this.MockERC721.address,
                    BN(1),
                    {value: ethers.utils.parseEther("0.05")}
                )
        ).to.be.revertedWith("ERC721FixedPricePurchase: Buyer didn't send enough ether")
    })

    it("blocks non-owner listing", async () => {
        await expect(this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(2), ethers.utils.parseEther("0.01"))
        ).to.be.revertedWith("ERC721FixedPricePurchase: Only ERC721 owner can call this function")
    })
})

function getBalance(signer) {
    return ethers.provider.getBalance(signer.address)
}

// returns the amount spent in gas in a transaction as a BN
async function calculateGasCost(txObject) {
    const receipt = await txObject.wait()
    const gasUsed = receipt.gasUsed
    return gasUsed.mul(txObject.gasPrice)
}
