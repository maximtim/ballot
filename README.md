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

To work in rinkeby use "--network rinkeby".

"add-days" works only on hardhat node

#### 2) Deploy script to rinkeby network 

- Windows:

Addresses can be indexes of used accounts from PRIVATE_KEYS_LIST (0,1,2..)
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
PRIVATE_KEYS_LIST=["pk0","pk1","pk2",...]
```

