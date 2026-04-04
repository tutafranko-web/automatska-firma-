# Marketing Autopilot Command

Start the fully autonomous marketing machine. All 7 agents work continuously without human input.

## Usage
```bash
/marketing-autopilot
```

## What It Does

Starts a self-running marketing operation where:
- **Marketing Coordinator** (queen) assigns and monitors all tasks
- **6 specialist agents** execute on automated schedules
- **Self-learning** improves performance after every cycle
- **Alerts** fire when KPIs drop below thresholds
- **Reports** generated automatically weekly

## Startup Sequence

```bash
# 1. Initialize memory for marketing namespace
npx claude-flow memory init --force
npx claude-flow memory store \
  --key "marketing-autopilot-started" \
  --value "Autopilot initiated at $(date). Full autonomous marketing operations active." \
  --namespace marketing/campaigns

# 2. Start daemon with marketing workers
npx claude-flow daemon start

# 3. Initialize marketing swarm
npx claude-flow swarm init --topology hierarchical-mesh --max-agents 7 --strategy specialized

# 4. Initialize hive-mind with marketing coordinator as queen
npx claude-flow hive-mind init --queen-type strategic

# 5. Spawn all marketing agents
npx claude-flow agent spawn -t marketing-coordinator --name "Marketing Queen" --priority 10
npx claude-flow agent spawn -t content-strategist --count 1
npx claude-flow agent spawn -t seo-specialist --count 1
npx claude-flow agent spawn -t outbound-specialist --count 1
npx claude-flow agent spawn -t conversion-optimizer --count 1
npx claude-flow agent spawn -t sales-intelligence --count 1
npx claude-flow agent spawn -t social-media-manager --count 1

# 6. Store standing objectives
npx claude-flow memory store \
  --key "marketing-objectives" \
  --value "Monthly targets: 200 MQLs, 15% organic growth, $500K pipeline, >85 content score, >3.5% CVR, >4% social engagement, >5x campaign ROI" \
  --namespace marketing/campaigns \
  --ttl 2592000

# 7. Start autopilot (persistent — runs until ALL tasks complete, then restarts cycle)
npx claude-flow autopilot
```

## Autonomous Schedule

| Time | Agent | Autonomous Task |
|------|-------|-----------------|
| **Daily 7 AM** | seo-specialist (Mon) | Weekly keyword gap + trend scouting |
| **Daily 8 AM** | content-strategist | Produce + score + publish content |
| **Daily 8 AM** | sales-intelligence (Tue/Fri) | Competitive intel + attribution |
| **Daily 9 AM** | outbound-specialist | Campaign metrics + sequence optimization |
| **3x Daily** | social-media-manager | Publish + repurpose + engage |
| **Wed 10 AM** | conversion-optimizer | CRO audit + funnel optimization |
| **Weekly** | marketing-coordinator | KPI review + agent reallocation |
| **Monthly** | ALL agents | Full performance review + next month planning |

## Self-Healing Alerts

The system automatically corrects when KPIs drop:

| Alert | Threshold | Auto-Action |
|-------|-----------|-------------|
| Outbound reply rate drops | <3% | Coordinator reviews sequences, outbound-specialist A/B tests new variants |
| Landing page CVR drops | <2% | Conversion-optimizer runs emergency CRO audit |
| Content score low | <70 | Content-strategist rewrites with expert panel |
| Organic traffic declining | <5% growth | SEO-specialist runs full keyword audit |
| Social engagement drops | <2% | Social-media-manager adjusts format and timing |

## Monitoring (When You Want to Check)

```bash
# Quick status check
npx claude-flow hive-mind status

# Full metrics dashboard
npx claude-flow hive-mind metrics

# Marketing-specific memory
npx claude-flow memory search --query "*" --namespace marketing

# Export weekly report
npx claude-flow hive-mind metrics --export marketing-weekly.json

# System health
npx claude-flow doctor --fix
```

## Stop Autopilot

```bash
# Graceful stop (finishes current tasks)
npx claude-flow autopilot stop

# Emergency stop
npx claude-flow daemon stop
```

## How It Stays Autonomous

1. **Daemon `autoStart: true`** — restarts automatically if system reboots
2. **Scheduled workers** — each agent has cron-like schedules in config.yaml
3. **autoAssignOnIdle** — idle agents automatically pick up next task
4. **trainPatternsOnComplete** — every completed task teaches the system
5. **Self-healing alerts** — KPI drops trigger automatic corrective actions
6. **Collective memory** — agents share context without human bridging
7. **EWC++ retention** — never forgets what works, even across sessions
8. **Autopilot mode** — persistent execution until all tasks complete, then restarts
