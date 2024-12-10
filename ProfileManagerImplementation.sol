// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./storage/ProfileManagerStorage.sol";
import "./interfaces/IProfileManager.sol";

contract ProfileManagerImplementation is 
    Initializable, 
    OwnableUpgradeable, 
    UUPSUpgradeable,
    ProfileManagerStorage,
    IProfileManager 
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    modifier profileExists() {
        require(profiles[msg.sender].exists, "Profile does not exist");
        _;
    }
    
    modifier profileDoesNotExist() {
        require(!profiles[msg.sender].exists, "Profile already exists");
        _;
    }

    /**
     * @dev Creates a new profile for the sender
     * @param _username The username for the profile
     * @param _description The description for the profile
     * @param _profileImg The profile image URI/IPFS hash
     */
    function createProfile(
        string memory _username, 
        string memory _description,
        string memory _profileImg
    ) 
        external 
        override
        profileDoesNotExist 
    {
        require(bytes(_username).length > 0, "Username cannot be empty");
        
        profiles[msg.sender].exists = true;
        
        emit ProfileCreated(msg.sender, _username, _description, _profileImg);
    }
    
    /**
     * @dev Edits an existing profile
     * @param _username The new username
     * @param _description The new description
     * @param _profileImg The new profile image URI/IPFS hash
     */
    function editProfile(
        string memory _username, 
        string memory _description,
        string memory _profileImg
    ) 
        external 
        override
        profileExists 
    {
        require(bytes(_username).length > 0, "Username cannot be empty");
        
        emit ProfileUpdated(msg.sender, _username, _description, _profileImg);
    }
    
    /**
     * @dev Deletes the sender's profile
     */
    function deleteProfile() 
        external 
        override
        profileExists 
    {
        delete profiles[msg.sender];
        
        emit ProfileDeleted(msg.sender);
    }
    
    /**
     * @dev Returns whether a profile exists for a given address
     * @param _address The address to query
     * @return exists Whether the profile exists
     */
    function hasProfile(address _address) 
        external 
        view 
        override
        returns (bool) 
    {
        return profiles[_address].exists;
    }
}