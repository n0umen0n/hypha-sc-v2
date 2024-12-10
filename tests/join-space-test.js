require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Complete ABI with events but removing spaceCounter
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
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "spaceId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "member",
        "type": "address"
      }
    ],
    "name": "MemberJoined",
    "type": "event"
  }
];

// Join Method Directory ABI
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
    "name": "joincheck",
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
  console.log('Starting join space test...');

  // Read test accounts from file
  let accountData;
  try {
    accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    console.log(`Loaded ${accountData.length} test accounts`);
  } catch (error) {
    console.error('Error loading accounts.json:', error);
    return;
  }

  // Initialize provider and contracts
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
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
  
  // Space ID to test
  const spaceId = process.env.TEST_SPACE_ID || "7";
  console.log(`Testing joinSpace function for space ID: ${spaceId}`);

  // Get initial members for comparison
  const initialMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('Initial members:', initialMembers);

  // Process each account
  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedContract = daoSpaceFactory.connect(wallet);

    try {
      console.log(`\nProcessing account ${wallet.address}`);

      // Check if already a member
      const isMember = await daoSpaceFactory.isMember(spaceId, wallet.address);
      if (isMember) {
        console.log(`Account is already a member. Skipping...`);
        continue;
      }

      console.log('Attempting to join space...');
      
      // Execute join transaction
      const tx = await connectedContract.joinSpace(spaceId, {
        gasLimit: 200000 // Using fixed gas limit as fallback
      });
      
      console.log(`Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      
      // Find MemberJoined event in the receipt
      const event = receipt.logs.find(
        log => log.topics[0] === ethers.id("MemberJoined(uint256,address)")
      );

      if (event) {
        console.log(`✅ Successfully joined space ${spaceId}`);
        
        // Double check membership
        const isNowMember = await daoSpaceFactory.isMember(spaceId, wallet.address);
        if (isNowMember) {
          console.log('Membership verified through contract call');
        } else {
          console.log('Warning: Event emitted but membership not confirmed');
        }
      } else {
        console.log(`❌ Join verification failed - no MemberJoined event found`);
      }

    } catch (error) {
      console.log(`\nError processing account ${wallet.address}:`);
      
      if (error.message.includes("execution reverted")) {
        console.log('Error: Transaction reverted -', error.reason || 'Possible reasons: not invited, already a member, or invalid space ID');
      } else {
        console.log('Error:', error.message);
      }
    }
  }

  // Final membership state
  const finalMembers = await daoSpaceFactory.getSpaceMembers(spaceId);
  console.log('\nFinal space membership state:');
  console.log(`Total members: ${finalMembers.length}`);
  console.log('Member addresses:', finalMembers);

  // Print summary
  const newMemberCount = finalMembers.length - initialMembers.length;
  console.log(`\nSummary:`);
  console.log(`- Initial member count: ${initialMembers.length}`);
  console.log(`- Final member count: ${finalMembers.length}`);
  console.log(`- New members added: ${newMemberCount}`);
}

// Execute the test
testJoinSpace().catch(console.error);