# Marketing Content Command

Run a content production sprint with content, SEO, and social agents.

## Usage
```bash
/marketing-content <topic> [options]
```

## Process

1. **Initialize mesh swarm** (equal collaboration)
2. `seo-specialist`: Research keyword targets and trending topics
3. `content-strategist`: Create blog posts with 24-pattern quality scoring + expert panel QA
4. `social-media-manager`: Repurpose into 15-20 platform-specific pieces
5. `conversion-optimizer`: Optimize CTAs and conversion points

## Example

```bash
# Weekly content sprint
npx claude-flow swarm init --topology mesh --max-agents 4
npx claude-flow hive-mind spawn "Content sprint: Create 5 blog posts about AI voice agents for customer service. Topics: ROI comparison, implementation guide, voice vs chat comparison, industry use cases, buyer's guide. Each post scored 85+ on 24-pattern checklist. Repurpose into 20 LinkedIn posts, 10 Twitter threads, 5 short-form video scripts." \
  --queen-type tactical \
  --max-workers 4

# Content about specific topic
npx claude-flow hive-mind spawn "Create comprehensive guide: How AI Chatbots Transform E-Commerce Customer Service. Include ROI data, 3 case studies, implementation timeline, comparison table. Score 90+ on expert panel. Repurpose for all social platforms." \
  --queen-type tactical \
  --max-workers 3
```

## Content Types
- Blog posts (1500-3000 words, SEO-optimized)
- Case studies (customer success stories)
- Whitepapers (industry reports, research)
- Email sequences (nurture campaigns)
- Social media content (LinkedIn, Twitter, YouTube, TikTok)
- Lead magnets (calculators, assessments, guides)
