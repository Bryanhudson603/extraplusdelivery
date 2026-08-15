export type BridgePrinter = {
  name: string;
  isDefault: boolean;
  driverName?: string;
  portName?: string;
};

export type BridgeSettings = {
  selectedPrinterName: string;
  fallbackToBrowser: boolean;
  printingMode: 'text-out-printer' | 'browser-default';
  charactersPerLine: number;
};

const BRIDGE_BASE_URL = 'http://127.0.0.1:39876';

async function bridgeRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const requestInit: RequestInit & { targetAddressSpace?: 'loopback' } = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    cache: 'no-store',
    mode: 'cors',
    credentials: 'omit',
    targetAddressSpace: 'loopback'
  };

  const response = await fetch(`${BRIDGE_BASE_URL}${path}`, requestInit);

  const raw = await response.text();
  const payload = raw.trim() ? JSON.parse(raw) : {};
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message || 'Erro no bridge local.')
        : 'Erro no bridge local.';
    throw new Error(message);
  }
  return payload as T;
}

export async function getBridgeHealth(): Promise<{
  ok: boolean;
  selectedPrinterName?: string | null;
  printersAvailable?: number;
}> {
  return bridgeRequest('/health', { method: 'GET' });
}

export async function listBridgePrinters(): Promise<BridgePrinter[]> {
  const response = await bridgeRequest<{ printers: BridgePrinter[] }>('/printers', { method: 'GET' });
  return Array.isArray(response.printers) ? response.printers : [];
}

export async function getBridgeSettings(): Promise<BridgeSettings> {
  return bridgeRequest('/settings', { method: 'GET' });
}

export async function updateBridgeSettings(settings: Partial<BridgeSettings>): Promise<BridgeSettings> {
  return bridgeRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export async function printViaBridge(content: string, printerName?: string): Promise<void> {
  await bridgeRequest('/print-text', {
    method: 'POST',
    body: JSON.stringify({
      content,
      printerName
    })
  });
}
