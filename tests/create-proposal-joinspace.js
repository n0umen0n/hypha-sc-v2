require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

const spaceFactoryAbi = [
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

const daoProposalsAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_spaceId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_question",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_description",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_duration",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_targetContract",
                "type": "address"
            },
            {
                "internalType": "bytes",
                "name": "_executionData",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "createProposal",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

async function createJoinSpaceProposal() {
    console.log('Starting join space proposal creation...');

    // Configuration
    const TEST_SPACE_ID = process.env.TEST_SPACE_ID;
    const TARGET_SPACE_ID = process.env.TARGET_SPACE_ID;
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    const VALUE = 0;

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Read test accounts from file
    const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const firstAccount = accountData[0];
    const wallet = new ethers.Wallet(firstAccount.privateKey, provider);
    
    console.log('\nDebug Information:');
    console.log('Wallet address:', wallet.address);
    console.log('Proposing Space ID:', TEST_SPACE_ID);
    console.log('Target Space ID:', TARGET_SPACE_ID);
    console.log('DAO Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);
    console.log('DAO Proposals address:', process.env.DAO_PROPOSALS_ADDRESS);

    // Create contract instances
    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    // Check if user is a member of the proposing space
    const isMember = await spaceFactory.isMember(TEST_SPACE_ID, wallet.address);
    console.log('\nMembership check:');
    console.log('Is member of proposing space:', isMember);
    if (!isMember) {
        console.log(`Account ${wallet.address} is not a member of space ${TEST_SPACE_ID}`);
        return;
    }

    // Encode joinSpace function data
    const executionData = spaceFactory.interface.encodeFunctionData(
        "joinSpace",
        [TARGET_SPACE_ID]
    );

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        const tx = await daoProposals.createProposal(
            TEST_SPACE_ID,
            "Join Space Proposal",
            `Proposal for space ${TEST_SPACE_ID} to join space ${TARGET_SPACE_ID}`,
            VOTING_DURATION,
            process.env.DAO_SPACE_FACTORY_ADDRESS,
            executionData,
            VALUE
        );

        console.log('Transaction submitted:', tx.hash);
        
        const receipt = await tx.wait();
        
        const event = receipt.logs.find(
            log => log.topics[0] === ethers.id(
                "ProposalCreated(uint256,uint256,uint256,uint256,address,address)"
            )
        );

        if (event) {
            console.log('\n✅ Proposal creation successful');
            console.log(`- Transaction hash: ${receipt.hash}`);
            console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
        } else {
            console.log('\n❌ Proposal creation verification failed - no ProposalCreated event found');
        }

    } catch (error) {
        if (error.message.includes("insufficient funds")) {
            const balance = await provider.getBalance(wallet.address);
            console.log('\nInsufficient funds error:');
            console.log('Current wallet balance:', ethers.formatEther(balance), 'ETH');
        } else {
            console.error('\nError creating proposal:', error);
        }
    }
}

createJoinSpaceProposal().catch(console.error);