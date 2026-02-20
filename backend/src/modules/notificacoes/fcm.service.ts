import axios from 'axios';

export class FcmService {
  async enviarNotificacao(token: string, titulo: string, corpo: string, dados?: Record<string, unknown>) {
    const key = process.env.FCM_SERVER_KEY;
    if (!key) {
      return;
    }

    await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        to: token,
        notification: {
          title: titulo,
          body: corpo
        },
        data: dados || {}
      },
      {
        headers: {
          Authorization: `key=${key}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
