import "dotenv/config";
import { ethers } from "ethers";
import fs from "fs";

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
  console.error("Missing RPC_URL in .env");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Uniswap V2 USDC/WETH pair (Ethereum mainnet)
const PAIR = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";

const PAIR_ABI = [
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getArgValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return fallback;
  return v;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function ensureCsvHeader(path) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(
      path,
      "timestamp,price_usdc,pct_change,block,delta_usdc,delta_weth\n"
    );
  }
}

async function main() {
  const checkEverySec = Number(getArgValue("--interval", "1")); // check for new block
  const thresholdPct = Number(getArgValue("--threshold", "0")); // % move over window
  const windowBlocks = Number(getArgValue("--window", "1"));    // compare to N blocks ago
  const quiet = hasFlag("--quiet");
  const csvPath = getArgValue("--csv", "prices.csv");

  // Volume/activity heuristic:
  // Minimum absolute change in USDC reserves between consecutive sampled blocks.
  const minUsdc = Number(getArgValue("--min-usdc", "0"));

  if (!Number.isFinite(checkEverySec) || checkEverySec <= 0) {
    throw new Error("--interval must be a positive number (seconds)");
  }
  if (!Number.isFinite(thresholdPct) || thresholdPct < 0) {
    throw new Error("--threshold must be a number >= 0 (percent)");
  }
  if (!Number.isFinite(windowBlocks) || windowBlocks < 1) {
    throw new Error("--window must be an integer >= 1 (blocks)");
  }
  if (!Number.isFinite(minUsdc) || minUsdc < 0) {
    throw new Error("--min-usdc must be a number >= 0");
  }

  ensureCsvHeader(csvPath);

  const network = await provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);

  const pair = new ethers.Contract(PAIR, PAIR_ABI, provider);

  const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
  const token0 = new ethers.Contract(t0, ERC20_ABI, provider);
  const token1 = new ethers.Contract(t1, ERC20_ABI, provider);

  const [sym0, sym1, dec0, dec1] = await Promise.all([
    token0.symbol(),
    token1.symbol(),
    token0.decimals(),
    token1.decimals()
  ]);

  console.log(`Monitoring Uniswap V2 pair ${sym0}/${sym1}`);
  console.log(`Pair: ${PAIR}`);
  console.log(
    `Block-sampled | check ${checkEverySec}s | window ${windowBlocks} blocks | threshold ${thresholdPct}% | min-usdc ${minUsdc} | quiet ${quiet}`
  );

  // Determine which token is USDC / WETH for deltas
  const sym0U = sym0.toUpperCase();
  const sym1U = sym1.toUpperCase();

  const token0IsWeth = sym0U.includes("WETH");
  const token1IsWeth = sym1U.includes("WETH");

  const token0IsUsdc = sym0U === "USDC";
  const token1IsUsdc = sym1U === "USDC";

  // Keep a rolling history of recent samples (per block)
  // Each entry: { block, price, usdcReserve, wethReserve }
  const history = [];

  let lastBlock = null;

  while (true) {
    try {
      const block = await provider.getBlockNumber();

      if (lastBlock !== null && block === lastBlock) {
        await sleep(checkEverySec * 1000);
        continue;
      }
      lastBlock = block;

      const { reserve0, reserve1 } = await pair.getReserves();

      const r0 = Number(ethers.formatUnits(reserve0, dec0));
      const r1 = Number(ethers.formatUnits(reserve1, dec1));

      // price0In1 = token0 priced in token1
      const price0In1 = r1 / r0;

      // ETH price in USDC (handle ordering)
      const ethPrice =
        token0IsWeth ? price0In1 :
        token1IsWeth ? (1 / price0In1) :
        price0In1;

      // Track reserves by symbol for activity heuristic
      let usdcReserve = null;
      let wethReserve = null;

      if (token0IsUsdc) usdcReserve = r0;
      if (token1IsUsdc) usdcReserve = r1;

      if (token0IsWeth) wethReserve = r0;
      if (token1IsWeth) wethReserve = r1;

      // We expect USDC + WETH; if not, still run but activity fields may be blank
      const now = new Date().toISOString();

      // Compute deltas vs previous sample (activity proxy)
      let deltaUsdc = null;
      let deltaWeth = null;
      if (history.length > 0) {
        const prev = history[history.length - 1];
        if (usdcReserve != null && prev.usdcReserve != null) {
          deltaUsdc = usdcReserve - prev.usdcReserve;
        }
        if (wethReserve != null && prev.wethReserve != null) {
          deltaWeth = wethReserve - prev.wethReserve;
        }
      }

      // Add to history
      history.push({ block, price: ethPrice, usdcReserve, wethReserve });

      // Keep only what we need (window + a little buffer)
      while (history.length > windowBlocks + 2) history.shift();

      // Compute % change over windowBlocks (compare to N blocks ago)
      let pct = null;
      if (history.length > windowBlocks) {
        const past = history[history.length - 1 - windowBlocks];
        pct = ((ethPrice - past.price) / past.price) * 100;
      }

      // Activity rule: absolute USDC reserve change between last 2 samples
      const activityOk =
        minUsdc === 0 ||
        (deltaUsdc != null && Math.abs(deltaUsdc) >= minUsdc);

      const isPriceAlert = pct != null && Math.abs(pct) >= thresholdPct;
      const isAlert = isPriceAlert && activityOk;

      // Print formatting
      const changeStr =
        pct == null ? "" : ` (${pct >= 0 ? "+" : ""}${pct.toFixed(4)}%)`;

      const deltaStrParts = [];
      if (deltaUsdc != null) deltaStrParts.push(`ΔUSDC ${deltaUsdc.toFixed(2)}`);
      if (deltaWeth != null) deltaStrParts.push(`ΔWETH ${deltaWeth.toFixed(6)}`);
      const deltaStr = deltaStrParts.length ? ` | ${deltaStrParts.join(" | ")}` : "";

      const prefix = isAlert ? "🚨 ALERT" : "INFO";

      if (!quiet || isAlert) {
        console.log(
          `${prefix} | ${now} | ETH ≈ ${ethPrice.toFixed(6)} USDC${changeStr} | block ${block}${deltaStr}`
        );
      }

      // CSV logging
      const pctOut = pct == null ? "" : pct.toFixed(6);
      const usdcOut = deltaUsdc == null ? "" : deltaUsdc;
      const wethOut = deltaWeth == null ? "" : deltaWeth;
      fs.appendFileSync(csvPath, `${now},${ethPrice},${pctOut},${block},${usdcOut},${wethOut}\n`);
    } catch (err) {
      const now = new Date().toISOString();
      console.log(`⚠️ ${now} | RPC error: ${err.code || ""} ${err.message}`);
      await sleep(2000);
    }
  }
}

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});

