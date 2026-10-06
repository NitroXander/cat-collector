import { spawn } from 'node:child_process'
import process from 'node:process'

/**
 * Runs a command with ELECTRON_RUN_AS_NODE removed.
 *
 * That variable is set to 1 in this machine's environment, which makes
 * electron.exe start as a plain Node process instead of an Electron app.
 * Every script that launches Electron (dev, preview) goes through here.
 */
const [, , command, ...args] = process.argv

if (!command) {
  console.error('usage: node scripts/run.mjs <command> [args...]')
  process.exit(1)
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env
})

child.on('close', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 0)
})
