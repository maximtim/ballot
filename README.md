## Test task: ballot smart contract

Contract owner can create various votings with title to identify and candidates to give votes to. Votings can run simultaneously. Everybody can vote for any of given candidates in any voting, but they have to pay 0.1 ETH for their vote request. One can vote only once per voting. Voting lasts 3 days, then any user can close it by request. Candidate with the highest number of votes (or one of equally highest) gets 90% of accumulated voting bank and withdraws his prize. Owner withdraws 10% of bank as commission.

#### 1) Hardhat tasks:
|Command|Description|
|---------------------------------|-------------------------------------------------|
| -  ballot-deploy                | Deploy new Ballot contract. |
| -  ballot-create-voting         | Create new voting from Ballot contract. |
| -  ballot-vote                  | Vote for a candidate of given voting |
| -  ballot-close-voting          | Close voting |
| -  ballot-withdraw              | Withdraw money from contract |
| -  ballot-get-balance           | Shows user's locked money that he can withdraw |
| -  ballot-get-user              | Prints voting user info |
| -  ballot-show-voting-info      | Prints some of voting properties |
| -  ballot-show-votings          | Prints all votings names |

Add "--help" to these commands to see explanations.

Users addresses can also be indexes of accounts from PRIVATE_KEYS_LIST (0,1,2..), for example:
```
> npx hardhat ballot-deploy --sender 1
```
You can assign CONTRACT_ADDRESS variable in .env to skip "--address" argument in tasks.

To work in rinkeby add "--network rinkeby" in task commands. To test locally, run "npx hardhat node", then use "--network localhost"

You can execute "add-days --days 3" to be able to close ballot quickly

"add-days" works only on hardhat node

#### 2) Deploy script to rinkeby network 

- Windows:

Addresses can also be indexes of accounts from PRIVATE_KEYS_LIST as well
```
> $env:HARDHAT_NETWORK='rinkeby'
> node .\scripts\ballot-deploy.js --owner <addr>
```
- Linux: 
```
>  HARDHAT_NETWORK=rinkeby node .\scripts\ballot-deploy.js --owner <addr>
```

#### 3) Tests (solidity-coverage 100%)
#### 4) .env settings:
```
PROJECT_URL="https://rinkeby.infura.io/v3/<project id here>"
PRIVATE_KEYS_LIST=["<pk0>","<pk1>","<pk2>",...]
CONTRACT_ADDRESS="<deployed address>"
```

