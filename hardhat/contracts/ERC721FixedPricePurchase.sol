// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOwnable.sol";

/// @title A fixed price ERC721 Purchase Contract
/// @author jierlich
/// @notice Users can list NFTs, purchase listed NFTs, and delist NFTs
/// @notice Collection owners can set fees
/// @dev The collection owner fee is dependent on the existence of an `owner` function on the ERC721 contract
contract ERC721FixedPricePurchase is Ownable {
    /// @dev mapping from ERC721 address -> token id -> listing price
    mapping(address => mapping(uint => uint)) public listing;

    /// @dev mapping from collection owner to collection fee
    mapping(address => uint) public collectionFee;

    /// @dev mapping from collection owner to fees accrued
    mapping(address => uint) public collectionFeesAccrued;

    /// @dev fee for the protocol
    uint public protocolFee;

    /// @dev protocol fees accrued
    uint public protocolFeesAccrued;

    /// @dev used to calculate the basis point fee
    uint constant FEE_BASE = 10000;

    event Listed(address indexed erc721, uint indexed tokenId, address indexed owner, uint price);

    event Purchased(address indexed erc721, uint indexed tokenId, address indexed buyer);

    modifier onlyErc721Owner(address erc721, uint tokenId) {
        require(IERC721(erc721).ownerOf(tokenId) == msg.sender, "ERC721FixedPricePurchase: Only ERC721 owner can call this function");
        _;
    }

    modifier onlyCollectionOwner(address erc721) {
        require(IOwnable(erc721).owner() == msg.sender, "ERC721FixedPricePurchase: Only collection owner can call this function");
        _;
    }

    /// @notice list an ERC721 token for sale
    /// @dev the owner must approve the tokenId on the ERC721 in a separate transaction to fully list
    /// @dev delisting is done externally by revoking approval on the ERC721
    /// @param erc721 token contract
    /// @param tokenId id of the ERC721 token being listed
    /// @param price amount buyer must pay to purchase
    function list(address erc721, uint tokenId, uint price) onlyErc721Owner(erc721, tokenId) public {
        listing[erc721][tokenId] = price;
        emit Listed(erc721, tokenId, msg.sender, price);
    }

    /// @notice purchase an ERC721 token that is on sale
    /// @dev basis point fees are calculated using the fee base constant
    /// @param erc721 token contract
    /// @param tokenId id of the ERC721 token being listed
    function purchase(address erc721, uint tokenId) public payable {
        require(msg.value >= listing[erc721][tokenId], "ERC721FixedPricePurchase: Buyer didn't send enough ether");
        require(listing[erc721][tokenId] > 0, "ERC721FixedPricePurchase: Token is not listed");
        listing[erc721][tokenId] = 0;
        address from = IERC721(erc721).ownerOf(tokenId);

        uint collectionFeeAmount = msg.value * collectionFee[erc721] / FEE_BASE;
        uint protocolFeeAmount = msg.value * protocolFee / FEE_BASE;
        uint sellerFeeAmount = msg.value - protocolFeeAmount - collectionFeeAmount;

        collectionFeesAccrued[erc721] += collectionFeeAmount;
        protocolFeesAccrued += protocolFeeAmount;

        (bool sent,) = from.call{value: sellerFeeAmount}("");
        require(sent, "ERC721FixedPricePurchase: Failed to send Ether");

        IERC721(erc721).safeTransferFrom(from, msg.sender, tokenId);
        /// @dev price is set to 0 to protect future owners
        listing[erc721][tokenId] = 0;
        emit Purchased(erc721, tokenId, msg.sender);
    }

    /// @notice set the basis point fee of the collection owner
    /// @param erc721 token contract
    /// @param fee basis point amount of the transaction
    function setCollectionFee(address erc721, uint fee) onlyCollectionOwner(erc721) public {
        collectionFee[erc721] = fee;
    }

    /// @notice set the basis point fee of the protocol owner
    /// @param fee basis point amount of the transaction
    function setProtocolFee(uint fee) onlyOwner() public {
        protocolFee = fee;
    }

    /// @notice allows collection owner to withdraw collected fees
    /// @param erc721 token contract
    function collectionWithdraw(address erc721) public {
        require(collectionFeesAccrued[erc721] > 0, 'ERC721FixedPricePurchase: No funds to withdraw for this collection');
        address payable collectionOwner = payable(IOwnable(erc721).owner());
        uint amount = collectionFeesAccrued[erc721];
        collectionFeesAccrued[erc721] = 0;
        (bool sent,) = collectionOwner.call{value: amount}("");
        require(sent, "ERC721FixedPricePurchase: Failed to send Ether");
    }

    /// @notice allows protocol owner to withdraw collected fees
    function protocolWithdraw() public {
        require(protocolFeesAccrued > 0, 'ERC721FixedPricePurchase: No protocol funds to withdraw');
        uint amount = protocolFeesAccrued;
        protocolFeesAccrued = 0;
        (bool sent,) = owner().call{value: amount}("");
        require(sent, "ERC721FixedPricePurchase: Failed to send Ether");
    }
}
