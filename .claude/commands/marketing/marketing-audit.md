# Marketing Audit Command

Run a comprehensive marketing audit across CRO, SEO, and competitive intelligence.

## Usage
```bash
/marketing-audit [scope]
```

## Scopes
- `full` — Complete audit across all dimensions (default)
- `cro` — Landing page and conversion funnel audit only
- `seo` — Technical SEO and keyword audit only
- `competitive` — Competitive intelligence audit only
- `content` — Content quality and performance audit

## Process

### Full Audit
1. **CRO Audit** (`conversion-optimizer`):
   - Score all landing pages across 8 dimensions (0-100 each)
   - Identify top 10 conversion improvement opportunities
   - Analyze pricing page effectiveness
   - Funnel drop-off analysis

2. **SEO Audit** (`seo-specialist`):
   - Technical SEO health check (Core Web Vitals, schema, sitemap)
   - Keyword cannibalization detection
   - Competitor gap analysis (keywords they rank for, we don't)
   - Striking distance keywords (positions 4-20)
   - Content freshness audit

3. **Competitive Audit** (`sales-intelligence`):
   - Update competitive matrix (features, pricing, positioning)
   - Identify new market entrants
   - Analyze competitor content strategy
   - Track competitor funding, hires, launches

4. **Content Audit** (`content-strategist`):
   - Score existing content with 24-pattern checklist
   - Identify underperforming content for refresh
   - Map content to buyer journey stages
   - Gap analysis: missing topics

## Example

```bash
# Full marketing audit
npx claude-flow hive-mind spawn "Comprehensive marketing audit: CRO audit all landing pages (8-dimension scoring), technical SEO audit with keyword gap analysis, competitive intelligence update against top 5 competitors, content audit with 24-pattern scoring. Produce prioritized recommendation report." \
  --queen-type strategic \
  --max-workers 4 \
  --consensus weighted

# Quick CRO audit only
npx claude-flow hive-mind spawn "CRO audit: Score main product landing page and pricing page across 8 dimensions. Identify top 5 quick-win improvements with predicted conversion lift." \
  --queen-type tactical \
  --max-workers 1
```

## Output
Produces a unified marketing audit report with:
- Overall marketing health score (0-100)
- Prioritized recommendations (impact vs effort matrix)
- Quick wins (implement this week)
- Strategic initiatives (plan for next quarter)
- Competitive positioning map
