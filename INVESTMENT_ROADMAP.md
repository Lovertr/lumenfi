# Investment Module Roadmap (Lumenfi)

แผนพัฒนาโมดูลการลงทุน 4 ระดับ — จากเครื่องมือบันทึกพื้นฐาน → แพลตฟอร์มที่ปรึกษาการลงทุนส่วนตัว

## 🎯 Vision
ทำให้การลงทุนของคนไทยเข้าใจง่าย วัดผลได้ และตัดสินใจได้ดีขึ้น โดยไม่ต้องเปิดหลายแอป

## ✅ Tier 1 — Portfolio Dashboard
**เป้าหมาย: เปลี่ยนจาก list-based → dashboard-based**

- [x] Migration 12: `investment_transactions`, `investment_dividends`, `investment_watchlist`, `portfolio_snapshots` + tax-saving columns
- [x] `getPortfolioMetrics()` — รวม FX → THB, แยกตาม type/currency/market
- [x] Hero card: Total Value + P/L + Today change
- [x] Asset Allocation donut chart (toggle: type/currency/market)
- [x] Top Performers (3 gainers + 3 losers)
- [x] Holdings list — symbol-only (ตัด full name ออกจากการ์ด)
- [x] Detail page (`/investments/[id]`): hero + price chart + tx log + dividend log
- [x] Yahoo Finance price history API (`fetchPriceHistory`)

## ✅ Tier 2 — Active Investing
**เป้าหมาย: บันทึกซื้อขายจริง + ที่ปรึกษา AI**

- [x] Transactions form — buy/sell/transfer with realized P/L auto-calc
- [x] Dividend logging form (auto Thai 10% WHT)
- [x] AI Investment Advisor — วิเคราะห์ portfolio + แนะนำ rebalance (BYO key)
- [x] SET Index benchmark — เทียบผลตอบแทนกับตลาด
- [x] Auto-update avg_cost on buy/sell from transactions

## ✅ Tier 3 — Tax Optimization
**เป้าหมาย: ลดภาษีอย่างถูกต้อง**

- [x] RMF/SSF/PVD tracker — เช็คเพดาน 30%/500k ของรายได้
- [x] Lock-in countdown (5y SSF, 5y+age 55 RMF)
- [x] Goal-linked investment columns ready
- [x] Tax-saving toggle in create-investment form
- [ ] Capital gains report (annual export for tax filing) — ยังไม่ได้ทำ

## ✅ Tier 4 — Advanced Tools
**เป้าหมาย: เครื่องมือนัก investor**

- [x] Watchlist + price alerts (target price above/below)
- [x] DCA Calculator with compound growth chart
- [x] Portfolio risk metrics (volatility, max drawdown, Sharpe, total return)
- [x] Daily portfolio snapshots cron (extends existing /api/cron/snapshot)
- [ ] Watchlist alert push notification (cron-based) — schema พร้อม รอ cron logic

## 🚧 Pending — Future Iterations
- Capital gains tax report (year-end summary export)
- Watchlist alert via push notification cron
- Bond yield curves
- Property/REIT specific tracking
- Goal allocation tracker (% of goal hit by tax-saving holdings)

## 🛡️ Technical Defaults
- **Pricing**: Yahoo Finance (free, .BK suffix for SET)
- **FX**: exchangerate.host → THB
- **AI**: BYO key (encrypted in profile)
- **Sync**: Manual refresh button + cron daily snapshot

## 📋 Migration Note
**Migration 12 needs to be applied to Supabase manually** via SQL Editor:
1. Open Supabase Studio → SQL Editor
2. Copy contents of `supabase/migrations/12_investment_overhaul.sql`
3. Run

After running, all features work end-to-end. Without it:
- Tier 2.1 (transactions/dividends): forms will fail to save
- Tier 4 (watchlist): page will error
- Risk metrics: snapshots can't write
