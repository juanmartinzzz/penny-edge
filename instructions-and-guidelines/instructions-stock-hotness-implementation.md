# Stock Hotness Score Algorithm - Implementation Guide

## Overview
This algorithm calculates a "hotness score" (0-100) for stocks based on recent price drops relative to historical averages and volatility characteristics. The score identifies stocks with potential for quick returns in volatile markets.

## Input Data Format
- Array of N average prices from N recent periods (minimum N=2, recommended N=5-20)
- **Index 0**: Most recent period (CRITICAL: always first)
- **Index 1 to N-1**: Historical periods (progressively older)

Example with N=5: `[95, 99, 103, 101, 100]` where 95 is most recent
Example with N=10: `[92, 95, 98, 100, 102, 101, 99, 98, 97, 95]` where 92 is most recent

---

## Algorithm Implementation

### Step 1: Calculate Historical Average
Exclude the most recent price and calculate the average of all older periods.

```
historical_avg = sum(price[1] to price[N-1]) / (N - 1)
```

Where N is the total number of periods in your array.

### Step 2: Calculate Drop Percentage
Measure how much the most recent price has dropped relative to the historical average.

```
drop_percentage = ((historical_avg - price[0]) / historical_avg) × 100
```

**Important**: If `drop_percentage <= 0`, the price has gone up or stayed flat. This should result in a very low or zero score.

### Step 3: Calculate Base Drop Score (Criterion 1)
This is the primary scoring component (max 70 points by default).

```
if drop_percentage <= 0:
    drop_score = 0
else:
    drop_score = min(drop_max_score, drop_percentage × drop_sensitivity)
```

### Step 4: Calculate Volatility
Measure price variation across all N periods.

```
mean_price = sum(all N prices) / N
std_dev = standard_deviation(all N prices)
volatility_percentage = (std_dev / mean_price) × 100
```

### Step 5: Calculate Trend
Determine if the stock is trending up, down, or stable by comparing most recent to oldest.

```
trend_percentage = ((price[0] - price[N-1]) / price[N-1]) × 100
```

Where `price[N-1]` is the oldest price in your array.

**Interpretation**:
- Negative trend: Downtrend (price decreasing)
- Positive trend: Uptrend (price increasing)
- Near zero: Stable

### Step 6: Calculate Volatility Modifier (Criterion 2)
Adjust score based on volatility and trend direction (max 30 points by default).

```
if volatility_percentage < volatility_threshold:
    volatility_score = 0
else:
    // Normalize volatility (cap at 10% for scoring purposes)
    normalized_volatility = min(1.0, volatility_percentage / 10)
    
    // Apply multiplier based on trend
    if trend_percentage < -trend_boundary:
        // Downtrend: risky, small bonus
        multiplier = downtrend_penalty
    else if trend_percentage > trend_boundary:
        // Uptrend: best case, full bonus
        multiplier = uptrend_multiplier
    else:
        // Stable: moderate bonus
        multiplier = stable_multiplier
    
    volatility_score = normalized_volatility × volatility_max_bonus × multiplier
```

### Step 7: Calculate Final Hotness Score
Combine drop score and volatility modifier, capped at 100.

```
hotness_score = min(100, drop_score + volatility_score)
```

---

## Configurable Parameters

### UI Component Requirements
Create a settings panel with the following adjustable parameters:

| Parameter | Description | Default | Min | Max | Step |
|-----------|-------------|---------|-----|-----|------|
| `drop_sensitivity` | Controls how quickly drop score increases. Lower = need bigger drops for high scores | **15** | 10 | 25 | 0.5 |
| `drop_max_score` | Maximum points from drop alone (Criterion 1 weight) | **70** | 60 | 80 | 5 |
| `volatility_threshold` | Minimum volatility % to trigger bonus. Below this = no volatility bonus | **2.0** | 1.0 | 5.0 | 0.5 |
| `volatility_max_bonus` | Maximum points from volatility (Criterion 2 weight) | **30** | 20 | 40 | 5 |
| `downtrend_penalty` | Multiplier for volatile stocks trending down (risky) | **0.5** | 0.3 | 0.7 | 0.1 |
| `stable_multiplier` | Multiplier for volatile stocks with stable trend | **0.7** | 0.5 | 0.8 | 0.1 |
| `uptrend_multiplier` | Multiplier for volatile stocks trending up (best case) | **1.0** | 0.8 | 1.2 | 0.1 |
| `trend_boundary` | Percentage change that defines stable vs trending (±) | **3.0** | 2.0 | 5.0 | 0.5 |

### UI Layout Suggestion

```
┌─ Drop Settings (Criterion 1) ────────────────────┐
│ Drop Sensitivity:        [15    ] (10-25)        │
│ Max Drop Score:          [70    ] (60-80)        │
└──────────────────────────────────────────────────┘

┌─ Volatility Settings (Criterion 2) ──────────────┐
│ Volatility Threshold %:  [2.0   ] (1.0-5.0)      │
│ Max Volatility Bonus:    [30    ] (20-40)        │
└──────────────────────────────────────────────────┘

┌─ Trend Multipliers ──────────────────────────────┐
│ Downtrend Penalty:       [0.5   ] (0.3-0.7)      │
│ Stable Multiplier:       [0.7   ] (0.5-0.8)      │
│ Uptrend Multiplier:      [1.0   ] (0.8-1.2)      │
│ Trend Boundary %:        [3.0   ] (2.0-5.0)      │
└──────────────────────────────────────────────────┘

[Reset to Defaults] [Apply Custom Settings]
```

---

## Example Calculations

### Example 1: Small Recent Drop, Low Volatility (N=5)
**Prices**: `[99, 101, 102, 101, 100]`

```
N = 5
historical_avg = (101 + 102 + 101 + 100) / 4 = 101
drop_percentage = ((101 - 99) / 101) × 100 = 1.98%
drop_score = min(70, 1.98 × 15) = 29.7

volatility = 1.2% (< 2.0% threshold)
volatility_score = 0

hotness_score = 29.7 ≈ 30
```
**Interpretation**: Low score - minimal drop, no volatility.

### Example 2: Large Recent Drop, High Volatility Downtrend (N=5)
**Prices**: `[68, 101, 102, 101, 100]`

```
N = 5
historical_avg = 101
drop_percentage = ((101 - 68) / 101) × 100 = 32.67%
drop_score = min(70, 32.67 × 15) = 70 (capped)

volatility = 15.5% (> 2.0% threshold)
normalized_volatility = min(1, 15.5 / 10) = 1.0
trend = ((68 - 100) / 100) × 100 = -32% (downtrend)
volatility_score = 1.0 × 30 × 0.5 = 15

hotness_score = 70 + 15 = 85
```
**Interpretation**: Very high score - significant drop with volatility, but penalized for downtrend.

### Example 3: Moderate Drop, Medium Volatility Downtrend (N=5)
**Prices**: `[92, 101, 102, 101, 100]`

```
N = 5
historical_avg = 101
drop_percentage = 8.91%
drop_score = min(70, 8.91 × 15) = 53.4

volatility = 4.4%
normalized_volatility = min(1, 4.4 / 10) = 0.44
trend = -8% (downtrend)
volatility_score = 0.44 × 30 × 0.5 = 6.6

hotness_score = 53.4 + 6.6 = 60
```
**Interpretation**: Medium-high score - decent drop with some volatility.

### Example 4: Recent Drop, High Volatility Uptrend (N=5) - Sweet Spot
**Prices**: `[95, 98, 100, 105, 90]`

```
N = 5
historical_avg = 98.25
drop_percentage = 3.31%
drop_score = min(70, 3.31 × 15) = 49.6

volatility = 5.3%
normalized_volatility = min(1, 5.3 / 10) = 0.53
trend = ((95 - 90) / 90) × 100 = +5.6% (uptrend)
volatility_score = 0.53 × 30 × 1.0 = 15.9

hotness_score = 49.6 + 15.9 = 65.5
```
**Interpretation**: High score - buying the dip in a volatile growth stock!

### Example 5: Longer Period Analysis (N=10)
**Prices**: `[88, 92, 95, 98, 100, 102, 101, 99, 98, 95]`

```
N = 10
historical_avg = (92 + 95 + 98 + 100 + 102 + 101 + 99 + 98 + 95) / 9 = 97.78
drop_percentage = ((97.78 - 88) / 97.78) × 100 = 10.0%
drop_score = min(70, 10.0 × 15) = 70 (capped at max)

volatility = 4.2%
normalized_volatility = min(1, 4.2 / 10) = 0.42
trend = ((88 - 95) / 95) × 100 = -7.4% (downtrend)
volatility_score = 0.42 × 30 × 0.5 = 6.3

hotness_score = 70 + 6.3 = 76.3
```
**Interpretation**: High score with more historical context - significant recent drop in a stock that had been gradually climbing, now pulling back.

---

## Trader's Advice: Recommended Settings

### For Safe, Quick Returns in Volatile Markets

Based on a trading strategy focused on identifying stocks with recent dips that have potential for rapid recovery, particularly in volatile conditions, I recommend these adjusted settings:

#### Recommended Parameter Adjustments

| Parameter | Recommended Value | Reasoning |
|-----------|-------------------|-----------|
| `drop_sensitivity` | **18** (vs 15 default) | Be more aggressive in identifying meaningful drops - you want to catch opportunities early |
| `volatility_threshold` | **2.5%** (vs 2.0% default) | Only reward truly volatile stocks - filters out noise and focuses on stocks with real movement potential |
| `downtrend_penalty` | **0.4** (vs 0.5 default) | Be more cautious with volatile downtrends - they represent catching a falling knife, which is riskier |
| `uptrend_multiplier` | **1.0** (keep default) | Volatile uptrends with recent dips are your sweet spot - buying the dip in growth stocks |

Keep all other parameters at defaults.

### Trading Philosophy Behind These Settings

**What You're Looking For**:
1. **Recent meaningful dips** below historical average (primary signal)
2. **High volatility** suggesting quick price movements in either direction
3. **Ideally in stocks that were trending upward** before the dip (buying opportunity)

**What These Settings Optimize For**:

- **Higher drop_sensitivity (18)**: You'll get better scores on stocks with 5-10% drops, which are often reversible corrections rather than fundamental problems. This helps you spot "buy the dip" opportunities faster.

- **Higher volatility_threshold (2.5%)**: By requiring more volatility to trigger bonuses, you filter out stable, slow-moving stocks. You want stocks that move quickly so you can enter and exit positions within shorter timeframes.

- **Lower downtrend_penalty (0.4)**: Volatile stocks in downtrends are dangerous - the "falling knife" scenario. This penalty ensures you're very selective about these situations and only get high scores when the drop is truly exceptional.

- **Standard uptrend_multiplier (1.0)**: This is your ideal scenario - a volatile stock that was growing, experiences a temporary dip, and has high probability of continuing its upward trajectory. Full volatility bonus applies here.

### Interpreting Scores with These Settings

- **0-30**: Not interesting - either no drop, low volatility, or both
- **31-50**: Watch list - some drop but maybe not enough volatility or concerning trend
- **51-70**: Good candidates - meaningful drop with decent volatility characteristics
- **71-85**: Strong buy signals - significant drop in volatile stocks
- **86-100**: Exceptional opportunities - large drops in highly volatile stocks (verify fundamentals!)

### Risk Management Reminders

Even with high hotness scores, always:
1. **Check fundamentals** - a high score doesn't mean the company is healthy
2. **Verify volume** - ensure the volatility comes with actual trading activity
3. **Set stop-losses** - volatile stocks can move against you quickly
4. **Size positions appropriately** - higher scores = higher risk = smaller position sizes
5. **Don't chase scores above 90** - these are often distressed situations requiring deep due diligence

### When to Adjust Parameters

**Increase `drop_sensitivity` to 20-22** when:
- Market is highly efficient and small dips are rare
- You want to catch very early signals
- You're comfortable with more aggressive entry points

**Decrease `volatility_threshold` to 2.0%** when:
- Market is generally calm and high volatility is rare
- You want more candidates to evaluate
- You're okay with slower-moving opportunities

**Adjust trend multipliers** when:
- You want to be more/less aggressive on specific trend patterns
- Your backtesting shows different optimal values for your market segment
- Your risk tolerance changes

---

## Implementation Checklist

- [ ] Create input validation for N-price array (minimum N=2) with most recent first
- [ ] Implement all 7 calculation steps in sequence
- [ ] Ensure algorithm works correctly with variable N (test with N=2, N=5, N=10, N=20)
- [ ] Build parameter configuration UI with ranges and defaults
- [ ] Add "Reset to Defaults" and "Apply Trader Recommended" buttons
- [ ] Display breakdown of score (drop_score + volatility_score = total)
- [ ] Show visual indicators: drop %, volatility %, trend direction, N value used
- [ ] Add color coding: 0-30 (red), 31-60 (yellow), 61-85 (light green), 86+ (dark green)
- [ ] Include tooltips explaining each parameter's effect
- [ ] Store user preferences for parameter settings
- [ ] Add ability to save/load parameter presets
- [ ] Implement score history tracking to validate parameter effectiveness
- [ ] Allow users to specify or detect N from their data source

---

## Testing Scenarios

Test your implementation with these edge cases:

1. **All prices equal**: `[100, 100, 100, 100, 100]` → Should score 0
2. **Price went up**: `[110, 100, 100, 100, 100]` → Should score 0
3. **Extreme drop**: `[50, 100, 100, 100, 100]` → Should score 85-95
4. **High volatility, no drop**: `[100, 80, 110, 85, 105]` → Should score low
5. **Perfect scenario**: Recent dip in uptrend with volatility → Should score 70-85
6. **Minimum N (N=2)**: `[95, 100]` → Should calculate correctly with single historical price
7. **Large N (N=20)**: Test with 20 periods to ensure algorithm scales properly
8. **Gradual decline**: `[90, 91, 92, 93, 94, 95, 96, 97, 98, 99]` → Should show downtrend penalty

---

## Notes

- The algorithm works with any N ≥ 2, though N=5 to N=20 is recommended for best results
- **Shorter periods (N=3-5)**: More responsive to recent changes, better for day/swing trading
- **Longer periods (N=10-20)**: More stable signal, better for position trading, reduces noise
- The algorithm intentionally caps the total score at 100 to maintain scale
- Drop criterion is weighted more heavily (70 max) than volatility (30 max) because recent drops relative to average are more predictive of reversal opportunities
- Volatility without a drop is not rewarded - you need both conditions
- The most recent price position (index 0) is CRITICAL - ensure your data pipeline maintains this order
- With larger N, the historical average becomes more stable and drops become more significant signals