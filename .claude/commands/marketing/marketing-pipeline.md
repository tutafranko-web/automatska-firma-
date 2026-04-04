# Marketing Pipeline Command

Create and execute marketing pipelines from templates.

## Usage
```bash
/marketing-pipeline <template> [options]
```

## Templates

### `launch` — Product Launch Pipeline
All 7 agents, hierarchical topology, 4-6 weeks
```bash
npx claude-flow hive-mind spawn "Product launch pipeline: [describe product]" \
  --queen-type tactical --max-workers 7 --consensus byzantine
```

### `content-sprint` — Weekly Content Sprint
3 agents (content, SEO, social), mesh topology, 3-5 days
```bash
npx claude-flow swarm init --topology mesh --max-agents 3
npx claude-flow hive-mind spawn "Content sprint: [describe topics]" \
  --queen-type tactical --max-workers 3
```

### `outbound-blitz` — Quarterly Outbound Push
3 agents (outbound, sales-intel, conversion), hierarchical, 2-3 weeks
```bash
npx claude-flow hive-mind spawn "Outbound blitz: [describe target segment]" \
  --queen-type tactical --max-workers 3 --consensus weighted
```

### `funnel-optimization` — Monthly Funnel Audit
3 agents (conversion, sales-intel, SEO), pipeline topology, 1-2 weeks
```bash
npx claude-flow hive-mind spawn "Funnel optimization: [describe focus areas]" \
  --queen-type adaptive --max-workers 3
```

### `full-machine` — Continuous Marketing Ops
All 7 agents, adaptive topology, ongoing with autopilot
```bash
npx claude-flow autopilot
npx claude-flow hive-mind spawn "Full marketing operations: continuous content, outbound, optimization" \
  --queen-type strategic --max-workers 7 --consensus byzantine
```

## Custom Pipeline

Create custom pipelines by specifying agents and phases:

```bash
npx claude-flow hive-mind spawn "Custom pipeline:
Phase 1 (parallel): seo-specialist researches keywords, sales-intelligence updates competitor data
Phase 2 (sequential): content-strategist writes 3 blog posts using keyword data
Phase 3 (parallel): outbound-specialist creates email sequence, social-media-manager repurposes content
Phase 4: conversion-optimizer audits all new landing pages" \
  --queen-type tactical --max-workers 5
```

## Monitoring

```bash
# Check pipeline progress
npx claude-flow hive-mind status

# View agent activity
npx claude-flow hive-mind metrics

# Check marketing memory
npx claude-flow memory search --query "*" --namespace marketing
```
