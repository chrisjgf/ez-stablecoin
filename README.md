# Sensei - automated exchange actions

Command-line app that automates a series of operations, including:

- Polling for a sufficient **ZGBP** balance on Kraken.
- Swapping GBP to USDC through Kraken.
- Withdrawing USDC from Kraken.
- Bridging USDC via the Across protocol.
- Transferring USDC on Base to a specified recipient (Echo).

Future plans include:
- Abstract away crypto exchange support for easier onboarding. 
- Add more automations, like onchain swaps, lending, etc.

---

## Variables

Create a `.env` file in the project's root directory based on the provided `.env.example`. The variables needed are:

- `KRAKEN_API_KEY`: Your Kraken API key.
- `KRAKEN_API_SECRET`: Your Kraken API secret.
- `INFURA_API_KEY`: Your Infura API key.
- `PK`: Your wallet's private key (ensure proper security). Load with gas fees for now.
- `RECIPIENT`: The recipient address that will receive USDC on Base.

A sample configuration is provided in [`.env.example`](.env.example).

---

## Usage

- Fill out the `.env` file with your API keys and private key.
- Run `pnpm install` to install the dependencies.
- Run `pnpm start` to start the application.

---

## Flow

Sensei performs a series of automated steps:

1. **Polling:**  
   It continuously polls Kraken until the `ZGBP` balance meets the required amount. The polling interval is set to 1 minute.

2. **Swap:**  
   Once the balance is sufficient, the application initiates a GBP-to-USDC swap via Kraken.

3. **Withdrawal:**  
   After the swap, it withdraws USDC from Kraken.

4. **Bridge:**  
   USDC is bridged (minus a 2 USDC Kraken fee) using the Across protocol.

5. **Transfer:**  
   Finally, the USDC on Base is sent to the specified recipient (`Echo`).

---

## Disclaimer

This project is provided "as is" without any warranty. The use of this application for financial transactions is at your own risk. Ensure you thoroughly test all operations in a safe environment before handling real funds. The developers are not responsible for any financial losses or damages.


