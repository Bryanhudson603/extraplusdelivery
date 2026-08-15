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

const DEFAULT_CHARACTERS_PER_LINE = 32;
const MIN_CHARACTERS_PER_LINE = 16;
const MAX_CHARACTERS_PER_LINE = 80;

function normalizeCharactersPerLine(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CHARACTERS_PER_LINE;
  const rounded = Math.round(parsed);
  return Math.min(MAX_CHARACTERS_PER_LINE, Math.max(MIN_CHARACTERS_PER_LINE, rounded));
}

function loadSettings() {
  ensureFolders();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      selectedPrinterName: typeof parsed.selectedPrinterName === 'string' ? parsed.selectedPrinterName : '',
      fallbackToBrowser: parsed.fallbackToBrowser !== false,
      printingMode: parsed.printingMode === 'browser-default' ? 'browser-default' : 'text-out-printer',
      charactersPerLine: normalizeCharactersPerLine(parsed.charactersPerLine)
    };
  } catch {
    return {
      selectedPrinterName: '',
      fallbackToBrowser: true,
      printingMode: 'text-out-printer',
      charactersPerLine: DEFAULT_CHARACTERS_PER_LINE
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

// ESC/POS: comandos crus da impressora termica.
const ESC = 0x1b;
const GS = 0x1d;

// Envia os bytes direto pro spooler como datatype RAW (sem passar pelo
// renderizador GDI do driver, que era a causa do texto quebrando
// caractere por caractere: o driver usava uma fonte grande demais para a
// largura fisica de 57/58mm, sobrando so 3-4 caracteres por linha).
const RAW_PRINTER_HELPER_CSHARP = `
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string printerName, byte[] bytes) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Extraplus Print Bridge";
        di.pDataType = "RAW";
        bool success = false;

        if (OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int written;
                    success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return success;
    }
}
`;

// Monta o cupom em ESC/POS: inicializa a impressora, envia o texto ja
// formatado/quebrado (recebido pronto do painel) linha a linha, alimenta
// papel e manda o comando de corte parcial no final.
function buildEscPosReceipt(content) {
  const initBytes = Buffer.from([ESC, 0x40]); // ESC @ - inicializa impressora
  const lineBuffers = String(content || '')
    .split(/\r\n|\n/)
    .map(line => Buffer.concat([Buffer.from(line, 'latin1'), Buffer.from([0x0a])]));
  const bodyBytes = Buffer.concat(lineBuffers);
  const feedAndCutBytes = Buffer.concat([
    Buffer.from([0x0a, 0x0a, 0x0a, 0x0a]),
    Buffer.from([GS, 0x56, 0x42, 0x00]) // GS V 66 0 - corte parcial
  ]);
  return Buffer.concat([initBytes, bodyBytes, feedAndCutBytes]);
}

async function printText({ content, printerName }) {
  ensureFolders();
  const receiptBytes = buildEscPosReceipt(content);
  const filePath = path.join(JOBS_DIR, `pedido-${Date.now()}.bin`);
  fs.writeFileSync(filePath, receiptBytes);

  const safeFilePath = escapePowerShellSingleQuoted(filePath);
  const safePrinterName = escapePowerShellSingleQuoted(printerName);

  const script = `
Add-Type -TypeDefinition @"
${RAW_PRINTER_HELPER_CSHARP}
"@

$bytes = [System.IO.File]::ReadAllBytes('${safeFilePath}')
$ok = [RawPrinterHelper]::SendBytesToPrinter('${safePrinterName}', $bytes)
if (-not $ok) { throw 'Falha ao enviar dados RAW para a impressora.' }
`;

  await execPowerShell(script);
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
      const currentSettings = loadSettings();
      const settings = saveSettings({
        selectedPrinterName:
          typeof body.selectedPrinterName === 'string'
            ? body.selectedPrinterName.trim()
            : currentSettings.selectedPrinterName,
        fallbackToBrowser: body.fallbackToBrowser !== false,
        printingMode: body.printingMode === 'browser-default' ? 'browser-default' : 'text-out-printer',
        charactersPerLine:
          body.charactersPerLine !== undefined
            ? normalizeCharactersPerLine(body.charactersPerLine)
            : currentSettings.charactersPerLine
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
        mode: 'escpos-raw',
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
