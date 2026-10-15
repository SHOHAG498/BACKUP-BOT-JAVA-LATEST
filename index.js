const http = require('http');
const https = require('https');
const mineflayer = require('mineflayer');

// --- ১. HTTP Web Server (Render Monitoring) ---
const PORT = process.env.PORT || 10000;
let backupBotOnline = false;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      message: 'Backup Bot Service Active!',
      backup_bot_connected: backupBotOnline,
      uptime: Math.floor(process.uptime()) + ' seconds'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP Server] Backup monitor running on port ${PORT}`);
});

// --- ২. Config & Setup ---
const MAIN_BOT_URL = 'https://sr-aternos-afk-bot-latest.onrender.com/health';
const SERVER_HOST = 'SRSHOHAG27-rDUc.aternos.me';
const SERVER_PORT = 50912;
const VERSION = '1.20.4';

let backupBot = null;

// Backup Bot Connect Logic
function startBackupBot() {
  if (backupBot || backupBotOnline) return;

  console.log('[Backup System] Main bot down detected! Connecting Backup Bot 2 in 1s...');
  
  setTimeout(() => {
    backupBot = mineflayer.createBot({
      host: SERVER_HOST,
      port: SERVER_PORT,
      username: 'SR_AFK_Bot_2',
      version: VERSION
    });

    backupBot.on('spawn', () => {
      console.log('>>> [SUCCESS] SR_AFK_Bot_2 (Backup) joined the server! <<<');
      backupBotOnline = true;

      // Anti-AFK Swing Arm
      setInterval(() => {
        if (backupBot && backupBot.entity) {
          backupBot.swingArm('right');
        }
      }, 20000);
    });

    backupBot.on('end', (reason) => {
      console.log(`[Backup Bot Disconnected] Reason: ${reason}`);
      backupBotOnline = false;
      backupBot = null;
    });

    backupBot.on('error', (err) => {
      console.log('[Backup Bot Error]', err.message);
      backupBotOnline = false;
      backupBot = null;
    });
  }, 1000);
}

// Main Bot URL Checker Function
function checkMainBotStatus() {
  https.get(MAIN_BOT_URL, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        // যদি মেইন বট কানেক্টেড না থাকে
        if (response.bot1_connected === false) {
          startBackupBot();
        } else if (response.bot1_connected === true && backupBot) {
          console.log('[Backup System] Main Bot is back online! Disconnecting backup bot...');
          backupBot.quit();
          backupBot = null;
          backupBotOnline = false;
        }
      } catch (err) {
        startBackupBot();
      }
    });

  }).on('error', (err) => {
    console.log('[Check Failed] Main URL down or unreachable. Starting backup bot...');
    startBackupBot();
  });
}

// প্রতি ৩০ সেকেন্ড পরপর Main Bot-এর URL চেক করবে
setInterval(checkMainBotStatus, 30000);

// অ্যাপ চালু হলেই প্রথমবার চেক করবে
checkMainBotStatus();

// Global Crash Handler
process.on('uncaughtException', (err) => {
  console.error('[System Alert] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[System Alert] Unhandled Rejection:', reason);
});
