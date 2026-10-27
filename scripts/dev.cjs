const { spawn } = require('node:child_process');
const path = require('node:path');

const root = process.cwd();
const children = [
  spawn(process.execPath, ['--watch', 'src/server.js'], { cwd: path.join(root, 'server'), stdio: 'inherit' }),
  spawn(process.execPath, [path.join(root, 'client/node_modules/vite/bin/vite.js'), '--host', '0.0.0.0', '--configLoader', 'runner'], { cwd: path.join(root, 'client'), stdio: 'inherit' })
];

function stopAll(code = 0) {
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  process.exit(code);
}

for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stopAll(1); });
  child.on('exit', (code) => { if (code !== null && code !== 0) stopAll(code); });
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
