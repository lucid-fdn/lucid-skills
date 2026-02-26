# Heartbeat Checks

Periodic monitoring tasks using the brain tools to keep prediction market activity healthy.

---

## 1. Edge Scan

**Tool:** `lucid_discover`

**Purpose:** Find new edge opportunities across all platforms.

**Procedure:**
1. Call `lucid_discover` with broad query (e.g., "trending", category name, or specific topic).
2. Review returned opportunities sorted by composite score.
3. For top candidates, call `lucid_evaluate` with your probability estimate.
4. Check for near-certain expiry opportunities (high-probability bonding).
5. Report new opportunities with verdict, edge%, and recommended position size.

---

## 2. Arbitrage Scan

**Tool:** `lucid_arbitrage`

**Purpose:** Find cross-platform mispricings for guaranteed profit.

**Procedure:**
1. Call `lucid_arbitrage` (no query = scan trending markets across all platforms).
2. Review opportunities with `profitPct >= 3%`.
3. Verify matches manually — title matching can produce false positives.
4. Check liquidity on both sides before executing.
5. Report top opportunities with combined cost, profit, and profit%.

---

## 3. Calibration Review

**Tool:** `lucid_calibrate`

**Purpose:** Track forecasting accuracy and detect overconfidence/underconfidence.

**Procedure:**
1. Collect resolved forecasts: `[{predictedProbability, actualOutcome (0/1)}]`.
2. Call `lucid_calibrate` with the forecasts array.
3. Review Brier score (< 0.2 = good), overconfidence score, and calibration buckets.
4. **Alert** if Brier score > 0.3 (poor calibration).
5. **Alert** if overconfidence > 0.1 (systematically overconfident).
6. Adjust future probability estimates based on calibration findings.

---

## 4. Portfolio Health

**Tool:** `lucid_size`

**Purpose:** Assess portfolio allocation and rebalancing needs.

**Procedure:**
1. Gather current positions with updated prices and probability estimates.
2. Call `lucid_size` with the positions array and current bankroll.
3. Compare recommended sizes vs actual positions.
4. **Alert** if any position exceeds 30% of total exposure (concentration risk).
5. **Alert** if total allocation > 80% of bankroll (overexposed).
6. Report recommended rebalancing actions.
