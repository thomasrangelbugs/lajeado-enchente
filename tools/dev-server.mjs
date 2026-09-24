/**
 * Servidor local com proxy /p/ng e /p/ana (igual ao Netlify).
 * Uso: node tools/dev-server.mjs
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8765;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function proxy(req, res, target) {
  https
    .get(target, (up) => {
      const headers = {
        "Content-Type": up.headers["content-type"] || "application/octet-stream",
        "Cache-Control": "public, max-age=120"
      };
      res.writeHead(up.statusCode || 200, headers);
      up.pipe(res);
    })
    .on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Falha ao buscar dados externos.");
    });
}

function serveStatic(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Não encontrado");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);

  if (url.pathname.startsWith("/p/ng/")) {
    const rest = url.pathname.slice("/p/ng/".length);
    return proxy(req, res, `https://nivelguaiba.com.br/${rest}${url.search}`);
  }

  if (url.pathname === "/p/ana") {
    const q = url.search || "";
    return proxy(
      req,
      res,
      `https://telemetriaws1.ana.gov.br/ServiceANA.asmx/DadosHidrometeorologicos${q}`
    );
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const filePath = path.normalize(path.join(root, rel));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  serveStatic(req, res, filePath);
});

server.listen(port, () => {
  console.log(`Dev server: http://127.0.0.1:${port} (proxy /p/ng e /p/ana ativo)`);
});
