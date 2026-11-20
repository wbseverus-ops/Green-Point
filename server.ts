import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function isAllowedGasUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    return (
      parsed.hostname === 'script.google.com' ||
      parsed.hostname === 'script.googleusercontent.com'
    );
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/gas-proxy', async (req, res) => {
    const { url, method = 'GET', payload } = req.body ?? {};

    if (typeof url !== 'string' || !isAllowedGasUrl(url)) {
      return res.status(400).json({
        ok: false,
        error: 'URL ไม่ถูกต้อง กรุณาใช้ลิงก์ Web App จาก https://script.google.com/macros/s/.../exec',
      });
    }

    try {
      const upperMethod = method === 'POST' ? 'POST' : 'GET';
      const targetUrl =
        upperMethod === 'GET'
          ? `${url}${url.includes('?') ? '&' : '?'}mode=api&t=${Date.now()}`
          : url;

      const response = await fetch(targetUrl, {
        method: upperMethod,
        headers:
          upperMethod === 'POST'
            ? { 'Content-Type': 'text/plain;charset=utf-8' }
            : undefined,
        body: upperMethod === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
        redirect: 'follow',
      });

      const rawText = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const snippet = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
        return res.status(502).json({
          ok: false,
          error:
            'Google Apps Script ไม่ได้ตอบกลับเป็น JSON (ตรวจสอบว่าตั้งค่า Who has access เป็น "Anyone" และ Deploy เวอร์ชันล่าสุดแล้ว)',
          detail: snippet,
        });
      }

      return res.status(response.ok ? 200 : 502).json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อ Google Apps Script ได้';
      return res.status(502).json({
        ok: false,
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulsePoint HR server running on http://localhost:${PORT}`);
  });
}

startServer();
