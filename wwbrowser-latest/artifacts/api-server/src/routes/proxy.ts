import { Router, type IRouter } from "express";
import axios from "axios";
import https from "https";

const router: IRouter = Router();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

router.get("/proxy", async (req, res) => {
  const targetUrl = req.query["url"] as string | undefined;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      timeout: 10000,
      maxRedirects: 10,
      validateStatus: (status) => status < 500,
      httpsAgent,
      responseType: "arraybuffer",
    });

    let html = (response.data as Buffer).toString("utf8");

    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");

    const riskyPatterns = ["eval(atob(", "powershell", "cmd.exe"];
    const securityRisk =
      typeof html === "string" &&
      riskyPatterns.some((p) => html.toLowerCase().includes(p.toLowerCase()));

    const urlObj = new URL(targetUrl);
    const baseUrl = urlObj.origin;

    if (typeof html === "string") {
      html = html.replace(
        /(src|href|srcset|action)=["'](\/(?!\/)[^"']+)["']/g,
        (_match, p1, p2) => `${p1}="${baseUrl}${p2}"`,
      );

      const currentPath = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      html = html.replace(
        /(src|href|srcset|action)=["'](\.\/[^"']+)["']/g,
        (_match, p1, p2) => `${p1}="${currentPath}${p2.substring(2)}"`,
      );
    }

    const baseTag = `<base href="${baseUrl}/">`;
    const interceptorScript = `
      <script>
        function intercept() {
          document.querySelectorAll('a').forEach(link => {
            if (link && link.href && !link.href.startsWith('javascript:') && !link.dataset.wwIntercepted) {
              link.dataset.wwIntercepted = 'true';
              try {
                const url = new URL(link.href);
                if (url.origin !== window.location.origin) {
                  link.addEventListener('click', function(e) {
                    e.preventDefault();
                    window.parent.postMessage({ type: 'WW_NAVIGATE', url: link.href }, '*');
                  });
                }
              } catch(e) {}
            }
          });
        }
        setInterval(intercept, 1000);
        intercept();
        window.open = function(url) {
          window.parent.postMessage({ type: 'WW_NAVIGATE', url: url }, '*');
        };
        window.onbeforeunload = null;
      </script>
      <style> html, body { overflow-x: hidden !important; } </style>
    `;

    if (typeof html === "string") {
      const headContent = baseTag + interceptorScript;
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${headContent}`);
      } else if (html.includes("<html>")) {
        html = html.replace("<html>", `<html><head>${headContent}</head>`);
      } else {
        html = headContent + html;
      }
    }

    if (securityRisk && !req.query["bypassSecurity"]) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`
        <body style="background:#050505; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; padding: 20px;">
          <div style="font-size:120px; color:#FF5F56; margin-bottom:20px;">!</div>
          <h1 style="font-size:24px;">GUVENLIK ANALIZI</h1>
          <p style="color:#aaa; max-width:400px; line-height:1.6;">Bu site supheli kod bloklari icermektedir. WW Zafiyet Motoru baglantiyi izole etti.</p>
          <div style="display:flex; gap:10px;">
            <button onclick="location.href+='&bypassSecurity=true'" style="background:#4A90E2; border:none; color:white; padding:12px 24px; border-radius:8px; cursor:pointer; margin-top:20px; font-weight:bold;">Yine de Goruntule</button>
            <button onclick="window.parent.postMessage({type:'WW_NAVIGATE', url:'ww://ai.home'}, '*')" style="background:transparent; border:1px solid #333; color:white; padding:12px 24px; border-radius:8px; cursor:pointer; margin-top:20px;">Guvenli Alana Don</button>
          </div>
        </body>
      `);
    }

    res.setHeader("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.setHeader("Content-Type", "text/html");
    return res.status(500).send(`
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
            <div class="title">BILESEN SENTEZI BASARISIZ</div>
            <div class="desc">Hedef sunucuya erisilemiyor veya SSL sertifikasyonu dogrulanamadi.<br><br>Trace: ${message}</div>
          </div>
        </body>
      </html>
    `);
  }
});

export default router;
