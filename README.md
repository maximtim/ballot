## Test task: ballot smart contract

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

Users addresses can be indexes of accounts from PRIVATE_KEYS_LIST (0,1,2..), for example:
```
> npx hardhat ballot-create --sender 1 --candidates 0,2
```

To work in rinkeby add "--network rinkeby" in task commands. To test locally, run "npx hardhat node", then use "--network localhost"

You can execute "add-days --days 3" to be able to close ballot quickly

"add-days" works only on hardhat node

#### 2) Deploy script to rinkeby network 

- Windows:

Addresses can be indexes of accounts from PRIVATE_KEYS_LIST as well
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

