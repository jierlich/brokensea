const { formatEther } = require("@ethersproject/units")
const { expect } = require("chai")
const { ethers } = require("hardhat")
const BN = ethers.BigNumber.from

describe("ERC721FixedPricePurchase", async () => {

    beforeEach(async () => {
        this.signers = await ethers.getSigners()

        // Deploy listing contract. Owner is signer 9
        const ERC721FixedPricePurchaseContract = await ethers.getContractFactory("ERC721FixedPricePurchase", this.signers[9])
        this.ERC721FixedPricePurchase = await ERC721FixedPricePurchaseContract.deploy()
        await this.ERC721FixedPricePurchase.deployed()

        // Deploy mock contract. Owner is signer 10
        const MockERC721Contract = await ethers.getContractFactory("MockERC721", this.signers[10])
        this.MockERC721 = await MockERC721Contract.deploy("MockNFT", "MOCK",)
        await this.MockERC721.deployed()

        // Mint mock ERC721s
        this.MockERC721.mint(this.signers[0].address)
        this.MockERC721.mint(this.signers[1].address)
        this.MockERC721.mint(this.signers[2].address)
        this.MockERC721.mint(this.signers[3].address)
    })
    it("works in the normal case", async () => {
        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[1].address)
        const prevBal1 = await getBalance(this.signers[1])
        const prevBal2 = await getBalance(this.signers[2])

        const {
            approveTx,
            listTx,
            purchaseTx
        } = await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[2].address)

        const approveGasCost = await calculateGasCost(approveTx)
        const listGasCost = await calculateGasCost(listTx)
        const purchaseGasCost = await calculateGasCost(purchaseTx)
        const curBal1 = await getBalance(this.signers[1])
        const curBal2 = await getBalance(this.signers[2])
        expect(curBal1).to.equal(prevBal1.add(ethers.utils.parseEther("0.01")).sub(approveGasCost).sub(listGasCost))
        expect(curBal2).to.equal(prevBal2.sub(purchaseGasCost).sub(ethers.utils.parseEther("0.01")))
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

    it("blocks non-owner relist", async () => {
        await this.MockERC721
            .connect(this.signers[1])
            .approve(this.ERC721FixedPricePurchase.address, BN(1))
        await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("1"))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[2])
                .list(this.MockERC721.address, BN(1), ethers.utils.parseEther("0.1"))
        ).to.be.revertedWith("ERC721FixedPricePurchase: Only ERC721 owner can call this function")
    })

    it("correctly calculates collection fees", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .setCollectionFee(this.MockERC721.address, BN("1000"))
        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[1].address)
        const prevBal1 = await getBalance(this.signers[1])
        const prevBal2 = await getBalance(this.signers[2])

        const {
            approveTx,
            listTx,
            purchaseTx
        } = await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[2].address)

        const approveGasCost = await calculateGasCost(approveTx)
        const listGasCost = await calculateGasCost(listTx)
        const purchaseGasCost = await calculateGasCost(purchaseTx)
        const curBal1 = await getBalance(this.signers[1])
        const curBal2 = await getBalance(this.signers[2])

        const purchasePrice = ethers.utils.parseEther("0.01")
        const sellerRevenue = ethers.utils.parseEther("0.009")
        const collectionRevenue = ethers.utils.parseEther("0.001")
        expect(curBal1).to.equal(prevBal1.add(sellerRevenue).sub(approveGasCost).sub(listGasCost))
        expect(curBal2).to.equal(prevBal2.sub(purchaseGasCost).sub(purchasePrice))
        expect(
            await this.ERC721FixedPricePurchase.collectionFeesAccrued(this.MockERC721.address)
        ).to.equal(collectionRevenue)
    })

    it("correctly calculates protocol fees", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .setProtocolFee(BN("50"))
        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[1].address)
        const prevBal1 = await getBalance(this.signers[1])
        const prevBal2 = await getBalance(this.signers[2])

        const {
            approveTx,
            listTx,
            purchaseTx
        } = await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[2].address)

        const approveGasCost = await calculateGasCost(approveTx)
        const listGasCost = await calculateGasCost(listTx)
        const purchaseGasCost = await calculateGasCost(purchaseTx)
        const curBal1 = await getBalance(this.signers[1])
        const curBal2 = await getBalance(this.signers[2])

        const purchasePrice = ethers.utils.parseEther("0.01")
        const sellerRevenue = ethers.utils.parseEther("0.00995")
        const protocolRevenue = ethers.utils.parseEther("0.00005")
        expect(curBal1).to.equal(prevBal1.add(sellerRevenue).sub(approveGasCost).sub(listGasCost))
        expect(curBal2).to.equal(prevBal2.sub(purchaseGasCost).sub(purchasePrice))
        expect(
            await this.ERC721FixedPricePurchase.protocolFeesAccrued()
        ).to.equal(protocolRevenue)
    })

    it("correctly calculates both fees", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .setCollectionFee(this.MockERC721.address, BN("750"))

        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .setProtocolFee(BN("100"))
        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[1].address)
        const prevBal1 = await getBalance(this.signers[1])
        const prevBal2 = await getBalance(this.signers[2])

        const {
            approveTx,
            listTx,
            purchaseTx
        } = await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        expect(await this.MockERC721.ownerOf(BN(1))).to.equal(this.signers[2].address)

        const approveGasCost = await calculateGasCost(approveTx)
        const listGasCost = await calculateGasCost(listTx)
        const purchaseGasCost = await calculateGasCost(purchaseTx)
        const curBal1 = await getBalance(this.signers[1])
        const curBal2 = await getBalance(this.signers[2])

        const purchasePrice = ethers.utils.parseEther("0.01")
        const collectionRevenue = ethers.utils.parseEther("0.00075")
        const protocolRevenue = ethers.utils.parseEther("0.0001")
        const sellerRevenue = purchasePrice.sub(collectionRevenue).sub(protocolRevenue)

        expect(curBal1).to.equal(prevBal1.add(sellerRevenue).sub(approveGasCost).sub(listGasCost))
        expect(curBal2).to.equal(prevBal2.sub(purchaseGasCost).sub(purchasePrice))
        expect(
            await this.ERC721FixedPricePurchase.collectionFeesAccrued(this.MockERC721.address)
        ).to.equal(collectionRevenue)
        expect(
            await this.ERC721FixedPricePurchase.protocolFeesAccrued()
        ).to.equal(protocolRevenue)
    })

    it("only allows collection owners to change collection fees", async () => {
        expect(await this.ERC721FixedPricePurchase.collectionFee(this.MockERC721.address)).to.equal(0)
        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .setCollectionFee(this.MockERC721.address, BN("100"))
        expect(await this.ERC721FixedPricePurchase.collectionFee(this.MockERC721.address)).to.equal(BN("100"))

        await expect(
            this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .setCollectionFee(this.MockERC721.address, BN("50"))
        ).to.be.revertedWith("ERC721FixedPricePurchase: Only collection owner can call this function")

        expect(await this.ERC721FixedPricePurchase.collectionFee(this.MockERC721.address)).to.equal(BN("100"))
    })

    it("only allows protocol owner to change protocol fee", async () => {
        expect(await this.ERC721FixedPricePurchase.protocolFee()).to.equal(0)
        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .setProtocolFee(BN("100"))
        expect(await this.ERC721FixedPricePurchase.protocolFee()).to.equal(BN("100"))

        await expect(
            this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .setProtocolFee(BN("50"))
        ).to.be.revertedWith("Ownable: caller is not the owner")

        expect(await this.ERC721FixedPricePurchase.protocolFee()).to.equal(BN("100"))
    })

    it("ensures collection fees are withdrawn to collection owner", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .setCollectionFee(this.MockERC721.address, BN("750"))
        const collectionRevenue = ethers.utils.parseEther("0.00075")

        // Part A: Other-initiaited withdraw
        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        const balOwner0 = await getBalance(this.signers[10])
        const balOther0 = await getBalance(this.signers[1])

        const withdraw0Tx = await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .collectionWithdraw(this.MockERC721.address)
        const withdraw0GasCost = await calculateGasCost(withdraw0Tx)

        const balOwner1 = await getBalance(this.signers[10])
        const balOther1 = await getBalance(this.signers[1])
        expect(balOwner1).to.equal(balOwner0.add(collectionRevenue))
        expect(balOther1).to.equal(balOther0.sub(withdraw0GasCost))

        // Part B: Self initiated withdraw
        // Note: need to transfer ERC721 back for `simplePurchase` to work
        await this.MockERC721
            .connect(this.signers[2])
            .transferFrom(this.signers[2].address, this.signers[1].address, BN("1"))
        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        const withdraw1Tx = await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .collectionWithdraw(this.MockERC721.address)
        const withdraw1GasCost = await calculateGasCost(withdraw1Tx)

        const balOwner2 = await getBalance(this.signers[10])
        expect(balOwner2).to.equal(balOwner1.add(collectionRevenue).sub(withdraw1GasCost))
    })

    it("ensures protocol fees are withdrawn to protocol owner", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .setProtocolFee(BN("750"))
        const protocolRevenue = ethers.utils.parseEther("0.00075")

        // Part A: Other-initiaited withdraw
        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        const balOwner0 = await getBalance(this.signers[9])
        const balOther0 = await getBalance(this.signers[1])

        const withdraw0Tx = await this.ERC721FixedPricePurchase
            .connect(this.signers[1])
            .protocolWithdraw()
        const withdraw0GasCost = await calculateGasCost(withdraw0Tx)

        const balOwner1 = await getBalance(this.signers[9])
        const balOther1 = await getBalance(this.signers[1])
        expect(balOwner1).to.equal(balOwner0.add(protocolRevenue))
        expect(balOther1).to.equal(balOther0.sub(withdraw0GasCost))

        // Part B: Self initiated withdraw
        // Note: need to transfer ERC721 back for `simplePurchase` to work
        await this.MockERC721
            .connect(this.signers[2])
            .transferFrom(this.signers[2].address, this.signers[1].address, BN("1"))
        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        const withdraw1Tx = await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .protocolWithdraw()
        const withdraw1GasCost = await calculateGasCost(withdraw1Tx)

        const balOwner2 = await getBalance(this.signers[9])
        expect(balOwner2).to.equal(balOwner1.add(protocolRevenue).sub(withdraw1GasCost))
    })

    it("blocks collection withdrawal when no fees accrued", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .setCollectionFee(this.MockERC721.address, BN("750"))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[10])
                .collectionWithdraw(this.MockERC721.address)
        ).to.be.revertedWith("ERC721FixedPricePurchase: No funds to withdraw for this collection")

        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        await this.ERC721FixedPricePurchase
            .connect(this.signers[10])
            .collectionWithdraw(this.MockERC721.address)
        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[10])
                .collectionWithdraw(this.MockERC721.address)
        ).to.be.revertedWith("ERC721FixedPricePurchase: No funds to withdraw for this collection")
    })

    it("blocks protocol withdrawal when no fees accrued", async () => {
        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .setProtocolFee(BN("750"))

        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[9])
                .protocolWithdraw()
        ).to.be.revertedWith("ERC721FixedPricePurchase: No protocol funds to withdraw")

        await simplePurchase(this.signers, this.ERC721FixedPricePurchase, this.MockERC721)

        await this.ERC721FixedPricePurchase
            .connect(this.signers[9])
            .protocolWithdraw()
        await expect(
            this.ERC721FixedPricePurchase
                .connect(this.signers[9])
                .protocolWithdraw()
        ).to.be.revertedWith("ERC721FixedPricePurchase: No protocol funds to withdraw")
    })
})

// Condense logic for a commonly used purchase in one function call
async function simplePurchase(signers, ERC721FixedPricePurchase, MockERC721) {
    const approveTx = await MockERC721.connect(signers[1])
        .approve(ERC721FixedPricePurchase.address, BN(1))
    const listTx = await ERC721FixedPricePurchase.connect(signers[1])
        .list(MockERC721.address, BN(1), ethers.utils.parseEther("0.01"))

    const purchaseTx = await ERC721FixedPricePurchase.connect(signers[2])
        .purchase(
            MockERC721.address,
            BN(1),
            {value: ethers.utils.parseEther("0.01")}
        )
    return { approveTx, listTx, purchaseTx }
}

function getBalance(signer) {
    return ethers.provider.getBalance(signer.address)
}

// returns the amount spent in gas in a transaction as a BN
async function calculateGasCost(txObject) {
    const receipt = await txObject.wait()
    const gasUsed = receipt.gasUsed
    return gasUsed.mul(txObject.gasPrice)
}
