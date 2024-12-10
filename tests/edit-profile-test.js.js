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
    "name": "editProfile",
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

async function testEditProfile() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const profileContract = new ethers.Contract(
    process.env.PROFILE_CONTRACT_ADDRESS,
    profileManagerAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));

  console.log('Testing editProfile function...');

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedProfileContract = profileContract.connect(wallet);

    // Check if profile exists
    const hasProfile = await profileContract.hasProfile(wallet.address);
    if (!hasProfile) {
      console.log(`Account ${wallet.address} has no profile. Skipping...`);
      continue;
    }

    // Test data for profile update
    const newUsername = `UpdatedUser${i}`;
    const newDescription = `Updated description for user ${i}`;
    const newProfileImg = `ipfs://updated-hash-${i}`;

    try {
      // Test editing profile
      const tx = await connectedProfileContract.editProfile(
        newUsername,
        newDescription,
        newProfileImg
      );
      await tx.wait();
      console.log(`Profile updated for account ${wallet.address}`);

    } catch (error) {
      console.error(`Error updating profile for account ${wallet.address}:`, error);
    }
  }

  console.log('Edit profile testing completed.');
}

// Usage
testEditProfile().catch(console.error);