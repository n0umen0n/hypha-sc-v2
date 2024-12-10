require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// [Previous ABIs remain the same...]
const daoProposalsAbi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_proposalId",
                "type": "uint256"
            }
        ],
        "name": "getProposalCore",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "spaceId",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "question",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "description",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "endTime",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "executed",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "expired",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "yesVotes",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "noVotes",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "totalVotingPowerAtSnapshot",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "creator",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_proposalId",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "_support",
                "type": "bool"
            }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_proposalId",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_voter",
                "type": "address"
            }
        ],
        "name": "hasVoted",
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
    }
];

async function voteOnProposal() {
    console.log('Starting bulk voting process...');

    // Configuration
    const PROPOSAL_ID = process.env.PROPOSAL_ID;
    const VOTE_SUPPORT = true; // true for yes, false for no

    if (!PROPOSAL_ID) {
        console.error('Error: PROPOSAL_ID not set in .env file');
        return;
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

    // Read accounts from file
    let accountData;
    try {
        accountData = JSON.parse(fs.readFileSync('accounts.json', 'utf8'));
        console.log(`Loaded ${accountData.length} accounts from accounts.json`);
    } catch (error) {
        console.error('Error loading accounts.json:', error);
        return;
    }

    // Create contract instances
    const daoProposals = new ethers.Contract(
        process.env.DAO_PROPOSALS_ADDRESS,
        daoProposalsAbi,
        provider
    );

    const spaceFactory = new ethers.Contract(
        process.env.DAO_SPACE_FACTORY_ADDRESS,
        spaceFactoryAbi,
        provider
    );

    // Get proposal details
    try {
        const proposalDetails = await daoProposals.getProposalCore(PROPOSAL_ID);
        
        console.log('\nProposal Details:');
        console.log('Space ID:', proposalDetails[0].toString()); // spaceId
        console.log('Question:', proposalDetails[1]); // question
        console.log('Description:', proposalDetails[2]); // description
        console.log('Start Time:', new Date(Number(proposalDetails[3]) * 1000).toLocaleString()); // startTime
        console.log('End Time:', new Date(Number(proposalDetails[4]) * 1000).toLocaleString()); // endTime
        console.log('Executed:', proposalDetails[5]); // executed
        console.log('Expired:', proposalDetails[6]); // expired
        console.log('Current Yes Votes:', proposalDetails[7].toString()); // yesVotes
        console.log('Current No Votes:', proposalDetails[8].toString()); // noVotes
        console.log('Total Voting Power:', proposalDetails[9].toString()); // totalVotingPowerAtSnapshot

        // Check proposal status
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime < Number(proposalDetails[3])) {
            console.log('Error: Voting has not started yet');
            return;
        }
        if (currentTime > Number(proposalDetails[4]) || proposalDetails[6]) {
            console.log('Error: Proposal has expired');
            return;
        }
        if (proposalDetails[5]) {
            console.log('Error: Proposal has already been executed');
            return;
        }

        // Process votes for each account
        for (let i = 0; i < accountData.length; i++) {
            const account = accountData[i];
            const wallet = new ethers.Wallet(account.privateKey, provider);
            
            console.log(`\nProcessing vote for account ${i + 1}/${accountData.length}`);
            console.log('Wallet address:', wallet.address);

            try {
                // Check if account is a member
                const isMember = await spaceFactory.isMember(proposalDetails[0], wallet.address);
                if (!isMember) {
                    console.log('⚠️ Account is not a member of the space, skipping...');
                    continue;
                }

                // Check if already voted
                const hasVoted = await daoProposals.hasVoted(PROPOSAL_ID, wallet.address);
                if (hasVoted) {
                    console.log('⚠️ Account has already voted, skipping...');
                    continue;
                }

                // Submit vote
                console.log('Submitting vote...');
                const connectedDaoProposals = daoProposals.connect(wallet);
                const tx = await connectedDaoProposals.vote(PROPOSAL_ID, VOTE_SUPPORT);
                
                console.log('Vote transaction submitted:', tx.hash);
                const receipt = await tx.wait();

                // Look for VoteCast event
                const voteCastEvent = receipt.logs.find(
                    log => log.topics[0] === ethers.id(
                        "VoteCast(uint256,address,bool,uint256)"
                    )
                );

                if (voteCastEvent) {
                    console.log('✅ Vote cast successfully');
                    console.log(`- Gas used: ${receipt.gasUsed.toString()}`);
                } else {
                    console.log('❌ Vote cast verification failed - no VoteCast event found');
                }

            } catch (error) {
                console.log(`\nError processing vote for account ${wallet.address}:`);
                console.error('Error details:', error.message);
            }

            // Add a small delay between votes
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.error('Error getting proposal details:', error);
        console.error(error);
        return;
    }

    console.log('\nBulk voting process completed.');
}

// Execute the voting process
voteOnProposal().catch(console.error);