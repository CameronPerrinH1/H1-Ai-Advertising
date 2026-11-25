// Starts the local API, the widget, and the demo spa website together.
import { spawn } from 'node:child_process';

const procs = [
  { name: 'api', color: 35, args: ['--filter', '@concierge/backend', 'dev'] },
  { name: 'widget', color: 36, args: ['--filter', '@concierge/widget', 'dev'] },
  { name: 'site', color: 33, args: ['--filter', '@concierge/widget', 'exec', 'vite', '--config', '../demo-site/vite.config.mjs'] },
];

const children = procs.map(({ name, color, args }) => {
  const child = spawn('pnpm', args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CONCIERGE_DEBUG: '1' } });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const relay = (stream, out) =>
    stream.on('data', (buf) => {
      for (const line of buf.toString().split('\n')) if (line.trim()) out.write(prefix + line + '\n');
    });
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on('exit', (code) => {
    process.stdout.write(`${prefix}exited (${code ?? 'signal'})\n`);
    shutdown();
  });
  return child;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (!c.killed) c.kill('SIGTERM');
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

setTimeout(() => {
  process.stdout.write(
    '\n  Demo spa website:  http://localhost:5180\n' +
      '  Widget only:       http://localhost:5173/?mode=fullscreen\n' +
      '  Handoff emails:    .outbox/\n\n',
  );
}, 2500);
