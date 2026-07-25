const levels = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', success: '\x1b[32m' };
const reset = '\x1b[0m';

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = levels[level] || '';
  // eslint-disable-next-line no-console
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
}

module.exports = {
  info: (msg) => log('info', msg),
  warn: (msg) => log('warn', msg),
  error: (msg) => log('error', msg),
  success: (msg) => log('success', msg),
};
