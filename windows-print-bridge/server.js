const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const HOST = '127.0.0.1';
const PORT = 39876;
const APP_DIR = path.join(os.homedir(), 'AppData', 'Local', 'DilBebidasPrintBridge');
const SETTINGS_FILE = path.join(APP_DIR, 'settings.json');
const JOBS_DIR = path.join(APP_DIR, 'jobs');
const ALLOWED_ORIGINS = new Set([
  'https://www.dilbebidas.com.br',
  'https://dilbebidas.com.br',
  'https://extraplusdelivery.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

function ensureFolders() {
  fs.mkdirSync(APP_DIR, { recursive: true });
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk.toString('utf8');
      if (raw.length > 1024 * 1024) {
        reject(new Error('Body excede o limite permitido.'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('JSON invalido.'));
      }
    });
    req.on('error', reject);
  });
}

function resolveAllowedOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.has(origin)) return origin;
  return 'null';
}

function buildCorsHeaders(req) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': resolveAllowedOrigin(req),
    'Access-Control-Allow-Headers':
      'Content-Type, Access-Control-Request-Private-Network, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}

function sendJson(req, res, statusCode, payload) {
  res.writeHead(statusCode, {
    ...buildCorsHeaders(req)
  });
  res.end(JSON.stringify(payload));
}

function loadSettings() {
  ensureFolders();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      selectedPrinterName: typeof parsed.selectedPrinterName === 'string' ? parsed.selectedPrinterName : '',
      fallbackToBrowser: parsed.fallbackToBrowser !== false,
      printingMode: parsed.printingMode === 'browser-default' ? 'browser-default' : 'text-out-printer'
    };
  } catch {
    return {
      selectedPrinterName: '',
      fallbackToBrowser: true,
      printingMode: 'text-out-printer'
    };
  }
}

function saveSettings(nextSettings) {
  ensureFolders();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(nextSettings, null, 2), 'utf8');
  return nextSettings;
}

function execPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 10 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message || 'Falha ao executar PowerShell.'));
          return;
        }
        resolve(String(stdout || ''));
      }
    );
  });
}

async function listPrinters() {
  const raw = await execPowerShell(
    "Get-Printer | Select-Object Name,Default,DriverName,PortName | ConvertTo-Json -Depth 3"
  );
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list
    .filter(Boolean)
    .map(item => ({
      name: String(item.Name || ''),
      isDefault: Boolean(item.Default),
      driverName: item.DriverName ? String(item.DriverName) : '',
      portName: item.PortName ? String(item.PortName) : ''
    }))
    .filter(item => item.name);
}

function escapePowerShellSingleQuoted(value) {
  return String(value || '').replace(/'/g, "''");
}

async function printText({ content, printerName }) {
  ensureFolders();
  const filePath = path.join(JOBS_DIR, `pedido-${Date.now()}.txt`);
  fs.writeFileSync(filePath, String(content || ''), 'utf8');

  const safeFilePath = escapePowerShellSingleQuoted(filePath);
  const safePrinterName = escapePowerShellSingleQuoted(printerName);
  await execPowerShell(`Get-Content -Path '${safeFilePath}' | Out-Printer -Name '${safePrinterName}'`);
  return filePath;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(req, res, 404, { message: 'Rota nao encontrada.' });
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(req, res, 200, { ok: true });
    return;
  }

  try {
    if (req.method === 'GET' && req.url === '/health') {
      const settings = loadSettings();
      const printers = await listPrinters();
      sendJson(req, res, 200, {
        ok: true,
        service: 'dil-bebidas-windows-print-bridge',
        version: '1.0.0',
        selectedPrinterName: settings.selectedPrinterName || null,
        printersAvailable: printers.length
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/printers') {
      const printers = await listPrinters();
      sendJson(req, res, 200, { printers });
      return;
    }

    if (req.method === 'GET' && req.url === '/settings') {
      sendJson(req, res, 200, loadSettings());
      return;
    }

    if (req.method === 'PUT' && req.url === '/settings') {
      const body = await readJsonBody(req);
      const settings = saveSettings({
        selectedPrinterName:
          typeof body.selectedPrinterName === 'string' ? body.selectedPrinterName.trim() : '',
        fallbackToBrowser: body.fallbackToBrowser !== false,
        printingMode: body.printingMode === 'browser-default' ? 'browser-default' : 'text-out-printer'
      });
      sendJson(req, res, 200, settings);
      return;
    }

    if (req.method === 'POST' && req.url === '/print-text') {
      const body = await readJsonBody(req);
      const settings = loadSettings();
      const selectedPrinterName =
        typeof body.printerName === 'string' && body.printerName.trim()
          ? body.printerName.trim()
          : settings.selectedPrinterName;
      const content = typeof body.content === 'string' ? body.content : '';

      if (!selectedPrinterName) {
        sendJson(req, res, 400, { message: 'Nenhuma impressora selecionada no bridge.' });
        return;
      }
      if (!content.trim()) {
        sendJson(req, res, 400, { message: 'Conteudo vazio para impressao.' });
        return;
      }

      const printers = await listPrinters();
      const printerExists = printers.some(printer => printer.name === selectedPrinterName);
      if (!printerExists) {
        sendJson(req, res, 400, { message: 'A impressora selecionada nao foi encontrada no Windows.' });
        return;
      }

      const filePath = await printText({ content, printerName: selectedPrinterName });
      sendJson(req, res, 200, {
        ok: true,
        printerName: selectedPrinterName,
        mode: 'text-out-printer',
        filePath
      });
      return;
    }

    sendJson(req, res, 404, { message: 'Rota nao encontrada.' });
  } catch (error) {
    sendJson(req, res, 500, {
      message: error instanceof Error ? error.message : 'Erro interno no bridge local.'
    });
  }
});

ensureFolders();
server.listen(PORT, HOST, () => {
  console.log(`Dil Bebidas Windows Print Bridge ouvindo em http://${HOST}:${PORT}`);
});
