// Прокси для YooKassa webhook
// Этот файл должен быть размещен на сервере allcourt.ru

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Логируем входящий запрос
    console.log('YooKassa webhook received at allcourt.ru:', {
      headers: req.headers,
      body: req.body
    });

    // Проксируем запрос к Firebase Function
    const response = await fetch('https://europe-west1-sports-booking-app-1d7e5.cloudfunctions.net/yookassaWebhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Передаем оригинальные заголовки YooKassa
        'http-signature': req.headers['http-signature'] || '',
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        'x-original-host': 'allcourt.ru'
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.text();
    
    // Возвращаем ответ YooKassa
    res.status(response.status).send(result);
  } catch (error) {
    console.error('Error proxying YooKassa webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}