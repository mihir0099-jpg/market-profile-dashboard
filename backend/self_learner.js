import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const signalsPath = path.join(__dirname, 'signals.json');
const paramsPath = path.join(__dirname, 'learned_params.json');
const journalPath = path.join(__dirname, 'learning_journal.json');

export function optimizeParameters() {
  console.log('[Self Learner] Running strategy parameter optimization...');
  
  if (!fs.existsSync(signalsPath)) {
    console.log('[Self Learner] No trades database found yet. Skipping learning loop.');
    return;
  }
  
  if (!fs.existsSync(paramsPath)) {
    console.log('[Self Learner] Learned parameters file not found. Skipping.');
    return;
  }

  try {
    const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
    const params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
    
    // Filter closed/resolved trades
    const closedTrades = signals.filter(t => t.status === 'TARGET_HIT' || t.status === 'STOP_LOSS_HIT' || t.status === 'EXPIRED');
    if (closedTrades.length === 0) {
      console.log('[Self Learner] No resolved trades in database to learn from.');
      return;
    }

    // Group by strategy
    const groups = {
      btst: [],
      trap: [],
      magnet: [],
      drive: [],
      gperiod: [],
      sweep: [],
      wreversion: [],
      wgap: []
    };

    closedTrades.forEach(t => {
      const stratKey = t.strategy.toLowerCase().includes('btst') ? 'btst' :
                       t.strategy.toLowerCase().includes('trap') ? 'trap' :
                       t.strategy.toLowerCase().includes('magnet') ? 'magnet' :
                       t.strategy.toLowerCase().includes('drive') ? 'drive' :
                       t.strategy.toLowerCase().includes('g-period') ? 'gperiod' :
                       t.strategy.toLowerCase().includes('sweep') ? 'sweep' :
                       t.strategy.toLowerCase().includes('poc reversion') ? 'wreversion' :
                       t.strategy.toLowerCase().includes('gap fade') ? 'wgap' : null;
      if (stratKey && groups[stratKey]) {
        groups[stratKey].push(t);
      }
    });

    const logs = [];
    let updated = false;

    Object.entries(groups).forEach(([strat, trades]) => {
      if (trades.length < 3) {
        console.log(`[Self Learner] Strategy ${strat.toUpperCase()} has only ${trades.length} closed trades. (Requires >= 3 to optimize).`);
        return;
      }

      const wins = trades.filter(t => t.status === 'TARGET_HIT' || (t.status === 'EXPIRED' && t.pnlPoints > 0)).length;
      const total = trades.length;
      const winRate = wins / total;
      console.log(`[Self Learner] ${strat.toUpperCase()} Win Rate: ${(winRate * 100).toFixed(1)}% (${wins}/${total})`);

      if (winRate < 0.55) {
        // Performance is low -> TIGHTEN filters to increase win rate
        if (strat === 'btst') {
          const oldVal = params.btst.closeStrengthThreshold;
          if (oldVal < 0.93) {
            params.btst.closeStrengthThreshold = Math.min(0.93, oldVal + 0.03);
            logs.push(`Tightened BTST close strength threshold from ${oldVal.toFixed(2)} to ${params.btst.closeStrengthThreshold.toFixed(2)} due to low win rate of ${(winRate * 100).toFixed(1)}%`);
            updated = true;
          }
        } else if (strat === 'trap') {
          const oldVal = params.trap.balancePeriodDays;
          if (oldVal < 6) {
            params.trap.balancePeriodDays = Math.min(6, oldVal + 1);
            logs.push(`Increased Balance Trap range lookup from ${oldVal} to ${params.trap.balancePeriodDays} days to filter fake breakouts.`);
            updated = true;
          }
        } else if (strat === 'magnet') {
          const oldVal = params.magnet.magnetBufferPercent;
          if (oldVal > 0.002) {
            params.magnet.magnetBufferPercent = Math.max(0.002, oldVal - 0.0005);
            logs.push(`Reduced Auction Magnet trigger zone buffer from ${(oldVal*100).toFixed(3)}% to ${(params.magnet.magnetBufferPercent*100).toFixed(3)}% for stricter entry proximity.`);
            updated = true;
          }
        } else if (strat === 'drive') {
          const oldVal = params.drive.requireGap;
          if (!oldVal) {
            params.drive.requireGap = true;
            logs.push(`Enforced pre-market gap requirement for Opening Drive strategy due to low win rate of ${(winRate*100).toFixed(1)}%`);
            updated = true;
          }
        } else if (strat === 'gperiod') {
          const oldVal = params.gperiod.maxIbWidthPct;
          if (oldVal > 0.015) {
            params.gperiod.maxIbWidthPct = Math.max(0.015, oldVal - 0.002);
            logs.push(`Tightened G-Period stock max IB width threshold from ${(oldVal*100).toFixed(2)}% to ${(params.gperiod.maxIbWidthPct*100).toFixed(2)}% due to low win rate of ${(winRate*100).toFixed(1)}%`);
            updated = true;
          }
        } else if (strat === 'sweep') {
          const oldVal = params.sweep.rejectionMultiplier;
          if (oldVal < 2.2) {
            params.sweep.rejectionMultiplier = Math.min(2.2, oldVal + 0.1);
            logs.push(`Increased Liquidity Sweep rejection multiplier from ${oldVal.toFixed(1)}x to ${params.sweep.rejectionMultiplier.toFixed(1)}x due to low win rate of ${(winRate*100).toFixed(1)}%`);
            updated = true;
          }
        } else if (strat === 'wreversion') {
          const oldVal = params.wreversion.minWinRateThreshold;
          if (oldVal < 0.85) {
            params.wreversion.minWinRateThreshold = Math.min(0.85, oldVal + 0.05);
            logs.push(`Increased Weekly Reversion min leader win rate from ${(oldVal*100).toFixed(0)}% to ${(params.wreversion.minWinRateThreshold*100).toFixed(0)}% due to low win rate of ${(winRate*100).toFixed(1)}%`);
            updated = true;
          }
          const oldPcr = params.wreversion.pcrDriftFilter;
          if (oldPcr < 0.05) {
            params.wreversion.pcrDriftFilter = Math.min(0.05, oldPcr + 0.01);
            logs.push(`Tightened Weekly Reversion PCR drift requirement from ${oldPcr.toFixed(3)} to ${params.wreversion.pcrDriftFilter.toFixed(3)}`);
            updated = true;
          }
        } else if (strat === 'wgap') {
          const oldVal = params.wgap.minWinRateThreshold;
          if (oldVal < 0.85) {
            params.wgap.minWinRateThreshold = Math.min(0.85, oldVal + 0.05);
            logs.push(`Increased Weekly Gap Fade min leader win rate from ${(oldVal*100).toFixed(0)}% to ${(params.wgap.minWinRateThreshold*100).toFixed(0)}% due to low win rate of ${(winRate*100).toFixed(1)}%`);
            updated = true;
          }
          const oldGap = params.wgap.maxGapSizePct;
          if (oldGap > 0.02) {
            params.wgap.maxGapSizePct = Math.max(0.02, oldGap - 0.005);
            logs.push(`Decreased max allowed gap size to fade from ${(oldGap*100).toFixed(2)}% to ${(params.wgap.maxGapSizePct*100).toFixed(2)}%`);
            updated = true;
          }
        }
      } else if (winRate >= 0.70 && total >= 5) {
        // Performance is very high -> RELAX filters to generate more signals
        if (strat === 'btst') {
          const oldVal = params.btst.closeStrengthThreshold;
          if (oldVal > 0.80) {
            params.btst.closeStrengthThreshold = Math.max(0.80, oldVal - 0.02);
            logs.push(`Relaxed BTST close strength threshold from ${oldVal.toFixed(2)} to ${params.btst.closeStrengthThreshold.toFixed(2)} to capture more high-edge setups.`);
            updated = true;
          }
        } else if (strat === 'trap') {
          const oldVal = params.trap.balancePeriodDays;
          if (oldVal > 3) {
            params.trap.balancePeriodDays = Math.max(3, oldVal - 1);
            logs.push(`Decreased Balance Trap range lookup from ${oldVal} to ${params.trap.balancePeriodDays} days to catch faster consolidations.`);
            updated = true;
          }
        } else if (strat === 'magnet') {
          const oldVal = params.magnet.magnetBufferPercent;
          if (oldVal < 0.006) {
            params.magnet.magnetBufferPercent = Math.min(0.006, oldVal + 0.0005);
            logs.push(`Increased Auction Magnet trigger zone buffer from ${(oldVal*100).toFixed(3)}% to ${(params.magnet.magnetBufferPercent*100).toFixed(3)}% to increase signal volume.`);
            updated = true;
          }
        } else if (strat === 'drive') {
          const oldVal = params.drive.requireGap;
          if (oldVal) {
            params.drive.requireGap = false;
            logs.push(`Relaxed pre-market gap requirement for Opening Drive strategy to increase signal volume.`);
            updated = true;
          }
        } else if (strat === 'gperiod') {
          const oldVal = params.gperiod.maxIbWidthPct;
          if (oldVal < 0.035) {
            params.gperiod.maxIbWidthPct = Math.min(0.035, oldVal + 0.002);
            logs.push(`Relaxed G-Period stock max IB width threshold from ${(oldVal*100).toFixed(2)}% to ${(params.gperiod.maxIbWidthPct*100).toFixed(2)}% to allow more setups.`);
            updated = true;
          }
        } else if (strat === 'sweep') {
          const oldVal = params.sweep.rejectionMultiplier;
          if (oldVal > 1.2) {
            params.sweep.rejectionMultiplier = Math.max(1.2, oldVal - 0.1);
            logs.push(`Decreased Liquidity Sweep rejection multiplier from ${oldVal.toFixed(1)}x to ${params.sweep.rejectionMultiplier.toFixed(1)}x to increase signal volume.`);
            updated = true;
          }
        } else if (strat === 'wreversion') {
          const oldVal = params.wreversion.minWinRateThreshold;
          if (oldVal > 0.60) {
            params.wreversion.minWinRateThreshold = Math.max(0.60, oldVal - 0.05);
            logs.push(`Decreased Weekly Reversion min leader win rate from ${(oldVal*100).toFixed(0)}% to ${(params.wreversion.minWinRateThreshold*100).toFixed(0)}% to capture more signals.`);
            updated = true;
          }
          const oldPcr = params.wreversion.pcrDriftFilter;
          if (oldPcr > 0.01) {
            params.wreversion.pcrDriftFilter = Math.max(0.01, oldPcr - 0.01);
            logs.push(`Relaxed Weekly Reversion PCR drift requirement from ${oldPcr.toFixed(3)} to ${params.wreversion.pcrDriftFilter.toFixed(3)}`);
            updated = true;
          }
        } else if (strat === 'wgap') {
          const oldVal = params.wgap.minWinRateThreshold;
          if (oldVal > 0.60) {
            params.wgap.minWinRateThreshold = Math.max(0.60, oldVal - 0.05);
            logs.push(`Decreased Weekly Gap Fade min leader win rate from ${(oldVal*100).toFixed(0)}% to ${(params.wgap.minWinRateThreshold*100).toFixed(0)}% to capture more signals.`);
            updated = true;
          }
          const oldGap = params.wgap.maxGapSizePct;
          if (oldGap < 0.06) {
            params.wgap.maxGapSizePct = Math.min(0.06, oldGap + 0.005);
            logs.push(`Increased max allowed gap size to fade from ${(oldGap*100).toFixed(2)}% to ${(params.wgap.maxGapSizePct*100).toFixed(2)}%`);
            updated = true;
          }
        }
      }
    });

    if (updated) {
      fs.writeFileSync(paramsPath, JSON.stringify(params, null, 2), 'utf8');
      console.log('[Self Learner] Strategy parameters updated and saved.');
      
      // Save to journal
      let journal = [];
      if (fs.existsSync(journalPath)) {
        try {
          journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
        } catch (e) {
          journal = [];
        }
      }
      journal.push({
        timestamp: new Date().toISOString(),
        modifications: logs
      });
      fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
    } else {
      console.log('[Self Learner] Parameters are already optimized for current win rates.');
    }

  } catch (err) {
    console.error('[Self Learner] Error running parameter optimizer:', err.message);
  }
}
