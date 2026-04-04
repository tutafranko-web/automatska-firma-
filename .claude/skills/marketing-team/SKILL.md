---
name: "Marketing Team"
description: "Orchestrate a complete AI-powered marketing team for AI chatbot and voice agent business. Spawn marketing agent swarms for campaigns, content sprints, outbound blitzes, and funnel optimization. Use when you need to execute marketing activities like content creation, SEO, outbound campaigns, CRO audits, sales enablement, or multi-channel launches."
---

# Marketing Team Orchestration

## What This Skill Does

Orchestrates 7 specialized marketing agents as a coordinated team for AI chatbot, voice agent, and automation solutions business. Provides campaign templates, swarm topologies, and autonomous pipeline execution.

## Marketing Agents

| Agent | Role | Priority | Trigger |
|-------|------|----------|---------|
| **marketing-coordinator** | Campaign orchestration, agent routing via MoE | Critical | campaign-report |
| **content-strategist** | Content production, expert panel QA, A/B testing | High | content-publish |
| **seo-specialist** | Keyword research, competitor gaps, trend scouting | High | seo-optimize |
| **outbound-specialist** | Cold email campaigns, lead qualification, ICP scoring | Critical | outbound-send |
| **conversion-optimizer** | CRO audit, landing page optimization, lead magnets | High | cro-implement |
| **sales-intelligence** | Call analysis, attribution, pricing strategy | Critical | sales-brief |
| **social-media-manager** | Content repurposing, multi-platform distribution | Medium | social-publish |

## Quick Start

### Launch Full Marketing Swarm
```bash
# Initialize marketing swarm with coordinator as queen
npx claude-flow hive-mind spawn "Execute Q2 marketing campaign for AI voice agent product launch" \
  --queen-type tactical \
  --max-workers 6 \
  --consensus weighted

# Or spawn individual agents
npx claude-flow agent spawn -t marketing-coordinator --name "Marketing Queen" --priority 10
npx claude-flow agent spawn -t content-strategist --count 1
npx claude-flow agent spawn -t seo-specialist --count 1
npx claude-flow agent spawn -t outbound-specialist --count 1
npx claude-flow agent spawn -t conversion-optimizer --count 1
npx claude-flow agent spawn -t sales-intelligence --count 1
npx claude-flow agent spawn -t social-media-manager --count 1
```

### Store Campaign Objective
```bash
npx claude-flow memory store \
  --key "campaign-objective" \
  --value "Launch AI Voice Agent Pro tier: generate 200 MQLs, $500K pipeline, 15% organic growth" \
  --namespace marketing \
  --ttl 2592000
```

## Campaign Pipelines

### 1. Product Launch (Hierarchical Topology)
**When**: Launching new product or major feature
**Duration**: 4-6 weeks
**Agents**: All 7

```bash
npx claude-flow hive-mind spawn "Product launch: AI Voice Agent Pro" \
  --queen-type tactical --max-workers 7 --consensus byzantine
```

**Phase Flow**:
```
Week 1: Research
  seo-specialist → Keyword research + competitor analysis
  sales-intelligence → Competitive brief + pricing strategy

Week 2: Content Creation  
  content-strategist → Blog posts, case studies, email sequences
  conversion-optimizer → Landing page design + optimization

Week 3: Distribution
  outbound-specialist → Cold email campaigns to ICP
  social-media-manager → Multi-platform social blitz

Week 4: Analysis & Optimization
  sales-intelligence → Attribution report + pipeline analysis
  marketing-coordinator → KPI review + optimization recommendations
```

### 2. Content Sprint (Mesh Topology)
**When**: Weekly/bi-weekly content production cycle
**Duration**: 3-5 days
**Agents**: content-strategist, seo-specialist, social-media-manager

```bash
npx claude-flow swarm init --topology mesh --max-agents 3 --strategy specialized
npx claude-flow hive-mind spawn "Weekly content sprint: 5 blog posts + 20 social posts" \
  --queen-type tactical --max-workers 3
```

### 3. Outbound Blitz (Hierarchical Topology)
**When**: Quarterly pipeline push
**Duration**: 2-3 weeks
**Agents**: outbound-specialist, sales-intelligence, conversion-optimizer

```bash
npx claude-flow hive-mind spawn "Q2 outbound blitz: 220 accounts, 5-touch sequences" \
  --queen-type tactical --max-workers 3 --consensus weighted
```

### 4. Funnel Optimization (Pipeline Topology)
**When**: Monthly conversion optimization
**Duration**: 1-2 weeks
**Agents**: conversion-optimizer, sales-intelligence, seo-specialist

```bash
npx claude-flow hive-mind spawn "Monthly funnel optimization audit" \
  --queen-type adaptive --max-workers 3
```

### 5. Full Marketing Machine (Adaptive Topology)
**When**: Continuous marketing operations
**Duration**: Ongoing
**Agents**: All 7 with autopilot

```bash
npx claude-flow autopilot
npx claude-flow hive-mind spawn "Run full marketing operations: content + outbound + optimization" \
  --queen-type strategic --max-workers 7 --consensus byzantine
```

## Topology Guide

| Topology | Best For | Communication |
|----------|----------|---------------|
| **Hierarchical** | Structured campaigns, product launches | Coordinator directs all agents |
| **Mesh** | Creative sprints, brainstorming | All agents collaborate as peers |
| **Pipeline** | Sequential processes, funnels | Each agent hands off to next |
| **Ring** | Iterative optimization loops | Circular feedback and refinement |
| **Adaptive** | Complex multi-phase campaigns | Auto-switches based on task phase |

## Memory Namespaces

| Namespace | Content | Used By |
|-----------|---------|---------|
| `marketing/campaigns` | Active campaign objectives and status | All agents |
| `marketing/content` | Content calendar, published pieces, scores | content-strategist, social-media-manager |
| `marketing/seo` | Keyword targets, rankings, competitor data | seo-specialist, content-strategist |
| `marketing/outbound` | Email sequences, ICP data, lead scores | outbound-specialist, sales-intelligence |
| `marketing/conversion` | CRO audits, funnel data, test results | conversion-optimizer |
| `marketing/intelligence` | Competitive data, pricing, attribution | sales-intelligence |
| `marketing/social` | Social calendar, engagement metrics | social-media-manager |

## KPI Dashboard

```bash
# Check marketing swarm status
npx claude-flow hive-mind status

# View marketing metrics
npx claude-flow memory search --query "*" --namespace marketing

# Export marketing report
npx claude-flow hive-mind metrics --export marketing-report.json
```

| KPI | Target | Owner |
|-----|--------|-------|
| MQLs Generated | 200/month | outbound-specialist |
| Organic Traffic | +15%/month | seo-specialist |
| Content Score | >85/100 | content-strategist |
| Landing Page CVR | >3.5% | conversion-optimizer |
| Pipeline Value | $500K/quarter | sales-intelligence |
| Social Engagement | >4% | social-media-manager |
| Campaign ROI | >5x | marketing-coordinator |

## Business Context

- **Company**: AI automation solutions provider
- **Products**: AI chatbots, voice agents, enterprise automation
- **ICP**: CTOs, VPs of CX, Heads of Ops (100-1000 employees)
- **Industries**: SaaS, e-commerce, customer service, healthcare, fintech
- **Pricing**: Chatbot Basic ($499/mo) → Voice Agent Pro ($1,499/mo) → Enterprise (custom)
- **Value Prop**: Cut support costs 60-70%, 24/7 availability, higher CSAT

## Integration with Hive Mind

The marketing team integrates with the broader Ruflo hive-mind system:
- **Marketing Coordinator** acts as a domain queen under the global strategic queen
- Marketing agents share collective memory with development and operations agents
- Campaign results feed into product development priorities
- Customer insights from sales-intelligence inform feature roadmap

## Troubleshooting

### Agents Not Coordinating
```bash
npx claude-flow doctor --fix
npx claude-flow hive-mind status
```

### Memory Not Persisting
```bash
npx claude-flow memory init --force
npx claude-flow memory search --query "*" --namespace marketing
```

### Campaign Pipeline Stuck
```bash
npx claude-flow hive-mind resume
npx claude-flow hive-mind metrics
```
