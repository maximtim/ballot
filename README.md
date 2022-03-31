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

#### 2) Deploy script to rinkeby network (example)

Windows:
```
> $env:HARDHAT_NETWORK='rinkeby'
> node .\scripts\ballot-deploy.js --owner addr0 --candidates addr1,addr2,...
```
Addresses can be indexes of used accounts (0,1,2..)

Linux: 
```
>  HARDHAT_NETWORK=rinkeby node .\scripts\ballot-deploy.js --owner addr0 --candidates addr1,addr2
```

#### 3) Tests (solidity-coverage 100%)
