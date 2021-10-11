// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOwnable.sol";

/// @title An offer-based ERC721 Purchase Contract
/// @author jierlich
/// @notice Users can make offers on any existing ERC721
/// @notice Collection owners can set fees
/// @dev The collection owner fee is dependent on the existence of an `owner` function on the ERC721 contract
contract ERC721Offer is Ownable {
    /// @dev mapping from offerer -> ERC721 address -> token id -> offer amount
    mapping(address => mapping(address => mapping(uint => uint))) public offer;

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

    event Offered(address indexed erc721, uint indexed tokenId, address indexed offerer, uint amount);

    event Purchased(address indexed erc721, uint indexed tokenId, address indexed buyer);

    modifier onlyCollectionOwner(address erc721) {
        require(IOwnable(erc721).owner() == msg.sender, "ERC721FixedPricePurchase: Only collection owner can call this function");
        _;
    }

    /// @notice make an offer to purchase an ERC721
    /// @dev the owner must approve WETH for this contract in a separate transaction to allow the offer to be accepted
    /// @dev approval implementation should add to existing allowance
    /// @param erc721 token contract
    /// @param tokenId id of the ERC721 token
    /// @param amount amount buyer is offering to purchase the ERC721
    function makeOffer(address erc721, uint tokenId, uint amount) public {
        offer[msg.sender][erc721][tokenId] = amount;
        emit Offered(erc721, tokenId, msg.sender, amount);
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
