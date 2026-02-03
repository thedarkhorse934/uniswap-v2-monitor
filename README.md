
# 🦄 Uniswap V2 Monitor

A CLI-based on-chain monitoring tool that reads Uniswap V2 liquidity to compute **ETH/USD prices per block** and emits **configurable alerts** based on price movement and on-chain activity.

This project is designed for **learning and experimentation** with on-chain state, liquidity mechanics, rolling-window analysis, and alert design.  
It **does not** execute trades or submit transactions.

---

## 🔍 What This Tool Does

- 📡 Monitors the Uniswap V2 **USDC/WETH** pair on Ethereum mainnet
- 💰 Computes ETH/USD price directly from **on-chain reserves**
- ⛓️ Samples state **per block**
- 📊 Compares price changes over a **rolling block window**
- 🚨 Emits alerts when:
  - Price movement exceeds a configurable percentage threshold
  - Liquidity activity exceeds a configurable USDC minimum

---

## 📐 How Price Is Computed

Uniswap V2 prices are derived directly from pool reserves:

ETH price (USD) = USDC_reserve / WETH_reserve


No oracle.  
No off-chain pricing.  
All values come directly from **on-chain state** at each sampled block.

---

## 🚨 Alert Logic

An alert is emitted when **both** of the following conditions are met:

1. 📈 The ETH price change over the configured window exceeds `--threshold` (%)
2. 💵 The absolute USDC reserve change exceeds `--min-usdc`

This filters out:
- No-change blocks
- Dust swaps
- Small, low-impact trades

Only **economically meaningful movements** produce alerts.

---

## 🧾 Example Alert

🚨 ALERT | ETH ≈ 2284.54 USDC (+0.2874%)
| block 24376252
| ΔUSDC 14872.81
| ΔWETH -6.500681


### Interpretation
- ETH price increased ~0.29% over the window
- ~14.9k USDC entered the pool
- ~6.5 ETH exited the pool
- Indicates **buy pressure** on ETH

---

## ▶️ Usage

Install dependencies:

```bash
npm install

node index.js --window 20 --threshold 0.25 --min-usdc 10000 --quiet true

⚙️ CLI Flags

--window
Number of blocks to compare against (rolling window)

--threshold
Minimum percentage price change required to trigger an alert

--min-usdc
Minimum absolute USDC reserve change required to trigger an alert

--quiet
Suppress informational logs and emit alerts only

🚫 What This Tool Does Not Do

❌ Execute trades

❌ Submit transactions

❌ Predict prices

❌ Perform arbitrage

❌ Replace price oracles

This is strictly a monitoring and alerting tool.

🧠 Notes

The tool is resilient to transient RPC failures and resumes monitoring automatically

On a deep, liquid pool like USDC/WETH, alerts may be infrequent during low volatility — this is expected behavior


---

### ✅ Next steps (quick reminder)
1. Paste this into `README.md`
2. Save the file
3. Run:
```bash
git add README.md
git commit -m "Update README for Uniswap V2 monitoring tool"
git push
