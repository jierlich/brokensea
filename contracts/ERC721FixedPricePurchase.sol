// SPDX-License-Identifier: MIT

pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ERC721FixedPricePurchase {
    /// @dev mapping from ERC721 address -> token id -> listing price
    mapping(address => mapping(uint256 => uint256)) listing;

    event Listed(
        address indexed ERC721,
        uint256 indexed tokenId,
        address indexed owner,
        uint256 price
    );
    event Delisted(
        address indexed ERC721,
        uint256 indexed tokenId,
         address indexed owner
    );
    event Purchased(address indexed ERC721,
        uint256 indexed tokenId,
        address indexed buyer
    );

    // TODO: only owner can list
    function list(address ERC721, uint256 tokenId, uint256 price) public {
        listing[ERC721][tokenId] = price;
        emit Listed(ERC721, tokenId, msg.sender, price);
    }

    // TODO: make sure approval removed beforehand, only owner can list
    function delist(address ERC721, uint256 tokenId) public {
        listing[ERC721][tokenId] = 0;
        emit Delisted(ERC721, tokenId, msg.sender);
    }

    function purchase(address ERC721, uint256 tokenId) public payable {
        require(msg.value >= listing[ERC721][tokenId], "ERC721FixedPricePurchase: Buyer didn't send enough ether");
        listing[ERC721][tokenId] = 0;
        address from = IERC721(ERC721).ownerOf(tokenId);
        IERC721(ERC721).safeTransferFrom(from, msg.sender, tokenId);
        (bool sent, bytes memory data) = from.call{value: msg.value}("");
        require(sent, "ERC721FixedPricePurchase: Failed to send Ether");
        emit Purchased(ERC721, tokenId, msg.sender);
    }
}