# Marketing Outbound Command

Launch an outbound email campaign with lead qualification and expert scoring.

## Usage
```bash
/marketing-outbound <segment> [options]
```

## ICP Segments
- `saas-ctos` — CTOs at mid-market SaaS companies
- `ecom-cx` — VPs of Customer Experience at e-commerce
- `enterprise-ops` — Heads of Operations at enterprise
- `competitor-switch` — Users of competitor solutions showing churn signals
- `deal-resurrection` — Closed-lost deals with new buying signals

## Process

1. `sales-intelligence`: ICP refresh + competitive positioning update
2. `outbound-specialist`: Build 5-touch email sequences with expert panel scoring (90+ threshold)
3. `conversion-optimizer`: Create segment-specific landing pages
4. `outbound-specialist`: Launch campaigns with A/B test variants
5. `sales-intelligence`: Analyze results + attribution

## Example

```bash
# Outbound to SaaS CTOs
npx claude-flow hive-mind spawn "Outbound campaign targeting 220 SaaS CTOs (100-1000 employees). Build 5-touch email sequence highlighting: 70% ticket deflection, $420K annual savings, 2-week deployment. Expert panel score each email 90+. Create dedicated landing page with ROI calculator. Include competitor displacement variant for companies using [Competitor]." \
  --queen-type tactical \
  --max-workers 3 \
  --consensus weighted

# Deal resurrection campaign
npx claude-flow hive-mind spawn "Resurrect 50 closed-lost deals from Q1. Research new buying signals (new hires, funding, competitor issues). Build 3-touch re-engagement sequence with updated value props and new case studies." \
  --queen-type tactical \
  --max-workers 2
```

## Capacity Planning
- Target: 220 accounts/month
- Sequence: 5 emails per account
- Expected: 45% open rate, 5% reply rate, 3% meeting rate
- Pipeline: ~$500K/quarter
