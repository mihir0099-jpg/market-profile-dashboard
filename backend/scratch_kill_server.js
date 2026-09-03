import { exec } from 'child_process';
exec('wmic process where "name=\'node.exe\'" get processid,commandline', (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const lines = stdout.split('\n');
  let killed = false;
  for (const line of lines) {
    if (line.includes('server.js') && !line.includes('scratch_kill_server.js')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        console.log(`[Scratch Kill] Found server.js process. Killing PID: ${pid}`);
        try {
          process.kill(parseInt(pid, 10), 'SIGKILL');
          killed = true;
        } catch (e) {
          console.error(`Failed to kill process ${pid}:`, e);
        }
      }
    }
  }
  if (!killed) {
    console.log('[Scratch Kill] No running server.js process found.');
  }
  process.exit(0);
});
