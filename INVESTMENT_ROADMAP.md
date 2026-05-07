# Investment Module Roadmap (Lumenfi)

แผนพัฒนาโมดูลการลงทุน 4 ระดับ — จากเครื่องมือบันทึกพื้นฐาน → แพลตฟอร์มที่ปรึกษาการลงทุนส่วนตัว

## 🎯 Vision
ทำให้การลงทุนของคนไทยเข้าใจง่าย วัดผลได้ และตัดสินใจได้ดีขึ้น โดยไม่ต้องเปิดหลายแอป

## ✅ Tier 1 — Portfolio Dashboard (DONE)
**เป้าหมาย: เปลี่ยนจาก list-based → dashboard-based**

- [x] Migration 12: `investment_transactions`, `investment_dividends`, `investment_watchlist`, `portfolio_snapshots` + tax-saving columns
- [x] `getPortfolioMetrics()` — รวม FX → THB, แยกตาม type/currency/market
- [x] Hero card: Total Value + P/L + Today change
- [x] Asset Allocation donut chart (toggle: type/currency/market)
- [x] Top Performers (3 gainers + 3 losers)
- [x] Holdings list — symbol-only (ตัด full name ออกจากการ์ด)
- [x] Detail page (`/investments/[id]`): hero + price chart + tx log + dividend log
- [x] Yahoo Finance price history API (`fetchPriceHistory`)

## ⏳ Tier 2 — Active Investing (NEXT)
**เป้าหมาย: บันทึกซื้อขายจริง + ที่ปรึกษา AI**

- [ ] Transactions form — buy/sell/transfer with realized P/L auto-calc
- [ ] Dividend logging form
- [ ] AI Investment Advisor — วิเคราะห์ portfolio + แนะนำ rebalance (BYO key)
- [ ] SET Index benchmark — เทียบผลตอบแทนกับตลาด
- [ ] Auto-update avg_cost on buy/sell from transactions

## ⏳ Tier 3 — Tax Optimization
**เป้าหมาย: ลดภาษีอย่างถูกต้อง**

- [ ] RMF/SSF/PVD tracker — เช็คเพดาน 30%/500k ของรายได้
- [ ] Lock-in countdown (5y SSF, 5y+age 55 RMF)
- [ ] Goal-linked investment (Retire/House/Education)
- [ ] Capital gains report (annual export for tax filing)

## ⏳ Tier 4 — Advanced Tools
**เป้าหมาย: เครื่องมือนัก investor**

- [ ] Watchlist + price alerts (cron-based)
- [ ] DCA Calculator
- [ ] Portfolio risk metrics (Sharpe, max drawdown, beta vs SET)
- [ ] Daily portfolio snapshots → time-series chart

## 🛡️ Technical Defaults
- **Pricing**: Yahoo Finance (free, .BK suffix for SET)
- **FX**: exchangerate.host → THB
- **AI**: BYO key (encrypted in profile)
- **Sync**: Manual refresh button + cron daily snapshot
