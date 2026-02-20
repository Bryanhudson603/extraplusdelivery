export interface PixGateway {
  criarCobranca(dados: { pedidoId: string; valor: number }): Promise<{
    txid: string;
    qrCodePayload: string;
    qrCodeImagemUrl?: string;
  }>;

  consultarCobranca(txid: string): Promise<{ status: 'pendente' | 'confirmado' | 'cancelado' | 'falhou' }>;
}
