require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const inviteSystemAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_invitee",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_spaceId",
        "type": "uint256"
      }
    ],
    "name": "createInvite",
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

async function testCreateInvite() {
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
  
  console.log(`Testing createInvite function for space ID: ${spaceId}`);

  // Get the first account as the inviter
  const inviter = new ethers.Wallet(accountData[0].privateKey, provider);
  const connectedInviteSystem = inviteSystem.connect(inviter);

  // Check if inviter is a member of the space
  const isMember = await daoSpaceFactory.isMember(spaceId, inviter.address);
  
  if (!isMember) {
    console.log(`First account ${inviter.address} is not a member of space ${spaceId}. Aborting...`);
    return;
  }

  // Iterate through all other accounts as invitees
  for (let i = 1; i < accountData.length; i++) {
    const inviteeAddress = new ethers.Wallet(accountData[i].privateKey, provider).address;

    try {
      // Check if invite already exists
      const inviteExistsBefore = await inviteSystem.checkJoin(inviteeAddress, spaceId);
      
      if (inviteExistsBefore) {
        console.log(`Invite already exists for ${inviteeAddress} in space ${spaceId}. Skipping...`);
        continue;
      }

      console.log(`Creating invite from ${inviter.address} to ${inviteeAddress}`);
      
      // Create invite
      const tx = await connectedInviteSystem.createInvite(inviteeAddress, spaceId);
      const receipt = await tx.wait();
      
      // Verify invite creation
      const inviteExists = await inviteSystem.checkJoin(inviteeAddress, spaceId);
      
      // Find InviteCreated event in the receipt
      const event = receipt.logs.find(
        log => log.topics[0] === ethers.id(
          "InviteCreated(uint256,address,address,uint256)"
        )
      );

      if (event && inviteExists) {
        console.log(`✅ Invite successfully created:`);
        console.log(`- Space ID: ${spaceId}`);
        console.log(`- Inviter: ${inviter.address}`);
        console.log(`- Invitee: ${inviteeAddress}`);
        console.log(`- Verification: Invite exists = ${inviteExists}`);
      } else {
        console.log(`❌ Invite creation verification failed:`);
        console.log(`- Event found: ${!!event}`);
        console.log(`- Invite exists: ${inviteExists}`);
      }

    } catch (error) {
      if (error.message.includes("Not a member of the space")) {
        console.log(`Account ${inviter.address} is not a member of the space (caught from contract revert)`);
      } else if (error.message.includes("Invite already exists")) {
        console.log(`Invite already exists for ${inviteeAddress}`);
      } else {
        console.error(`Error creating invite from ${inviter.address} to ${inviteeAddress}:`, error);
      }
    }
  }

  console.log('\nCreate invite testing completed.');
}

// Usage
testCreateInvite().catch(console.error);