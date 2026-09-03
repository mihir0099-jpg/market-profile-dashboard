
async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/scanner');
    const data = await res.json();
    console.log("Scanner status:", data.status, "Progress:", data.progress);
    console.log("Scanner results count:", data.results.length);
    
    const traps = data.results.filter(r => r.breakoutFailure && r.breakoutFailure !== 'none');
    console.log(`\n=== Breakout Failure Traps found (${traps.length}): ===`);
    traps.forEach(r => {
      console.log(`Symbol: ${r.symbol}, Type: ${r.breakoutFailure}, Price: ${r.price}, Target: ${r.breakoutFailureTarget}`);
    });

    const magnets = data.results.filter(r => r.magnetTarget && r.magnetTarget !== 'none');
    console.log(`\n=== Active Magnet Targets found (${magnets.length}): ===`);
    magnets.forEach(r => {
      console.log(`Symbol: ${r.symbol}, Type: ${r.magnetTarget}, Price: ${r.price}, MagnetPrice: ${r.magnetPrice}`);
    });

    const unfinished = data.results.filter(r => r.unfinishedAuctions && (r.unfinishedAuctions.poorHighs.length > 0 || r.unfinishedAuctions.poorLows.length > 0));
    console.log(`\n=== Stocks with Unfinished Auctions (${unfinished.length}): ===`);
    unfinished.slice(0, 10).forEach(r => {
      console.log(`Symbol: ${r.symbol}, Poor Highs Count: ${r.unfinishedAuctions.poorHighs.length}, Poor Lows Count: ${r.unfinishedAuctions.poorLows.length}`);
      if (r.unfinishedAuctions.poorHighs.length > 0) {
        console.log(`  Poor Highs:`, r.unfinishedAuctions.poorHighs.map(h => `₹${h.price} on ${h.date}`).join(', '));
      }
      if (r.unfinishedAuctions.poorLows.length > 0) {
        console.log(`  Poor Lows:`, r.unfinishedAuctions.poorLows.map(l => `₹${l.price} on ${l.date}`).join(', '));
      }
    });

  } catch (err) {
    console.error("Failed to fetch scanner API:", err.message);
  }
}

test();
