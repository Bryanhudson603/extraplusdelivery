export const WHATSAPP_NUMBER = '558288430373';
export const PIX_KEY = '82988430373';
export const PIX_KEY_DISPLAY = '(82) 98843-0373';

export function buildWhatsAppLink(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsApp(mensagem: string): void {
  window.open(buildWhatsAppLink(mensagem), '_blank', 'noopener,noreferrer');
}
