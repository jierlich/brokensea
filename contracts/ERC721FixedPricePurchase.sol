// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IOwnable.sol";


contract ERC721FixedPricePurchase {
    /// @dev mapping from ERC721 address -> token id -> listing price
    mapping(address => mapping(uint256 => uint256)) public listing;

    /// @dev mapping from collection owner to collection fee
    mapping(address => uint256) public collectionFee;

    event Listed(
        address indexed erc721,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 price
    );

    event Delisted(
        address indexed erc721,
        uint256 indexed tokenId,
        address indexed owner
    );

    event Purchased(address indexed erc721,
        uint256 indexed tokenId,
        address indexed buyer
    );

    modifier onlyErc721Owner(address erc721, uint256 tokenId) {
        require(IERC721(erc721).ownerOf(tokenId) == msg.sender, "ERC721FixedPricePurchase: Only ERC721 owner can call this function");
        _;
    }

    modifier onlyCollectionOwner(address erc721) {
        require(IOwnable(erc721).owner() == msg.sender, "ERC721FixedPricePurchase: Only ERC721 owner can call this function");
        _;
    }

    function list(address erc721, uint256 tokenId, uint256 price) onlyErc721Owner(erc721, tokenId) public {
        listing[erc721][tokenId] = price;
        emit Listed(erc721, tokenId, msg.sender, price);
    }

    function delist(address erc721, uint256 tokenId) onlyErc721Owner(erc721, tokenId) public {
        require(IERC721(erc721).getApproved(tokenId) != address(this), "ERC721FixedPricePurchase: Must revoke approval before delisting");
        listing[erc721][tokenId] = 0;
        emit Delisted(erc721, tokenId, msg.sender);
    }

    function purchase(address erc721, uint256 tokenId) public payable {
        require(msg.value >= listing[erc721][tokenId], "ERC721FixedPricePurchase: Buyer didn't send enough ether");
        require(listing[erc721][tokenId] > 0, "ERC721FixedPricePurchase: Token is not listed");
        listing[erc721][tokenId] = 0;
        address from = IERC721(erc721).ownerOf(tokenId);
        IERC721(erc721).safeTransferFrom(from, msg.sender, tokenId);
        (bool sent, bytes memory data) = from.call{value: msg.value}("");
        require(sent, "ERC721FixedPricePurchase: Failed to send Ether");
        emit Purchased(erc721, tokenId, msg.sender);
    }


    function setCollectionFee(address erc721, uint256 fee) onlyCollectionOwner(erc721) public {
        collectionFee[erc721] = fee;
    }
}
