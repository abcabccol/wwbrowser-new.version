import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import path from "path";
import https from "https";
import fs from "fs";
import http from "http";

type BlockedDomainPayload = {
  updatedAt: string;
  region: string;
  domains: string[];
  currency: string;
};

const blockedByRegion: Record<string, string[]> = {
  TR: [
    "example-blocked-tr.com",
    "banned-streaming.example",
  ],
  EU: [
    "example-blocked-eu.com",
  ],
  GLOBAL: [
    "malware-example.com",
  ],
};

function resolveRegionByLatLon(lat?: number, lon?: number): string {
  if (typeof lat !== "number" || typeof lon !== "number") return "GLOBAL";

  // Rough geo buckets for demo.
  if (lat >= 35 && lat <= 43 && lon >= 25 && lon <= 45) return "TR";
  if (lat >= 35 && lat <= 72 && lon >= -10 && lon <= 40) return "EU";
  return "GLOBAL";
}

function getBlockedPayload(lat?: number, lon?: number): BlockedDomainPayload {
  const region = resolveRegionByLatLon(lat, lon);
  const domains = [...(blockedByRegion[region] ?? []), ...(blockedByRegion.GLOBAL ?? [])];
  const currencyByRegion: Record<string, string> = {
    TR: "TRY",
    EU: "EUR",
    GLOBAL: "USD",
  };
  return {
    updatedAt: new Date().toISOString(),
    region,
    domains: Array.from(new Set(domains)),
    currency: currencyByRegion[region] ?? "USD",
  };
}

function stripHtml(value: string = "") {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractPrice(text: string) {
  const m = text.match(/([$€£¥]|TL|TRY|EUR|USD|GBP)\s?\d[\d.,]*/i) ?? text.match(/\d[\d.,]*\s?(TL|TRY|EUR|USD|GBP|\$|€|£|¥)/i);
  return m?.[0] ?? "";
}

function looksLikeUrl(input: string) {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
}

function extractBingWebResults(html: string, limit: number) {
  const matches = Array.from(
    html.matchAll(
      /<li class="b_algo"[\s\S]*?<h2><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/gi,
    ),
  ).slice(0, limit);

  return matches.map((m, idx) => {
    const url = decodeEntities(m[1] ?? "");
    const title = stripHtml(decodeEntities(m[2] ?? ""));
    const snippet = stripHtml(decodeEntities(m[3] ?? ""));
    let favicon = "";
    try {
      const host = new URL(url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch {
      // ignore favicon
    }
    return {
      id: `${idx}`,
      title: title || url,
      url,
      snippet,
      favicon,
    };
  });
}

async function bingWebSearch(query: string, limit = 24) {
  const response = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
    timeout: 12000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    },
  });
  return extractBingWebResults(String(response.data ?? ""), limit);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // Ignore self-signed certificates for the proxy
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const keepAliveHttps = new https.Agent({ rejectUnauthorized: false, keepAlive: true, maxSockets: 120 });
  const keepAliveHttp = new http.Agent({ keepAlive: true, maxSockets: 120 });
  const flashCache = new Map<string, { html: string; expiresAt: number }>();

  // WW-BrowserAi engine endpoint (no API key, pluggable later)
  app.post("/api/ai", async (req, res) => {
    const body = (req.body ?? {}) as {
      task?: "synthesize" | "chat" | "translate" | "detectLanguage";
      input?: string;
      context?: string;
      language?: string;
      targetLang?: string;
    };

    const task = body.task ?? "chat";
    const input = body.input ?? "";
    const language = body.language ?? "tr";

    // NOTE: This is an engine stub. Replace with your own model runner.
    if (task === "detectLanguage") {
      return res.json({ text: "Unknown" });
    }

    if (task === "translate") {
      const targetLang = body.targetLang ?? "English";
      return res.json({
        text:
          language === "tr"
            ? `Çeviri motoru (WW-BrowserAi) henüz bağlanmadı. Hedef: ${targetLang}\n\n${input}`
            : `Translation engine (WW-BrowserAi) not connected yet. Target: ${targetLang}\n\n${input}`,
      });
    }

    if (task === ("generateMedia" as any)) {
      const type = (req.body?.type as string | undefined) ?? "image";
      const prompt = (req.body?.prompt as string | undefined) ?? "";
      if (type === "video") {
        return res.json({
          visuals: [
            {
              type: "video",
              url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
              prompt,
            },
          ],
        });
      }
      const seed = encodeURIComponent(prompt || Date.now().toString());
      return res.json({
        visuals: [
          {
            type: "image",
            url: `https://picsum.photos/seed/${seed}/1024/768`,
            prompt,
          },
        ],
      });
    }

    if (task === "synthesize") {
      return res.json({
        text:
          language === "tr"
            ? `# WW-BrowserAi\n\nSentez isteği alındı.\n\n**Sorgu**: ${input}\n\n> Not: Bu şu an yerel motor iskeleti. Kendi modelini bağlayınca gerçek cevapları burada üreteceğiz.`
            : `# WW-BrowserAi\n\nSynthesis request received.\n\n**Query**: ${input}\n\n> Note: This is a local engine stub. When you connect your own model, real answers will be generated here.`,
      });
    }

    return res.json({
      text:
        language === "tr"
          ? `WW-BrowserAi: Mesaj alındı.\n\n${input}`
          : `WW-BrowserAi: Message received.\n\n${input}`,
    });
  });

  app.get("/api/license", async (_req, res) => {
    try {
      const licensePath = path.join(process.cwd(), "..", "..", "LICENSE.txt");
      const text = await fs.promises.readFile(licensePath, "utf8");
      res.type("text/plain").send(text);
    } catch (err) {
      res
        .status(404)
        .type("text/plain")
        .send("LICENSE.txt not found in workspace root.");
    }
  });

  app.get("/api/blocked-sites", (req, res) => {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lon = req.query.lon ? Number(req.query.lon) : undefined;
    const payload = getBlockedPayload(lat, lon);
    res.json(payload);
  });

  app.get("/api/image-search", async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const response = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}`, {
        timeout: 12000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        },
      });
      const html = String(response.data ?? "");

      const matches = Array.from(
        html.matchAll(/<a class="iusc"[\s\S]*?m="([^"]+)"[\s\S]*?<\/a>/gi),
      ).slice(0, 36);

      const images = matches
        .map((m, idx) => {
          const raw = decodeEntities(m[1] ?? "");
          const murl = raw.match(/"murl":"(.*?)"/)?.[1]?.replace(/\\\//g, "/");
          const purl = raw.match(/"purl":"(.*?)"/)?.[1]?.replace(/\\\//g, "/");
          const t = raw.match(/"t":"(.*?)"/)?.[1]?.replace(/\\u0026/g, "&");
          if (!murl || !purl) return null;
          let sourceLabel = "";
          try {
            sourceLabel = new URL(purl).hostname;
          } catch {
            sourceLabel = "Web";
          }
          return {
            id: `${idx}`,
            title: stripHtml(decodeEntities(t || "Untitled")),
            imageUrl: murl,
            sourceUrl: purl,
            sourceLabel,
            description: stripHtml(decodeEntities(t || "")),
          };
        })
        .filter(Boolean);

      return res.json({ images });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message ?? "Image search failed" });
    }
  });

  app.get("/api/site-search", async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const sources = await bingWebSearch(q, 48);
      return res.json({ sources });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message ?? "Site search failed" });
    }
  });

  app.get("/api/shop-search", async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const currency = (req.query.currency as string | undefined)?.toUpperCase() || "USD";
    if (!q) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const web = await bingWebSearch(`${q} buy price`, 36);
      const currencyRegex = new RegExp(`(${currency}|\\$|€|£|¥|TL)\\s?\\d[\\d.,]*|\\d[\\d.,]*\\s?(${currency}|\\$|€|£|¥|TL)`, "i");
      const products = web.map((item, idx) => {
        const priceFromText = extractPrice(`${item.title} ${item.snippet}`);
        const normalizedPrice = currencyRegex.test(priceFromText) ? priceFromText : "";
        return {
        id: `${idx}`,
          name: item.title,
          about: item.snippet || "Product information available on source website.",
          siteUrl: item.url,
          price: normalizedPrice || `~ ${currency} (see product page)`,
        };
      });
      return res.json({ products });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message ?? "Shop search failed" });
    }
  });

  // WW-FlashServer: URL opener + search resolver + fast fetch layer.
  app.get("/api/flash/resolve", (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (!q) return res.status(400).json({ error: "Query is required" });
    const normalizedUrl = looksLikeUrl(q) ? (q.startsWith("http") ? q : `https://${q}`) : "";
    const searchUrl = normalizedUrl ? "" : `https://www.bing.com/search?q=${encodeURIComponent(q)}`;
    return res.json({
      engine: "WW-FlashServer",
      direct: Boolean(normalizedUrl),
      url: normalizedUrl || searchUrl,
    });
  });

  app.get("/api/flash/fetch", async (req, res) => {
    const targetUrl = String(req.query.url ?? "").trim();
    if (!targetUrl) return res.status(400).json({ error: "URL is required" });

    const now = Date.now();
    const cached = flashCache.get(targetUrl);
    if (cached && cached.expiresAt > now) {
      res.setHeader("X-WW-Flash-Cache", "HIT");
      res.setHeader("Content-Type", "text/html");
      return res.send(cached.html);
    }

    try {
      const response = await axios.get(targetUrl, {
        timeout: 8000,
        maxRedirects: 10,
        validateStatus: (status) => status < 500,
        responseType: "arraybuffer",
        httpAgent: keepAliveHttp,
        httpsAgent: keepAliveHttps,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 WW-FlashServer/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
        },
      });

      let html = Buffer.from(response.data).toString("utf8");
      const urlObj = new URL(targetUrl);
      const baseUrl = urlObj.origin;
      html = html.replace(/(src|href|srcset|action)=["'](\/(?!\/)[^"']+)["']/g, (_m, p1, p2) => `${p1}="${baseUrl}${p2}"`);
      const currentPath = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      html = html.replace(/(src|href|srcset|action)=["'](\.\/[^"']+)["']/g, (_m, p1, p2) => `${p1}="${currentPath}${String(p2).substring(2)}"`);

      flashCache.set(targetUrl, { html, expiresAt: now + 30_000 });
      res.setHeader("X-WW-Flash-Cache", "MISS");
      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message ?? "WW-FlashServer fetch failed" });
    }
  });

  // Proxy endpoint with improved asset handling and smarter security
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    
    if (!targetUrl) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // First try the original URL as is
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
        },
        timeout: 10000,
        maxRedirects: 10,
        validateStatus: (status) => status < 500,
        httpsAgent: httpsAgent,
        responseType: 'arraybuffer' // Handle potential non-utf8 encodings
      });

      // Detect and convert encoding if necessary, or just use buffer
      let html = response.data.toString('utf8');

      // Strip headers that prevent iframing
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');

      // Less aggressive scanner
      const riskyPatterns = ['eval(atob(', 'powershell', 'cmd.exe', 'document.write(unescape(', 'fromcharcode(', 'crypto.subtle.decrypt'];
      const securityRisk = typeof html === 'string' && riskyPatterns.some(p => html.toLowerCase().includes(p.toLowerCase()));

      const urlObj = new URL(targetUrl);
      const baseUrl = urlObj.origin;
      
      // Rewrite relative URLs to absolute
      if (typeof html === 'string') {
        // Simple regex-based replacement for common attributes
        html = html.replace(/(src|href|srcset|action)=["'](\/(?!\/)[^"']+)["']/g, (match, p1, p2) => {
          return `${p1}="${baseUrl}${p2}"`;
        });
        
        // Handle current directory relatives (./path)
        const currentPath = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
        html = html.replace(/(src|href|srcset|action)=["'](\.\/[^"']+)["']/g, (match, p1, p2) => {
          return `${p1}="${currentPath}${p2.substring(2)}"`;
        });
      }

      const baseTag = `<base href="${baseUrl}/">`;
      
      const interceptorScript = `
        <script>
          // Link interceptor for dynamic content
          function intercept() {
            document.querySelectorAll('a').forEach(link => {
              if (link && link.href && !link.href.startsWith('javascript:') && !link.dataset.wwIntercepted) {
                link.dataset.wwIntercepted = 'true';
                const url = new URL(link.href);
                if (url.origin !== window.location.origin) {
                  link.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.parent.postMessage({ type: 'WW_NAVIGATE', url: link.href }, '*');
                  });
                }
              }
            });
          }
          
          setInterval(intercept, 1000);
          intercept();

          window.open = function(url) {
            window.parent.postMessage({ type: 'WW_NAVIGATE', url: url }, '*');
          };
          
          // Disable framed block checks
          window.onbeforeunload = null;
          delete window.top;
          window.top = window.self;
        </script>
        <style>
           /* Prevent frame-busting UI shifts */
           html, body { overflow-x: hidden !important; }
        </style>
      `;
      
      if (typeof html === 'string') {
        const headContent = baseTag + interceptorScript;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${headContent}`);
        } else if (html.includes('<html>')) {
          html = html.replace('<html>', `<html><head>${headContent}</head>`);
        } else {
          html = headContent + html;
        }
      }

      if (securityRisk && !req.query.bypassSecurity) {
        res.setHeader('Content-Type', 'text/html');
        return res.send(`
          <body style="background:#050505; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding: 20px;">
            <div style="font-size:120px; color:#FF5F56; margin-bottom:20px;">⚠️</div>
            <h1 style="font-size:24px;">WW Anti-Hack Koruması</h1>
            <p style="color:#aaa; max-width:540px; line-height:1.6;">Bu site güvenli değil. Yine de girmek ister misin?</p>
            <div style="display:flex; gap:10px;">
              <button onclick="location.href+='&bypassSecurity=true'" style="background:#4A90E2; border:none; color:white; padding:12px 24px; border-radius:8px; cursor:pointer; margin-top:20px; font-weight:bold;">Yine de Gir</button>
              <button onclick="window.parent.postMessage({type:'WW_NAVIGATE', url:'ww://ai.home'}, '*')" style="background:transparent; border:1px solid #333; color:white; padding:12px 24px; border-radius:8px; cursor:pointer; margin-top:20px;">Güvenli Alana Dön</button>
            </div>
          </body>
        `);
      }

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error: any) {
      res.setHeader('Content-Type', 'text/html');
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { background: #050505; color: #E0E0E0; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .hero { font-size: 100px; font-weight: bold; opacity: 0.1; margin-bottom: 20px; }
            .footer { padding: 40px; }
            .title { font-size: 18px; color: #FF5F56; font-weight: bold; margin-bottom: 8px; }
            .desc { font-size: 13px; color: #666; max-width: 400px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="hero">NODE_REFUSED</div>
          <div class="footer">
            <div class="title">BİLEŞEN SENTEZİ BAŞARISIZ</div>
            <div class="desc">Hedef sunucuya erişilemiyor veya SSL sertifikasyonu doğrulanamadı. <br><br> Trace: ${error.message}</div>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WW AI Browser Server running on http://localhost:${PORT}`);
  });
}

startServer();
