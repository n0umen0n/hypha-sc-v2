require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const daoSpaceFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      }
    ],
    "name": "joinSpace",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      }
    ],
    "name": "getSpaceMembers",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      }
    ],
    "name": "isMember",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testJoinSpace() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const daoSpaceFactory = new ethers.Contract(
    process.env.DAO_SPACE_FACTORY_ADDRESS,
    daoSpaceFactoryAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
  
  // Space ID to test joining - should be a valid space ID from your deployment
  const spaceId = process.env.TEST_SPACE_ID || "1";
  
  console.log(`Testing joinSpace function for space ID: ${spaceId}`);

  // Get initial members for comparison
  const initialMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('Initial members:', initialMembers);

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedFactory = daoSpaceFactory.connect(wallet);

    try {
      // Check if already a member
      const isMemberBefore = await daoSpaceFactory.isMember(spaceId, wallet.address);
      
      if (isMemberBefore) {
        console.log(`Account ${wallet.address} is already a member. Skipping...`);
        continue;
      }

      console.log(`Attempting to join space with account ${wallet.address}`);
      
      // Join space
      const tx = await connectedFactory.joinSpace(spaceId);
      await tx.wait();
      
      // Verify membership through multiple methods
      // Method 1: Check isMember function
      const isMemberAfter = await daoSpaceFactory.isMember(spaceId, wallet.address);
      console.log(`isMember verification: ${isMemberAfter}`);

      // Method 2: Get all members and check if address is included
      const updatedMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
      const isInMembersList = updatedMembers.includes(wallet.address);
      console.log(`Member list verification: ${isInMembersList}`);

      // Method 3: Compare member count
      const memberCountDifference = updatedMembers.length - initialMembers.length;
      console.log(`Member count increased by: ${memberCountDifference}`);

      // Log verification results
      if (isMemberAfter && isInMembersList && memberCountDifference > 0) {
        console.log(`✅ Account ${wallet.address} successfully joined space ${spaceId}`);
      } else {
        console.log(`❌ Verification failed for account ${wallet.address}:`);
        console.log(`- isMember check: ${isMemberAfter}`);
        console.log(`- Member list includes address: ${isInMembersList}`);
        console.log(`- Member count change: ${memberCountDifference}`);
      }

    } catch (error) {
      if (error.message.includes("Already a member")) {
        console.log(`Account ${wallet.address} is already a member (caught from contract revert)`);
      } else if (error.message.includes("Join criteria not met")) {
        console.log(`Account ${wallet.address} does not meet join criteria`);
      } else {
        console.error(`Error joining space for account ${wallet.address}:`, error);
      }
    }
  }

  // Final membership state
  const finalMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('\nFinal space membership state:');
  console.log(`Total members: ${finalMembers.length}`);
  console.log('Member addresses:', finalMembers);

  console.log('\nJoin space testing completed.');
}

// Usage
testJoinSpace().catch(console.error);