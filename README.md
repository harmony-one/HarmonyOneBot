## Harmony One AI Bot

### Telegram wallet
[http://harmony.one/telegram-wallets](http://harmony.one/telegram-wallets)

### Env variables

| Env variable name       | Required | Default | Description             |                                                                                                                                                                                                                                                                                                                                                                                                                                                
|-------------------------|----------|---------|-------------------------|
| TELEGRAM_BOT_AUTH_TOKEN | true     | -       | Telegram bot auth token |
| TELEGRAM_API_ID         | true     | -       | Telegram API id         |
| TELEGRAM_API_HASH       | true     | -       | Telegram API hash       |

## Bot paid features (version 2)
#### Core components:
- Telegram bot
- Wallet Connect
- Smart contract (advanced flow)

#### Basic user flow (pay for request)
1) User making request to the bot
2) The bot checks if the user's wallet is connected via Wallet Connect
3) If not, a QR code is generated and sent to chat to connect to the user wallet. This step is done once until the wallet is disconnected by user.
4) The bot calculates the amount of tokens and sends a request to the user for payment
5) After payment, the bot performs a request

#### Advanced user flow (pay once for multiple requests)
Paying per request can be inconvenient from a UX perspective.
In this case, we can allow the user to pay for N requests at once.

A smart contract is used to store the available tokens.
In order to buy tokens for requests to the bot, the user must confirm the transaction of calling a smart contract, and transferring funds to the address of that contract.

Once this transaction is executed, the contract address will have a record of the number of tokens available, which the bot can query each time a request is made from the user.
The blockchain address bot will be authorized to reduce the number of tokens by changing the smart contract entry, but will not have access to ONE token stored on the contract address.
This will avoid problems with the security of funds, even if the bot's blockchain account is compromised.

As a short summary:
- user can call some "pay" method and transfer ONE tokens in exchange to bot tokens
- bot account can reduce bot payments tokens amount in smart contract (but can't withdraw ONE from contract balance)
- ONE funds from fees can be stored in multisig account and protected even if bot blockchain account is compromised

## Bot paid features

Bot paid features includes audio-to-text translations, AI image generator, QR code generator, etc.

### Mission
The bot should support payments in ONE token

### Requirements
Each bot user (telegram user) should be mapped to a deposit blockchain account.

Deposit account must have the following properties:
1) Each account should be unique to the Telegram userId
2) Deposit address should be available for the user and the bot
3) Bot should be able to transfer ONE tokens from deposit address as a payment
4) Private key of deposit account data should not be stored in the persistent storage

### Solution
Each telegram userId can be mapped to the deposit account with sha hash function.
To make it impossible to create the same account, knowing the mapping algorithm, we can add a secret string on the bot side.

Example of creation of the deposit account:
```javascript
const privateKey = web3.utils.sha3("<BotSecret>_<TelegramUserId>");

const account = web3.eth.accounts.privateKeyToAccount(privateKey);

console.log(account.address); // 0xd10063CFC4fEea79367Be6d8C1eC6a2251ebCAD1
```
- BotSecret is a random string stored in the bot RAM
- TelegramUserId is a 8-digit number representing the telegram userId

Pros:
- Almost unique mapping userId -> deposit account (sha3 collisions probability is very low)
- Private key is not stored in the persistent storage
- Deposit account can be computed by bot on the fly, based on secret from RAM and telegram userId from the request

Cons:
- Deposit blockchain account created in centralized way.
Considering that the user doesn't need this account to store tokens, but only to refill for the bot's services, this shouldn't be a problem.

### Payment flow
<img width="953" alt="Screenshot 2023-07-13 at 9 11 35 AM" src="https://github.com/harmony-one/HarmonyOneBot/assets/8803471/1991830c-7a20-413d-b8cf-fba3ce9a3c88">

