import net from 'net';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(tag, message, color = colors.cyan) {
  console.log(`${color}${colors.bold}[${tag}]${colors.reset} ${message}`);
}

function isPortOpen(port, host = '127.0.0.1', timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port, host = '127.0.0.1', maxWaitMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortOpen(port, host, 200)) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

function findPhpBinary() {
  const candidates = [
    'C:\\xampp\\php\\php.exe',
    'C:\\php\\php.exe',
    'php',
  ];
  for (const c of candidates) {
    if (c === 'php') return 'php';
    if (fs.existsSync(c)) return c;
  }
  return 'php';
}

function findMysqlBinary() {
  const candidates = [
    'C:\\xampp\\mysql\\bin\\mysqld.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

let phpChild = null;

function cleanup() {
  if (phpChild && !phpChild.killed) {
    log('System', 'Stopping Backend PHP server...', colors.yellow);
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', phpChild.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
      } else {
        phpChild.kill('SIGTERM');
      }
    } catch {
      // Ignore cleanup error
    }
    phpChild = null;
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});

async function main() {
  console.log(`\n${colors.cyan}${colors.bold}======================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}    AURORA CINEMAS EMS - FULLSTACK LAUNCHER (Backend + Frontend)     ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================================${colors.reset}\n`);

  // 1. Kiểm tra MySQL Database (Port 3306)
  const mysqlRunning = await isPortOpen(3306);
  if (mysqlRunning) {
    log('Database', `MySQL is active on port 3306 ${colors.green}✓${colors.reset}`, colors.green);
  } else {
    const mysqlBin = findMysqlBinary();
    if (mysqlBin) {
      log('Database', `MySQL port 3306 not open. Auto-starting XAMPP MySQL...`, colors.yellow);
      const mysqlIni = 'C:\\xampp\\mysql\\bin\\my.ini';
      try {
        const args = fs.existsSync(mysqlIni)
          ? [`--defaults-file=${mysqlIni}`, '--standalone']
          : ['--standalone'];
        const mysqlProc = spawn(mysqlBin, args, {
          detached: true,
          stdio: 'ignore',
        });
        mysqlProc.unref();
        const opened = await waitForPort(3306, '127.0.0.1', 4000);
        if (opened) {
          log('Database', `MySQL started successfully on port 3306 ${colors.green}✓${colors.reset}`, colors.green);
        } else {
          log('Database', `MySQL started (waiting for port 3306)`, colors.yellow);
        }
      } catch (err) {
        log('Database', `Notice: Unable to auto-start MySQL (${err.message}). Make sure XAMPP MySQL is running.`, colors.yellow);
      }
    } else {
      log('Database', `Notice: Port 3306 not detected. Please start MySQL in XAMPP if using database.`, colors.yellow);
    }
  }

  // 2. Kiểm tra Backend PHP Server (Port 8000)
  const backendRunning = await isPortOpen(8000);
  const backendDir = path.resolve(__dirname, '..', 'backend');
  const serverPhp = path.join(backendDir, 'server.php');

  if (backendRunning) {
    log('Backend', `PHP API Server is already active on http://127.0.0.1:8000 ${colors.green}✓${colors.reset}`, colors.green);
  } else {
    if (fs.existsSync(serverPhp)) {
      const phpBin = findPhpBinary();
      log('Backend', `Starting PHP API Server on http://127.0.0.1:8000...`, colors.cyan);

      phpChild = spawn(phpBin, ['-S', '127.0.0.1:8000', serverPhp], {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      phpChild.stdout?.on('data', (d) => {
        const line = d.toString().trim();
        if (line) log('Backend', line, colors.gray);
      });

      phpChild.stderr?.on('data', (d) => {
        const line = d.toString().trim();
        // PHP built-in server prints access requests to stderr
        if (line) {
          if (line.includes('Development Server (http://127.0.0.1:8000) started')) {
            log('Backend', `Ready at http://127.0.0.1:8000 ${colors.green}✓${colors.reset}`, colors.green);
          } else if (!line.includes('Closing')) {
            log('Backend', line, colors.gray);
          }
        }
      });

      phpChild.on('error', (err) => {
        log('Backend', `Error starting PHP server: ${err.message}`, colors.red);
      });

      const backendReady = await waitForPort(8000, '127.0.0.1', 4000);
      if (backendReady) {
        log('Backend', `Backend API Server ready at http://127.0.0.1:8000 ${colors.green}✓${colors.reset}`, colors.green);
      }
    } else {
      log('Backend', `Warning: Could not find ${serverPhp}`, colors.yellow);
    }
  }

  // 3. Khởi chạy Vite Dev Server cho Frontend
  log('Frontend', `Starting Vite Dev Server...\n`, colors.cyan);

  const viteBin = path.resolve(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  const userArgs = process.argv.slice(2).filter((arg) => arg !== '--');
  const viteArgs = [viteBin, '--host', ...userArgs];

  const viteProc = spawn(process.execPath, viteArgs, {
    cwd: __dirname,
    stdio: 'inherit',
  });

  viteProc.on('exit', (code) => {
    cleanup();
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('Launcher Error:', err);
  cleanup();
  process.exit(1);
});
