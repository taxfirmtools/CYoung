# Opening range

A desktop dashboard for the first 15 minutes of the US equity session. It records the high and low from **9:30:00 through 9:44:59 America/New_York** and shows whether the latest price is above that range, below it, or still inside. Names outside the range are highlighted and sorted to the top.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

`npm test` checks the session clock, the opening-range math, and the demo scenarios. `npm run build && npm start` serves the production build.

## Watchlist

The starting list is SPY, QQQ, AAPL, MSFT, NVDA, AMZN, META, and TSLA in [`src/config/watchlist.ts`](src/config/watchlist.ts). Change that file, or add and remove tickers in the header. Edits in the browser are saved in local storage on this computer until you choose **Reset list**.

## Data

**Live** uses Yahoo Finance’s public chart endpoint (1-minute bars, no API key). The feed is unofficial. Quotes can be delayed, and nothing here is a brokerage price.

**Demo** is simulated so the screen still works if the feed is down. The amber banner means those prices are not the market. Demo can show the range still forming (9:40am), a regular-hours session with breakouts (10:32am), or a closed session (4:10pm).

### Plug in another feed

`BarsProvider` in [`src/lib/types.ts`](src/lib/types.ts) is the adapter. A provider returns 1-minute bars (`t` as unix milliseconds, plus high, low, and close) and the latest price. The opening-range rules in [`src/lib/session.ts`](src/lib/session.ts) stay the same.

The current adapter is [`server/yahoo.ts`](server/yahoo.ts). To switch feeds, implement `BarsProvider` and use it in place of `yahooProvider` in [`server/index.ts`](server/index.ts). The browser only talks to `GET /api/opening-range?symbols=SPY,QQQ`.

## How the range is chosen

- The opening range is the high and low of regular-session 1-minute bars from 9:30:00 through 9:44:59 ET. The 9:45 bar is not included.
- Before 9:45am ET on a trading day, the range is still forming and breakouts are not signaled.
- Before 9:30am, after the close (4:00pm ET, or 1:00pm on the early closes listed in code), and on weekends and holidays, the dashboard keeps the latest completed session and says the session is closed. The comparison then uses that session’s regular-hours close, not a premarket or after-hours print.
- A price equal to the high or the low is still inside. Above means strictly above the high. Below means strictly below the low.

## Limits

- Yahoo Finance can rate-limit, change, or drop this unofficial endpoint. There is no API key and no service-level agreement.
- Prices may be delayed. Do not treat them as a live brokerage quote.
- The UI refreshes about every 20 seconds. Each symbol is cached on the server for 15 seconds.
- The holiday and early-close list covers 2025–2027 only. Later years skip weekends but do not know holidays.
- One-minute bars are stamped at the start of the minute. A missing minute is omitted, and the row says when fewer than 15 opening minutes came back.
- This is a scanner, not advice to buy or sell.
