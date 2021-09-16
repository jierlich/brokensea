// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

/**
    @title Mock ERC721
    @author jierlich
    @notice Mock ERC721 for testing purposes
*/

contract MockERC721 is ERC721PresetMinterPauserAutoId {
    constructor(string memory name, string memory symbol) ERC721PresetMinterPauserAutoId(name, symbol, "") {}
}
