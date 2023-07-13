## Harmony One AI Bot


| Env variable name       | Required | Default | Description             |                                                                                                                                                                                                                                                                                                                                                                                                                                                
|-------------------------|----------|---------|-------------------------|
| TELEGRAM_BOT_AUTH_TOKEN | true     | -       | Telegram bot auth token |
| TELEGRAM_API_ID         | true     | -       | Telegram API id         |
| TELEGRAM_API_HASH       | true     | -       | Telegram API hash       |


## Bot paid features

Bot paid features includes audio-to-text translations, AI image generator, QR code generator, etc.

### Mission
The bot should support payment in ONE token

### Requirements
Each bot user (telegram user) must be mapped to a blockchain account.

User blockchain account must have the following properties:
1) Each blockchain account should be unique to the Telegram userId
2) Account address should be available for the user and bot
3) Bot should be able to transfer ONE tokens to another address as a payment
4) Private key or any sensitive user blockchain account data should not be stored in the persistent storage

### Solution (draft)
Each telegram userId can be mapped to the blockchain account with sha hash function.
To make it impossible to create the same account, knowing the mapping algorithm, we can add a secret string on the bot side.

Example:
```javascript
const privateKey = web3.utils.sha3("<BotSecret>_<TelegramUserId>");

const account = web3.eth.accounts.privateKeyToAccount(privateKey);

console.log(account.address); // 0xd10063CFC4fEea79367Be6d8C1eC6a2251ebCAD1
```
- BotSecret is a random string stored in the bot RAM
- TelegramUserId is a 8-digit number representing the telegram userId

Pros:
- Almost unique mapping userId -> blockchain account (sha3 collisions probability is very low)
- Private key is not stored in the persistent storage
- A user account can be computed by bot on the fly, based on secret from RAM and telegram userId

Cons:
- Blockchain accounts created in centralized way.
Considering that the user doesn't need this account to store tokens, but only to refill for the bot's services, this shouldn't be a problem.
