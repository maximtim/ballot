## Test task: ballot smart contract

User creates ballot contract with candidates addresses as parameters, and becomes owner. Everybody can vote for any of given candidates, but they have to pay 0.1 ETH for their vote request. One can vote only once. Ballot lasts 3 days, then any user can close it by request. Candidate with the highest number of votes (or one of equally highest) gets 90% of accumulated bank and withdraws his prize. Owner withdraws 10% of bank as commission.

#### 1) Hardhat tasks:
- ballot-create
- ballot-vote
- ballot-close
- ballot-withdraw
- ballot-get-user
- ballot-show
- accounts
- add-days
- balance

Add "--help" to these commands to see explanations.

Users addresses can also be indexes of accounts from PRIVATE_KEYS_LIST (0,1,2..), for example:
```
> npx hardhat ballot-create --sender 1 --candidates 0,2
```

To work in rinkeby add "--network rinkeby" in task commands. To test locally, run "npx hardhat node", then use "--network localhost"

You can execute "add-days --days 3" to be able to close ballot quickly

"add-days" works only on hardhat node

#### 2) Deploy script to rinkeby network 

- Windows:

Addresses can also be indexes of accounts from PRIVATE_KEYS_LIST as well
```
> $env:HARDHAT_NETWORK='rinkeby'
> node .\scripts\ballot-deploy.js --owner addr0 --candidates addr1,addr2,...
```
- Linux: 
```
>  HARDHAT_NETWORK=rinkeby node .\scripts\ballot-deploy.js --owner addr0 --candidates addr1,addr2
```

#### 3) Tests (solidity-coverage 100%)
#### 4) .env settings:
```
PROJECT_URL="https://rinkeby.infura.io/v3/<project id here>"
PRIVATE_KEYS_LIST=["<pk0>","<pk1>","<pk2>",...]
```

