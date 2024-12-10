// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IProfileManager {
    function initialize(address initialOwner) external;
    function createProfile(
        string memory _username, 
        string memory _description,
        string memory _profileImg
    ) external;
    
    function editProfile(
        string memory _username, 
        string memory _description,
        string memory _profileImg
    ) external;
    
    function deleteProfile() external;
    function hasProfile(address _address) external view returns (bool);
    
    // Events
    event ProfileCreated(
        address indexed user, 
        string username, 
        string description,
        string profileImg
    );
    event ProfileUpdated(
        address indexed user, 
        string username, 
        string description,
        string profileImg
    );
    event ProfileDeleted(address indexed user);
}