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
  }
];

const joinMethodDirectoryAbi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_joinMethod",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      }
    ],
    "name": "joinCheck",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_methodId",
        "type": "uint256"
      }
    ],
    "name": "joinMethods",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testJoinSpace() {
  // Read test accounts from file
  let accountData;
  try {
    accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    console.log(`Loaded ${accountData.length} test accounts`);
  } catch (error) {
    console.error('Error loading accounts.json:', error);
    return;
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  // Initialize contracts
  const daoSpaceFactory = new ethers.Contract(
    process.env.DAO_SPACE_FACTORY_ADDRESS,
    daoSpaceFactoryAbi,
    provider
  );

  const joinMethodDirectory = new ethers.Contract(
    process.env.JOIN_METHOD_DIRECTORY_ADDRESS,
    joinMethodDirectoryAbi,
    provider
  );
  
  // Space ID and join method to test
  const spaceId = process.env.TEST_SPACE_ID || "1";
  const joinMethod = process.env.JOIN_METHOD || "1"; // Default join method
  
  console.log(`Testing joinSpace function for space ID: ${spaceId}`);
  console.log(`Using join method: ${joinMethod}`);

  // Verify join method exists
  try {
    const joinMethodImplementation = await joinMethodDirectory.joinMethods(joinMethod);
    console.log(`Join method ${joinMethod} implementation address: ${joinMethodImplementation}`);
    if (joinMethodImplementation === ethers.ZeroAddress) {
      console.error('Join method not registered in directory');
      return;
    }
  } catch (error) {
    console.error('Error checking join method:', error);
    return;
  }

  // Get initial members for comparison
  const initialMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('Initial members:', initialMembers);

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedFactory = daoSpaceFactory.connect(wallet);

    try {
      console.log(`\nChecking eligibility for account ${wallet.address}`);

      // Check if already a member
      if (initialMembers.includes(wallet.address)) {
        console.log(`Account ${wallet.address} is already a member. Skipping...`);
        continue;
      }

      // Check if user meets join criteria
      const canJoin = await joinMethodDirectory.joinCheck(spaceId, joinMethod, wallet.address);
      console.log(`Join check result for ${wallet.address}: ${canJoin}`);
      
      if (!canJoin) {
        console.log(`Account ${wallet.address} does not meet join criteria. Skipping...`);
        continue;
      }

      console.log(`Account ${wallet.address} meets join criteria. Attempting to join...`);
      
      // Try joining with fixed gas settings
      const tx = await connectedFactory.joinSpace(spaceId, {
        gasLimit: 300000, // Increased gas limit
        maxFeePerGas: ethers.parseUnits('50', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
      });
      
      console.log(`Transaction hash: ${tx.hash}`);
      console.log('Waiting for transaction confirmation...');
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Verify membership
      const updatedMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
      const joinedSuccessfully = updatedMembers.includes(wallet.address);
      
      if (joinedSuccessfully) {
        console.log(`✅ Account ${wallet.address} successfully joined space ${spaceId}`);
      } else {
        console.log(`❌ Join verification failed for account ${wallet.address}`);
      }

    } catch (error) {
      console.log(`\nError for account ${wallet.address}:`);
      
      if (error.reason) {
        console.log('Revert reason:', error.reason);
      } else if (error.error && error.error.reason) {
        console.log('Error reason:', error.error.reason);
      } else {
        console.log('Error message:', error.message);
      }
      
      if (error.transaction) {
        console.log('Failed transaction details:', {
          from: error.transaction.from,
          to: error.transaction.to,
          data: error.transaction.data
        });
      }
    }
  }

  // Final membership state
  const finalMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('\nFinal space membership state:');
  console.log(`Total members: ${finalMembers.length}`);
  console.log('Member addresses:', finalMembers);
}

// Usage
testJoinSpace().catch(console.error);