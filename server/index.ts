import express from "express";
import { fileURLToPath } from "node:url";
import { analyzeSession, describeSession, toQuote, unavailableQuote } from "../src/lib/session";
import { parseSymbolList } from "../src/lib/symbols";
import type { Snapshot } from "../src/lib/types";
import { yahooProvider } from "./yahoo";

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || (isProd ? 5173 : 5174);
const host = process.env.HOST || "127.0.0.1";

const app = express();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider: yahooProvider.id });
});

app.get("/api/opening-range", async (req, res) => {
  const symbols = parseSymbolList(req.query.symbols);
  if (symbols.length === 0) {
    res.status(400).json({ error: "Add at least one symbol." });
    return;
  }

  const now = new Date();
  const session = describeSession(now);
  const quotes = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const data = await yahooProvider.getSymbol(symbol);
        const analysis = analyzeSession({
          now,
          bars: data.bars,
          livePrice: data.livePrice,
          liveTime: data.liveTime,
          previousClose: data.previousClose,
        });
        return toQuote(symbol, data.name, analysis);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Quote unavailable";
        return unavailableQuote(symbol, now, message);
      }
    }),
  );

  const body: Snapshot = {
    source: "yahoo",
    delayed: yahooProvider.delayed,
    asOf: now.toISOString(),
    note: "Unofficial Yahoo Finance data. Quotes may be delayed and are not a brokerage feed.",
    session: {
      phase: session.phase,
      sessionDate: session.sessionDate,
      sessionStatus: session.sessionStatus,
    },
    quotes,
  };
  res.set("Cache-Control", "no-store");
  res.json(body);
});

if (isProd) {
  const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(fileURLToPath(new URL("../dist/index.html", import.meta.url)));
  });
}

const server = app.listen(port, host, () => {
  console.log(`Opening range API at http://${host}:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  }
  throw error;
});
