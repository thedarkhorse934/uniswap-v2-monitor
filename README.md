# 🧠 Token Analyzer (Ethereum CLI)

A lightweight **Node.js CLI tool** that reads and validates **ERC-20 token data directly from the Ethereum blockchain** using an RPC endpoint.

No scraping.  
No third-party APIs.  
Just **on-chain truth**. 🔗

---

## 🚀 What This Project Does

Given an Ethereum contract address, this tool:

✅ Connects to an Ethereum RPC  
✅ Detects the current network and chain ID  
✅ Verifies that contract code exists at the address  
✅ Reads ERC-20 metadata **directly from the smart contract**  

Specifically, it retrieves:

- 📛 Token name  
- 🏷️ Token symbol  
- 🔢 Decimals  
- 🧮 Total supply  

This project is intentionally small, focused, and correct — designed to demonstrate **on-chain data querying and validation**, not UI polish.

---

## 🛡️ Why This Matters

Blockchain addresses are **chain-specific**.

Querying a mainnet token on the wrong network silently produces bad data — a common and dangerous mistake in Web3 tooling.

This project avoids that by:

- 🌍 Detecting the connected network
- ⚠️ Refusing to proceed if the address is not a deployed contract
- 📡 Reading state **directly from the blockchain**, not cached services

It’s a foundation for:
- token analysis tools
- risk assessment
- portfolio trackers
- hackathon projects
- future DeFi tooling

---

## 🧰 Tech Stack

- **Node.js**
- **ethers.js**
- **Ethereum JSON-RPC**
- **CLI (command-line interface)**

---

## ⚙️ Setup

### 1️⃣ Install dependencies
```bash
npm install
```

###2️⃣ Configure environment variables
```bash
cp .env.example .env
```
Add your Ethereum mainnet RPC URL to .env:
```bash
RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
```
🔐 .env is ignored by Git — your keys stay local.

▶️ Usage

Run the analyzer from the command line:
```bash
node index.js <token_contract_address>
```
Example:
```bash
node index.js 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```
Example Output:
```bash
Token analyzer starting...
Network: mainnet (chainId: 1)

Token: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
Name: USD Coin
Symbol: USDC
Decimals: 6
Total Supply: 49533290454.242409
```

🧪 Safety & Validation Checks

✔ Network detection (prevents wrong-chain queries)
✔ Contract existence verification
✔ Graceful handling of missing or non-standard ERC-20 methods

📚 What I Learned

- How to query live on-chain state using Ethereum RPC
- How ERC-20 metadata is exposed by smart contracts
- The importance of chain awareness in Web3 tooling
- Structuring small, reusable CLI tools
- Secure handling of environment variables

🔮 Future Improvements (Optional)

- JSON output mode (--json)
- Support for multiple networks
- Detection of proxy contracts
- Additional token risk heuristics

📄 License

MIT — free to use, modify, and build upon.

🙌 Final Notes

This project is intentionally simple and focused.
The goal is correctness, clarity, and on-chain understanding — not feature bloat.
If you’re exploring Web3 development, this is a solid foundation to build from. 🚀

