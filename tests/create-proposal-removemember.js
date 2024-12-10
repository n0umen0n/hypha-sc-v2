require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Space Factory ABI (only the functions we need)
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
            },
            {
                "internalType": "address",
                "name": "_memberToRemove",
                "type": "address"
            }
        ],
        "name": "removeMember",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// DAO Proposals ABI
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

async function testCreateRemoveMemberProposal() {
    console.log('Starting remove member proposal test...');

    // Configuration
    const SPACE_ID = process.env.TEST_SPACE_ID || "9";
    const MEMBER_TO_REMOVE = "0x9EeA2E2FDeD36A1Ac361e5E1c7B74c46E588e500"; // Address of member to remove
    const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
    const VALUE = 0; // Amount of native token to send with the proposal execution

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
    console.log('Space Factory address:', process.env.DAO_SPACE_FACTORY_ADDRESS);
    console.log('Member to remove:', MEMBER_TO_REMOVE);

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

    // Check if target is actually a member
    const isTargetMember = await spaceFactory.isMember(SPACE_ID, MEMBER_TO_REMOVE);
    console.log('Is target a member:', isTargetMember);
    if (!isTargetMember) {
        console.log(`Account ${MEMBER_TO_REMOVE} is not a member of space ${SPACE_ID}`);
        return;
    }

    // Encode the removeMember function call
    const executionData = spaceFactory.interface.encodeFunctionData(
        "removeMember",
        [SPACE_ID, MEMBER_TO_REMOVE]
    );

    console.log('\nProposal parameters:');
    console.log('Target contract:', process.env.DAO_SPACE_FACTORY_ADDRESS);
    console.log('Member to remove:', MEMBER_TO_REMOVE);
    console.log('Voting duration:', VOTING_DURATION, 'seconds');

    // Create DAO Proposals contract instance
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        wallet
    );

    try {
        console.log('\nSubmitting proposal transaction...');
        
        const tx = await daoProposals.createProposal(
            SPACE_ID,
            "Remove Member Proposal",
            `Proposal to remove member ${MEMBER_TO_REMOVE} from the space`,
            VOTING_DURATION,
            process.env.DAO_SPACE_FACTORY_ADDRESS,
            executionData,
            VALUE
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
testCreateRemoveMemberProposal().catch(console.error);