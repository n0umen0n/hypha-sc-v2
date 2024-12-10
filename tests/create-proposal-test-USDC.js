require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// ERC20 interface for encoding transfer function
const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)"
];

// Extended Space Factory ABI
const spaceFactoryAbi = [
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

// Updated DAO Proposals ABI with new value parameter
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

async function testCreateProposal() {
    console.log('Starting create proposal test...');

    // Configuration
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const FROM_ADDRESS = "0xDB6b07b9eca2cbB8EDA8D1f0747D2C51f1C938aC";
    const TO_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859";
    const AMOUNT = ethers.parseUnits("0.0001", 6); // USDC has 6 decimals
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    const VALUE = 0; // Amount of native token to send with the proposal execution, typically 0 for ERC20 transfers

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Read test accounts from file
    const accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
    const firstAccount = accountData[0];
    
    // Initialize wallet
    const wallet = new ethers.Wallet(firstAccount.privateKey, provider);
    
    console.log('\nDebug Information:');
    console.log('Wallet address:', wallet.address);
    console.log('Space ID:', SPACE_ID);
    console.log('DAO Proposals address:', process.env.DAO_PROPOSALS_ADDRESS);
    console.log('Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);

    // Create contract instances
    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    // Check if user is a member of the space
    const isMember = await spaceFactory.isMember(SPACE_ID, wallet.address);
    console.log('\nMembership check:');
    console.log('Is member of space:', isMember);
    if (!isMember) {
        console.log(`Account ${wallet.address} is not a member of space ${SPACE_ID}`);
        return;
    }

    // Check space executor
    const executor = await spaceFactory.getSpaceExecutor(SPACE_ID);
    console.log('\nSpace executor check:');
    console.log('Space executor address:', executor);
    if (executor === '0x0000000000000000000000000000000000000000') {
        console.log('Error: Space executor not set');
        return;
    }

    // Create USDC contract instance and encode transfer data
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const executionData = usdcContract.interface.encodeFunctionData(
        "transfer",
        [TO_ADDRESS, AMOUNT]
    );

    console.log('\nProposal parameters:');
    console.log('Target contract (USDC):', USDC_ADDRESS);
    console.log('Transfer amount:', ethers.formatUnits(AMOUNT, 6), 'USDC');
    console.log('To:', TO_ADDRESS);
    console.log('Voting duration:', VOTING_DURATION, 'seconds');
    console.log('Value:', VALUE, 'native tokens');

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        // Create the proposal with the new value parameter
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "USDC Transfer Proposal",
            "Proposal to transfer 0.0001 USDC from treasury to specified address",
            VOTING_DURATION,
            USDC_ADDRESS,
            executionData,
            VALUE  // New value parameter
        );

        console.log('Transaction submitted:', tx.hash);
        
        const receipt = await tx.wait();
        
        // Find ProposalCreated event in the receipt
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

// Execute the test
testCreateProposal().catch(console.error);