// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ProfileManagerStorage is Initializable {
    // Structure to store profile information
    struct Profile {
        bool exists;
    }
    
    // Mapping from address to profile
    mapping(address => Profile) public profiles;

}