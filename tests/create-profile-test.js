require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const profileManagerAbi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_profileImg",
        "type": "string"
      }
    ],
    "name": "createProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_address",
        "type": "address"
      }
    ],
    "name": "hasProfile",
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

async function testCreateProfile() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const profileContract = new ethers.Contract(
    process.env.PROFILE_CONTRACT_ADDRESS,
    profileManagerAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));

  console.log('Testing createProfile function...');

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedProfileContract = profileContract.connect(wallet);

    // Check if profile already exists
    const hasExistingProfile = await profileContract.hasProfile(wallet.address);
    if (hasExistingProfile) {
      console.log(`Account ${wallet.address} already has a profile. Skipping...`);
      continue;
    }

    // Test data
    const username = `TestUser${i}`;
    const description = `Test description for user ${i}`;
    const profileImg = `ipfs://test-hash-${i}`;

    try {
      // Test creating profile
      const tx = await connectedProfileContract.createProfile(
        username,
        description,
        profileImg
      );
      await tx.wait();
      console.log(`Profile created for account ${wallet.address}`);

      // Verify profile was created
      const profileExists = await profileContract.hasProfile(wallet.address);
      console.log(`Profile exists verification: ${profileExists}`);

    } catch (error) {
      console.error(`Error creating profile for account ${wallet.address}:`, error);
    }
  }

  console.log('Create profile testing completed.');
}

// Usage
testCreateProfile().catch(console.error);