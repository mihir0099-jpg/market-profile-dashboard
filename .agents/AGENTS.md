# Agent Learning Guidelines

When resuming or starting a new conversation in this workspace, always perform the following actions:
1. Read the latest entries in [market_diary.md](file:///C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93/market_diary.md) and [market_analysis_report.md](file:///C:/Users/mihir/.gemini/antigravity/brain/0d19a8b8-947a-40b3-bff1-c041605b3a93/market_analysis_report.md) to inspect the recent daily session logs, predictions, outcomes, and takeaways.
2. Discuss the latest learnings with the user:
   - Check if the "Open Outside Range" alerts accurately predicted gap acceptance (continuation) vs. gap rejection (reversal).
   - Verify if Poor Highs/Lows from yesterday were successfully resolved today.
   - Analyze if e-Failures correctly predicted trend exhaustion during live drives.
3. Propose and implement adjustments to the calculations in [profileCalculator.ts](file:///C:/Users/mihir/.gemini/antigravity/scratch/market-profile-dashboard/frontend/src/utils/profileCalculator.ts) if you identify consistent edge cases, false signals, or new layout rules.

## Live Scanner & Architecture Setup
4. **Single-Port Mode Enforcement**: Always serve the frontend via the backend on port `3001` (serving static files from `frontend/dist`). Do not run the standalone Vite dev server (on `5173`) unless testing UI changes locally.
5. **Background Live Scanner**: Keep the background scanner in `backend/scanner.js` running continuously. It polls all 207 preset symbols in batches of 5 concurrently, parses their 30-minute historical snapshots, and closes socket connections immediately via `safeCleanup` to prevent session leaks.
6. **Failed Auction, OTF & Poor Extreme Alerts**: Check the live scanner logs and `/api/scanner` responses. Verify that the scanner is properly filtering and highlighting stocks with active OTFs (`otfType !== 'none'`) + d/e Failed Auctions, Poor Highs/Lows, and **AB Poor Extremes** (formed in Period A/B). Highlight these setups clearly to the user.
7. **Iterative Refinement with Live Data**: Proactively analyze live scanner output for false breakouts or misaligned failure alerts in the live market. Brainstorm and implement new indicator nuances (e.g., consolidation thickness, second POC penetrations, balance breakouts) with the user to continuously refine and create the perfect trading setup.

## Bhaichara Actionable Trading Setup Playbook (Calls vs. Puts)
8. **Buying Calls (Long Setups) & Stop Losses**:
   - **80% Rule Bullish Entry**: Buy calls when price enters and accepts (closes a 30-min bar) inside yesterday's Value Area from below VAL.
     - **Entry Location**: Near yesterday's VAL.
     - **Stop Loss**: Just below today's Low or VAL.
     - **Targets**: Prior POC, then prior VAH.
   - **Double Distribution Bullish Entry**: Buy calls when price accepts inside yesterday's Upper Distribution.
     - **Entry Location**: Near yesterday's DD single-print gap top.
     - **Stop Loss**: Below the single-print gap zone.
     - **Targets**: Day High, then Fib 2.618x extension.
   - **P-Shape Support Entry**: Buy calls near the prior day's P-shape base support.
     - **Entry Location**: Yesterday's VAL (the P-profile base).
     - **Stop Loss**: Just below yesterday's VAL.
   - **e-Failure Low Entry (Reversion)**: Under OTF Down control, Period E breaks below Period D low, but Period F fails to extend.
     - **Entry Location**: Near Period E low.
     - **Stop Loss**: Just below Period E low.
     - **Targets**: Mean reversion to POC.

9. **Buying Puts (Short Setups) & Stop Losses**:
   - **80% Rule Bearish Entry**: Buy puts when price enters and accepts (closes a 30-min bar) inside yesterday's Value Area from above VAH.
     - **Entry Location**: Near yesterday's VAH.
     - **Stop Loss**: Just above today's High or VAH.
     - **Targets**: Prior POC, then prior VAL.
   - **Double Distribution Bearish Entry**: Buy puts when price accepts inside yesterday's Lower Distribution.
     - **Entry Location**: Near yesterday's DD single-print gap bottom.
     - **Stop Loss**: Above the single-print gap zone.
     - **Targets**: Day Low, then Fib 2.618x extension.
   - **b-Shape Resistance Entry**: Buy puts near the prior day's b-shape top resistance.
     - **Entry Location**: Yesterday's VAH (the b-profile top).
     - **Stop Loss**: Just above yesterday's VAH.
   - **e-Failure High Entry (Reversion)**: Under OTF Up control, Period E breaks above Period D high, but Period F fails to extend.
     - **Entry Location**: Near Period E high.
     - **Stop Loss**: Just above Period E high.
     - **Targets**: Mean reversion to POC.

## ⚠️ Failed Auction Rules Progression
10. **Failed Auctions under active OTF (OTF Up or OTF Down)**:
    - **c-Failure**: If Period D does not break Period C's trend extreme (C High for OTF Up, C Low for OTF Down), warning `c-Failure can happen` is shown (early trend weakness).
    - **d-Failure**: If Period D successfully extended the OTF trend, but Period E fails to break Period D's trend extreme (D High for OTF Up, D Low for OTF Down), `d-Failure` is active. This carries an **80% probability of reversing to the opposite extreme of the day** (Day Low for OTF Up, Day High for OTF Down).
    - **e-Failure**: If Period E successfully extended the OTF trend, but Period F fails to break Period E's trend extreme (E High for OTF Up, E Low for OTF Down), `e-Failure` is active. This carries an **80% probability of retesting/extending E period's extreme** in the later session.
