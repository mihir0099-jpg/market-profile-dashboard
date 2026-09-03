import * as fs from 'fs';
import * as path from 'path';

const dateStr = process.argv[2] || new Date().toISOString().split('T')[0];
const filepath = `C:\\Users\\mihir\\.gemini\\antigravity\\brain\\0d19a8b8-947a-40b3-bff1-c041605b3a93\\reports\\daily_report_${dateStr}.md`;
if (!fs.existsSync(filepath)) {
  console.error(`Error: File does not exist at ${filepath}`);
  process.exit(1);
}
const content = fs.readFileSync(filepath, 'utf8');

const lines = content.split('\n');
const trades = [];

// Parse the trades table
let inTable = false;
for (const line of lines) {
  if (line.includes('| **NSE:') || line.includes('| **COINBASE:') || line.includes('| **DELTAIN:') || line.includes('| **OANDA:')) {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 9) {
      const symbol = parts[1].replace(/\*\*/g, '');
      const strategy = parts[2];
      const type = parts[3];
      const direction = parts[4].replace(/\*\*/g, '');
      const entry = parseFloat(parts[5]);
      const target = parseFloat(parts[6]);
      const sl = parseFloat(parts[7]);
      const status = parts[8].replace(/\*\*/g, '');
      const pnl = parseFloat(parts[9]) || 0;
      
      trades.push({ symbol, strategy, type, direction, entry, target, sl, status, pnl });
    }
  }
}

// Group by strategy
const stats = {};
trades.forEach(t => {
  if (!stats[t.strategy]) {
    stats[t.strategy] = { count: 0, targetHit: 0, slHit: 0, active: 0, totalPnl: 0 };
  }
  const s = stats[t.strategy];
  s.count++;
  if (t.status === 'TARGET_HIT') s.targetHit++;
  else if (t.status === 'STOP_LOSS_HIT') s.slHit++;
  else s.active++;
  
  s.totalPnl += t.pnl;
});

console.log('=== TODAY\'S TRADE STRATEGY BREAKDOWN ===');
Object.entries(stats).forEach(([name, s]) => {
  const winRate = s.count - s.active > 0 ? ((s.targetHit / (s.count - s.active)) * 100).toFixed(1) : 0;
  console.log(`\nStrategy: ${name}`);
  console.log(`- Total Trades: ${s.count} (Active: ${s.active})`);
  console.log(`- Target Hits: ${s.targetHit} | SL Hits: ${s.slHit}`);
  console.log(`- Win Rate: ${winRate}%`);
  console.log(`- Net PnL (pts): ${s.totalPnl.toFixed(2)}`);
});
