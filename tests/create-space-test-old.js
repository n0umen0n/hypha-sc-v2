require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const daoSpaceFactoryAbi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_imageUrl",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_unity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_quorum",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_votingPowerSource",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_exitMethod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_joinMethod",
        "type": "uint256"
      }
    ],
    "name": "createSpace",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
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
      }
    ],
    "name": "getSpaceExecutor",
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

async function testCreateSpace() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const daoSpaceFactory = new ethers.Contract(
    process.env.DAO_SPACE_FACTORY_ADDRESS,
    daoSpaceFactoryAbi,
    provider
  );

  // Read test accounts from file
  const accountData = JSON.parse(fs.readFileSync('accountsspace.json', 'utf8'));

  console.log('Testing createSpace function...');

  for (let i = 0; i < accountData.length; i++) {
    const wallet = new ethers.Wallet(accountData[i].privateKey, provider);
    const connectedFactory = daoSpaceFactory.connect(wallet);

    // Test data for space creation
    const spaceData = {
      name: `Test Space ${i}`,
      description: `This is a test space number ${i}`,
      imageUrl: `https://example.com/space-${i}.jpg`,
      unity: 51, // 51% unity requirement
      quorum: 30, // 30% quorum requirement
      votingPowerSource: 1, // Example voting power source
      exitMethod: 1, // Example exit method
      joinMethod: 3 // Example join method
    };

    try {
      // Create space
      console.log(`Creating space with name: ${spaceData.name}`);
      const tx = await connectedFactory.createSpace(
        spaceData.name,
        spaceData.description,
        spaceData.imageUrl,
        spaceData.unity,
        spaceData.quorum,
        spaceData.votingPowerSource,
        spaceData.exitMethod,
        spaceData.joinMethod
      );

      const receipt = await tx.wait();
      
      // Find the SpaceCreated event in the receipt
      const event = receipt.logs.find(
        log => log.topics[0] === ethers.id(
          "SpaceCreated(uint256,string,string,string,uint256,uint256,uint256,uint256,uint256,address,address)"
        )
      );

      if (event) {
        const spaceId = parseInt(event.topics[1]);
        console.log(`Space created with ID: ${spaceId}`);

        // Verify space creation
        const members = await daoSpaceFactory.getSpaceMembers(spaceId);
        console.log(`Initial members: ${members}`);
        console.log(`Creator address: ${wallet.address}`);
        
        // Verify executor
        const executor = await daoSpaceFactory.getSpaceExecutor(spaceId);
        console.log(`Space executor address: ${executor}`);

        // Verify creator is first member
        if (members[0] === wallet.address) {
          console.log('Verification successful: Creator is the first member');
        } else {
          console.error('Verification failed: Creator is not the first member');
        }
      }

    } catch (error) {
      console.error(`Error creating space for account ${wallet.address}:`, error);
    }
  }

  console.log('Create space testing completed.');
}

// Usage
testCreateSpace().catch(console.error);