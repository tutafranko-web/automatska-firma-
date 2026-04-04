# Marketing Launch Command

Launch a full product marketing campaign with all 7 marketing agents.

## Usage
```bash
/marketing-launch <product> [options]
```

## Products
- `chatbot` — AI Chatbot Basic tier launch
- `voice-agent` — Voice Agent Pro tier launch
- `enterprise` — Enterprise Automation launch
- `feature` — New feature announcement

## Process

1. **Initialize hierarchical swarm** with marketing-coordinator as queen
2. **Phase 1 — Research** (parallel):
   - `seo-specialist`: Keyword research + competitor positioning
   - `sales-intelligence`: Competitive brief + pricing strategy
3. **Phase 2 — Content** (parallel after Phase 1):
   - `content-strategist`: Blog posts, case studies, email sequences
   - `conversion-optimizer`: Landing page design + CRO audit
4. **Phase 3 — Distribution** (parallel after Phase 2):
   - `outbound-specialist`: Cold email campaigns to ICP segments
   - `social-media-manager`: Multi-platform social campaign
5. **Phase 4 — Analysis**:
   - `sales-intelligence`: Attribution report + ROI analysis
   - `marketing-coordinator`: KPI review + optimization plan

## Example

```bash
# Launch voice agent product campaign
npx claude-flow hive-mind spawn "Product launch: AI Voice Agent Pro - generate 200 MQLs, $500K pipeline in 6 weeks. Research keywords, create content, build landing pages, execute outbound to CTOs at mid-market SaaS companies, distribute across social channels, measure attribution." \
  --queen-type tactical \
  --max-workers 7 \
  --consensus byzantine

# Store campaign objective
npx claude-flow memory store \
  --key "campaign-launch-$(date +%s)" \
  --value "Voice Agent Pro Launch: 200 MQLs, $500K pipeline, 6 weeks" \
  --namespace marketing/campaigns
```

## Success Criteria
- 200+ MQLs generated
- $500K+ pipeline created
- 3.5%+ landing page conversion rate
- 15%+ organic traffic growth
- 5x+ campaign ROI
