require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Extended Space Factory ABI (unchanged)
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

// DAO Proposals ABI (unchanged)
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

async function testCreateETHProposal() {
    console.log('Starting create ETH transfer proposal test...');

    // Configuration
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const TO_ADDRESS = "0x0a5b7D10Ac292D91a80F83CB75478b899964e859";
    const ETH_AMOUNT = ethers.parseEther("0.00001"); // 0.01 ETH
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

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

    // For ETH transfer, we encode a call to the fallback/receive function
    const executionData = "0x00"; // Minimal valid data that's not empty

    console.log('\nProposal parameters:');
    console.log('Target address:', TO_ADDRESS);
    console.log('Transfer amount:', ethers.formatEther(ETH_AMOUNT), 'ETH');
    console.log('Voting duration:', VOTING_DURATION, 'seconds');
    console.log('Execution data:', executionData);

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        // Create the proposal
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "ETH Transfer Proposal",
            `Proposal to transfer ${ethers.formatEther(ETH_AMOUNT)} ETH from treasury to ${TO_ADDRESS}`,
            VOTING_DURATION,
            TO_ADDRESS,           // Target is the recipient address
            executionData,        // Minimal valid data
            ETH_AMOUNT           // Value is the ETH amount to transfer
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
testCreateETHProposal().catch(console.error);