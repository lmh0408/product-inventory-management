function isAllowedWebhook(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      /\/macros\/s\/[^/]+\/exec$/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'GET만 지원합니다.' });
    return;
  }
  const webhookUrl = String(req.query.webhookUrl || '');
  if (!isAllowedWebhook(webhookUrl)) {
    res.status(400).json({ ok: false, error: '웹앱 URL이 올바르지 않습니다.' });
    return;
  }
  try {
    const response = await fetch(webhookUrl, {
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 SheetStockSync/1.0' },
    });
    const parsed = JSON.parse(await response.text());
    res.status(200).json({
      ok: true,
      dataVersion: typeof parsed.dataVersion === 'number' ? parsed.dataVersion : null,
    });
  } catch {
    res.status(200).json({ ok: true, dataVersion: null });
  }
}
