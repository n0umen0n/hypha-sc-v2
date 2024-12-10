require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const inviteSystemAbi = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_invitees",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      }
    ],
    "name": "createBatchInvites",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      }
    ],
    "name": "checkJoin",
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

const daoSpaceFactoryAbi = [
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

async function testBatchCreateInvites() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  
  // Initialize contracts
  const inviteSystem = new ethers.Contract(
    process.env.INVITE_SYSTEM_ADDRESS,
    inviteSystemAbi,
    provider
  );
  
  const daoSpaceFactory = new ethers.Contract(
    process.env.DAO_SPACE_FACTORY_ADDRESS,
    daoSpaceFactoryAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
  
  // Space ID to test invites
  const spaceId = process.env.TEST_SPACE_ID || "1";
  
  console.log(`Testing batch createInvite function for space ID: ${spaceId}`);

  // Get the first account as the inviter
  const inviter = new ethers.Wallet(accountData[0].privateKey, provider);
  const connectedInviteSystem = inviteSystem.connect(inviter);

  // Check if inviter is a member of the space
  const isMember = await daoSpaceFactory.isMember(spaceId, inviter.address);
  
  if (!isMember) {
    console.log(`First account ${inviter.address} is not a member of space ${spaceId}. Aborting...`);
    return;
  }

  // Collect all invitee addresses
  const inviteeAddresses = accountData.slice(1).map(account => 
    new ethers.Wallet(account.privateKey, provider).address
  );

  try {
    console.log(`Creating batch invites from ${inviter.address} to ${inviteeAddresses.length} addresses`);
    
    // Create batch invites
    const tx = await connectedInviteSystem.createBatchInvites(inviteeAddresses, spaceId);
    const receipt = await tx.wait();
    
    // Verify invite creation for each invitee
    console.log('\nVerifying invites...');
    for (const inviteeAddress of inviteeAddresses) {
      const inviteExists = await inviteSystem.checkJoin(inviteeAddress, spaceId);
      
      console.log(`Invite for ${inviteeAddress}: ${inviteExists ? '✅ Created' : '❌ Failed'}`);
    }

    // Find BatchInvitesCreated event in the receipt
    const event = receipt.logs.find(
      log => log.topics[0] === ethers.id(
        "BatchInvitesCreated(uint256,address,address[],uint256)"
      )
    );

    if (event) {
      console.log('\n✅ Batch invite creation successful');
      console.log(`- Transaction hash: ${receipt.hash}`);
      console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
    }

  } catch (error) {
    if (error.message.includes("Not a member of the space")) {
      console.log(`Account ${inviter.address} is not a member of the space (caught from contract revert)`);
    } else {
      console.error('Error creating batch invites:', error);
    }
  }

  console.log('\nBatch create invite testing completed.');
}

// Usage
testBatchCreateInvites().catch(console.error);