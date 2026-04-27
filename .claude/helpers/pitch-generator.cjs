#!/usr/bin/env node
/**
 * Pitch Deck Generator
 *
 * Generira personaliziranu HTML pitch prezentaciju (10 slajdova) za konkretnog prospekta.
 * Scrape prospektovog weba + Claude Haiku API + 10-slide template → reports/pitches/<slug>/pitch.html
 *
 * Usage:
 *   node pitch-generator.cjs "<company-name>" [options]
 *
 * Options:
 *   --industry <hotel|restoran|klinika|ordinacija|odvjetnik|racunovodstvo|ecommerce|agencija>
 *   --web <url>
 *   --size <number>
 *   --location <city>
 *   --focus <chatbot|voice|automation|seo|all>
 *   --lang <hr|en>
 *   --contact <name>
 *   --open
 *
 * Env:
 *   ANTHROPIC_API_KEY (required for LLM personalization; fallback to template defaults if missing)
 *   PITCH_MODEL (default: claude-haiku-4-5-20251001)
 *   PITCH_BRAND_NAME, PITCH_BRAND_TAGLINE, PITCH_CTA_URL, PITCH_CTA_PHONE
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

// -------- CLI parsing --------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; }
      else { args[key] = next; i++; }
    } else {
      args._.push(a);
    }
  }
  return args;
}

const argv = parseArgs(process.argv.slice(2));

if (argv._.length === 0) {
  console.error('Usage: node pitch-generator.cjs "<company-name>" [--industry X] [--web URL] [--size N] [--location CITY] [--lang hr|en] [--contact NAME] [--open]');
  process.exit(1);
}

const companyName = argv._[0];
const industry = (argv.industry || 'agencija').toLowerCase();
const web = argv.web || '';
const sizeArg = argv.size ? Number(argv.size) : null;
const location = argv.location || 'Hrvatska';
const focus = argv.focus || 'all';
const lang = argv.lang || 'hr';
const contact = argv.contact || '';

// -------- Config --------
const BRAND = {
  name: process.env.PITCH_BRAND_NAME || 'Opsis Dalmatia',
  tagline: process.env.PITCH_BRAND_TAGLINE || 'Povećajte prihode i smanjite stres',
  ctaUrl: process.env.PITCH_CTA_URL || 'https://opsisdalmatia.com/besplatna-konzultacija',
  ctaUrlShort: (process.env.PITCH_CTA_URL || 'https://opsisdalmatia.com/besplatna-konzultacija').replace(/^https?:\/\//, ''),
  ctaPhone: process.env.PITCH_CTA_PHONE || '+385 91 234 5678',
};

const MODEL = process.env.PITCH_MODEL || 'claude-haiku-4-5-20251001';

// -------- Slug --------
function slugify(s) {
  return s.toLowerCase()
    .replace(/[ćč]/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
const slug = slugify(companyName);

// -------- Output dir --------
const repoRoot = path.resolve(__dirname, '..', '..');
const outDir = path.join(repoRoot, 'reports', 'pitches', slug);
fs.mkdirSync(outDir, { recursive: true });

// -------- Fetch helper (raw https, no deps) --------
function httpGet(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpsisPitchBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: timeoutMs,
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          resolve(httpGet(new URL(res.headers.location, url).toString(), timeoutMs));
          return;
        }
        let buf = '';
        res.on('data', (c) => { buf += c; if (buf.length > 300000) { req.destroy(); } });
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      });
      req.on('error', () => resolve({ status: 0, body: '' }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '' }); });
    } catch { resolve({ status: 0, body: '' }); }
  });
}

// -------- Web scrape → signals --------
async function scrapeWebsite(url) {
  if (!url) return { ok: false, reason: 'no-url' };
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const { status, body } = await httpGet(normalized);
  if (status !== 200 || !body) return { ok: false, reason: `status-${status}` };

  const text = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const html = body.toLowerCase();

  const m = (re) => (text.match(re) || [])[1];
  const title = m(/<title[^>]*>([^<]{3,160})<\/title>/i) || '';
  const metaDesc = m(/<meta\s+name=["']description["']\s+content=["']([^"']{10,300})["']/i) || '';
  const ogDesc = m(/<meta\s+property=["']og:description["']\s+content=["']([^"']{10,300})["']/i) || '';

  const signals = {
    hasBooking: /booking\.com|bookingwidget|rezervac|reservation|book now|rezerviraj/i.test(html),
    hasAirbnb: /airbnb\.com/i.test(html),
    hasChat: /tawk|intercom|livechat|tidio|messenger|whatsapp/i.test(html),
    hasCalendar: /calendly|cal\.com|kalendar/i.test(html),
    hasContactForm: /<form[\s\S]*?contact|kontakt-form|contact-form/i.test(html),
    hasPhoneVisible: /(?:\+385|00385|091|092|095|097|098|099)\s?\d/.test(text),
    hasMultiLang: /<(?:link|a)[^>]+hreflang=|language-switcher|lang-switch|\/en\/|\/de\/|\/it\//i.test(html),
    hasWooCommerce: /woocommerce|wp-content\/plugins\/woocommerce/i.test(html),
    hasShopify: /cdn\.shopify|shopify\.com/i.test(html),
    mentionsPrices: /cijen|price|eur|kn[\s\W]/i.test(text),
    mentionsWorkingHours: /radno vrijeme|working hours|pon[\s-]*pet|mon[\s-]*fri/i.test(text),
  };

  return { ok: true, title: title.trim(), description: (metaDesc || ogDesc).trim(), signals };
}

// -------- Tier selection (new a-la-carte model) --------
function selectTier(size, industry) {
  const s = size || 0;
  // Full bundle — hoteli, klinike, e-commerce s voice potrebom + veće firme
  if (s >= 25 || (['hotel', 'klinika', 'ecommerce'].includes(industry) && s >= 10)) return 'Full Bundle';
  // Growth — srednje firme bez nužne voice potrebe
  if (s >= 8 || ['restoran', 'odvjetnik', 'racunovodstvo'].includes(industry)) return 'Chatbot Pro + Automatizacija';
  // Starter — mikro
  return 'Chatbot Basic';
}

// -------- Industry defaults --------
function hotelDefaults(loc) {
  const l = loc || 'vašu lokaciju';
  return {
    painHook: 'Gosti pišu u 23:47. Tko odgovara?',
    missed: 45, loss: 3200, hours: 12,
    caseChatbot: 'Hotel u Splitu (35 soba) — +35% direktnih rezervacija (bez Booking provizije), -60% propuštenih upita u prvom kvartalu.',
    caseVoice: 'Voice agent odgovara i rezervira na hrvatskom, engleskom, njemačkom, talijanskom — dok vaše osoblje spava. Booking ne uzima 18% provizije.',
    caseAutomation: 'Preporučljivi procesi: auto check-in/out mailovi, sinkronizacija Booking + Airbnb cijena, post-stay review request, SMS reminder za gosta.',
    caseSeo: `Lokalni SEO za "hotel ${l}", "apartmani ${l}". 4 članka mjesečno o destinaciji → direktan traffic bez Booking provizije.`,
  };
}

const INDUSTRY_DEFAULTS = {
  hotel: null, // resolved via hotelDefaults(location)
  restoran: {
    painHook: '30% rezervacija dolazi nakon radnog vremena. Nitko ih ne prima.',
    missed: 90, loss: 2400, hours: 10,
    caseChatbot: 'Restoran u Trogiru (25 stolova) — 2x više online rezervacija, -50% volumena poziva osoblju, bot rezervira direktno u Google Calendar.',
    caseVoice: 'Gost nazove u 22:45 da rezervira za sutra — voice agent odgovara, rezervira, šalje SMS potvrdu.',
    caseAutomation: 'Preporučljivi procesi: auto potvrde rezervacija, reminder SMS 2h prije, social post za dnevni menu.',
    caseSeo: 'Google Business profil + "restoran {lokacija}" + menu kao rich snippet. 2-3x više lokalnih klikova.',
  },
  klinika: {
    painHook: '40% poziva propušteno. 20% termina otkazano bez zamjene.',
    missed: 120, loss: 4500, hours: 18,
    caseChatbot: 'Dentalna ordinacija u Splitu — chatbot zakazuje termine + prikuplja anamnezu prije dolaska (GDPR compliant).',
    caseVoice: 'Voice agent odgovara na pozive kad je receptorica zauzeta — daje termine, odgovara na cjenik.',
    caseAutomation: 'Preporučljivi procesi: auto SMS reminder 24h prije, re-book nakon otkaza, post-tretman follow-up, recall za godišnji pregled.',
    caseSeo: 'Lokalni SEO + "ordinacija {grad}" + članci o tretmanima. Google Business recenzije automatski zatražene.',
  },
  ordinacija: null, // alias za klinika
  odvjetnik: {
    painHook: 'Klijenti zovu 20x s istim pitanjima. Gubite 2h dnevno.',
    missed: 30, loss: 1500, hours: 14,
    caseChatbot: 'Chatbot odgovara na 70% FAQ: cjenik konzultacija, rokovi, potrebna dokumentacija — bez otkrivanja pravnog savjeta.',
    caseVoice: 'Voice agent prima pozive, filtrira hitnost, zakazuje prvu konzultaciju. Vi primate samo kvalificirane.',
    caseAutomation: 'Preporučljivi procesi: auto generiranje standardnih dopisa, reminder za rokove, klijentski portal s dokumentima.',
    caseSeo: '"odvjetnik {grad}" + članci o standardnim postupcima (rastava, ugovor, nekretnine) — dugoročni organski promet.',
  },
  racunovodstvo: {
    painHook: 'Svaki mjesec isti pitanja klijenata. Svaki mjesec gubite 40h.',
    missed: 25, loss: 1200, hours: 30,
    caseChatbot: 'Chatbot odgovara na rokove, potrebne dokumente, cjenik — 80% rutinskih upita bez vas.',
    caseVoice: 'Voice agent daje informacije o rokovima, sinkronizira s vašim kalendarom.',
    caseAutomation: 'Preporučljivi procesi: auto e-Račun generiranje, sinkronizacija s porezna, reminder klijentima za dostavu dokumenata.',
    caseSeo: '"knjigovodstvo {grad}" + članci o zakonima (novi ZOR, eRačun, fiskalizacija 2.0).',
  },
  ecommerce: {
    painHook: 'Gosti napuštaju košaricu jer ne dobijaju brz odgovor.',
    missed: 280, loss: 5200, hours: 20,
    caseChatbot: 'WooCommerce chatbot — +18% conversion, -30% tiketa podrške, cross-sell preporuke na temelju košarice.',
    caseVoice: 'Voice agent za veće narudžbe (B2B) — nazove kupca natrag, potvrdi detalje.',
    caseAutomation: 'Preporučljivi procesi: abandoned cart recovery, auto re-order reminder, Instagram shop sync, dinamička cijena po zalihama.',
    caseSeo: 'Product SEO (structured data), kategorijske stranice optimizirane, blog o upotrebi proizvoda.',
  },
  agencija: {
    painHook: 'Provodite više vremena u adminu nego u kreativi.',
    missed: 15, loss: 1800, hours: 22,
    caseChatbot: 'Chatbot screenira upite klijenata prije prvog poziva — dobivate samo kvalificirane lead-ove.',
    caseVoice: 'Voice agent za first contact calls — rezervira discovery meeting.',
    caseAutomation: 'Preporučljivi procesi: auto onboarding novog klijenta, tjedni izvještaj per klijent, invoice + follow-up.',
    caseSeo: '"{niša} agencija {grad}" + case studies + thought leadership blog.',
  },
};
INDUSTRY_DEFAULTS.ordinacija = INDUSTRY_DEFAULTS.klinika;

function industryDefaults(ind, loc) {
  if (ind === 'hotel') return hotelDefaults(loc);
  return INDUSTRY_DEFAULTS[ind] || INDUSTRY_DEFAULTS.agencija;
}

// -------- Claude API call --------
function callClaude(prompt) {
  return new Promise((resolve) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return resolve({ ok: false, reason: 'no-api-key' });

    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.on('data', (c) => buf += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          const text = (j.content && j.content[0] && j.content[0].text) || '';
          resolve({ ok: !!text, text, raw: j });
        } catch { resolve({ ok: false, reason: 'parse-error', raw: buf.slice(0, 500) }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, reason: `req-error: ${e.message}` }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

function buildPrompt({ companyName, industry, location, size, scrapeResult, tier, defaults }) {
  const signals = scrapeResult.ok
    ? JSON.stringify({ title: scrapeResult.title, description: scrapeResult.description, ...scrapeResult.signals })
    : '(nema scrape podataka)';

  return `Ti si senior B2B copywriter za Opsis Dalmatia, AI agenciju iz Splita.
Generiraj JSON za personaliziranu pitch prezentaciju za tvrtku "${companyName}" u industriji "${industry}", lokacija "${location}".

KONTEKST O PROSPEKTU:
- Veličina: ${size || 'nepoznato'}
- Web scrape signali: ${signals}

PREPORUČENI PAKET: ${tier}
CJENIK OPSIS DALMATIA (jednokratno):
- Chatbot Basic: 750 € (+ 49 €/mj hosting)
- Chatbot Pro: 1.500 € (+ 99 €/mj)
- Voice Agent: 1.500 € (+ 149 €/mj)
- Automatizacija: 2.000 € (+ 99 €/mj)
- Bundle (Chatbot Pro + Voice + Automatizacija): 4.250 € (-15%, + 297 €/mj)
- SEO retainer: 699 €/mj (ili jednokratni audit 1.999 €)

DEFAULTOVI INDUSTRIJE (možeš override samo s boljim, konkretnijim):
${JSON.stringify(defaults, null, 2)}

ZADATAK: Vrati SAMO JSON (bez koda, bez komentara, bez markdown blokova) s ovim keyovima:

{
  "signal_1": "Jedna konkretna stvar koju si primijetio na njihovom webu/situaciji (max 18 riječi, na hrvatskom, direktno).",
  "signal_2": "Druga konkretna stvar (max 18 riječi).",
  "signal_3": "Treća konkretna stvar (max 18 riječi).",
  "pain_hook": "Jedna rečenica koja udara u njihovu boljku. Max 14 riječi. Na hrvatskom. Direktno, bez korporativnog žargona. Primjer: '${defaults.painHook}'.",
  "pain_body": "2-3 rečenice koje razviju bol. Max 60 riječi. Konkretno, brojčano gdje ide.",
  "pain_monthly_loss_eur": "broj u eurima (int, bez EUR simbola). Prosjek za ovu industriju i veličinu. Ako ne znaš, koristi ${defaults.loss}.",
  "pain_missed_inquiries": "broj propuštenih upita mjesečno (int). Ako ne znaš, koristi ${defaults.missed}.",
  "pain_time_hours": "sati ručnog rada tjedno koje možemo uštediti (int). Ako ne znaš, koristi ${defaults.hours}.",
  "case_chatbot": "2-3 rečenice specifičnog primjera iz iste industrije. Koristi brojke. Default: '${defaults.caseChatbot}'.",
  "case_voice": "2 rečenice o tome zašto baš voice agent ima smisla za njih. Default: '${defaults.caseVoice}'.",
  "case_automation": "2 rečenice o 3 konkretna procesa koja se mogu automatizirati baš za njihov tip posla. Default: '${defaults.caseAutomation}'.",
  "case_seo": "2 rečenice o SEO prilici specifičnoj za njihovu industriju + lokaciju. Default: '${defaults.caseSeo}'.",
  "recommended_tier_reason": "3-4 rečenice zašto baš ovaj tier (${tier}). Konkretno — koja obilježja prospekta vode do ove preporuke. Max 80 riječi.",
  "roi_annual_savings_eur": "broj u eurima (int). Godišnja procjena uštede. Budi konzervativan — pain_monthly_loss_eur * 10-14 mjeseci.",
  "roi_payback_months": "broj mjeseci za povrat investicije (int, obično 3-9).",
  "roi_inquiries_uplift_pct": "postotni rast upita/rezervacija (int, obično 15-45).",
  "recommended_tier_note": "Jedna rečenica koja smiruje percepciju rizika ili ističe flexibility. Max 30 riječi."
}

KRITIČNO:
- Sve na hrvatskom jeziku (osim ako "${lang}" === "en").
- Bez emojiija.
- Bez fraza "revolucionirajte", "disruptirajte", "next-gen".
- Ako nemaš specifičan signal iz scrape-a, vrati općeniti ali relevantan za industriju.
- JSON mora biti validan. Stringovi u dvostrukim navodnicima. Brojevi bez navodnika.`;
}

function safeJsonParse(text) {
  try { return JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

// -------- Template render --------
function renderTemplate(templatePath, vars) {
  const tpl = fs.readFileSync(templatePath, 'utf8');
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (vars[key] === undefined || vars[key] === null) return '';
    return String(vars[key]);
  });
}

// -------- Main --------
(async () => {
  console.log(`🎨 Pitch generator → ${companyName} (${industry})`);

  const scrape = web ? await scrapeWebsite(web) : { ok: false, reason: 'no-web-arg' };
  if (scrape.ok) {
    console.log(`  ✓ Scraped ${web} (title: "${scrape.title.slice(0, 60)}")`);
  } else {
    console.log(`  ⚠ No scrape (${scrape.reason})`);
  }

  const defaults = industryDefaults(industry, location);
  const tier = selectTier(sizeArg, industry);
  console.log(`  → Tier: ${tier}`);

  // LLM personalization
  let llmVars = null;
  if (process.env.ANTHROPIC_API_KEY) {
    console.log(`  … Calling ${MODEL} for personalization`);
    const prompt = buildPrompt({ companyName, industry, location, size: sizeArg, scrapeResult: scrape, tier, defaults });
    const llm = await callClaude(prompt);
    if (llm.ok) {
      llmVars = safeJsonParse(llm.text);
      if (llmVars) console.log(`  ✓ LLM returned valid JSON (${Object.keys(llmVars).length} keys)`);
      else console.log(`  ⚠ LLM returned unparseable JSON, falling back to defaults`);
    } else {
      console.log(`  ⚠ LLM call failed (${llm.reason}), falling back to defaults`);
    }
  } else {
    console.log(`  ⚠ ANTHROPIC_API_KEY not set — template-only mode`);
  }

  // Merge: LLM > industry defaults > fallback
  const v = {
    lang,
    brand_name: BRAND.name,
    brand_tagline: BRAND.tagline,
    cta_url: BRAND.ctaUrl,
    cta_url_short: BRAND.ctaUrlShort,
    cta_phone: BRAND.ctaPhone,
    company_name: companyName,
    company_location: location,
    company_web: web || '(web nije dostavljen)',
    contact_name: contact || 'Odgovornoj osobi',
    date: new Date().toLocaleDateString('hr-HR', { year: 'numeric', month: 'long', day: 'numeric' }),
    pitch_id: `${slug}-${Date.now().toString(36)}`,
    signal_1: (llmVars && llmVars.signal_1) || (scrape.ok
      ? 'Web radi, ali komunikacija s posjetiteljima nije automatizirana — upiti završavaju u mailu.'
      : 'Komunikacija s posjetiteljima nije automatizirana — upiti završavaju u mailu ili telefonu.'),
    signal_2: (llmVars && llmVars.signal_2) || 'Nema chat/voice kanala koji radi 24/7 — propušteni upiti izvan radnog vremena su izgubljen prihod.',
    signal_3: (llmVars && llmVars.signal_3) || 'SEO vidljivost na lokalne pretrage ima značajan prostor za rast.',
    pain_hook: (llmVars && llmVars.pain_hook) || defaults.painHook,
    pain_body: (llmVars && llmVars.pain_body) || `Svaki propušten upit je izgubljen prihod. Dok vi spavate, gosti traže dalje.`,
    pain_monthly_loss_eur: (llmVars && llmVars.pain_monthly_loss_eur) || defaults.loss,
    pain_missed_inquiries: (llmVars && llmVars.pain_missed_inquiries) || defaults.missed,
    pain_time_hours: (llmVars && llmVars.pain_time_hours) || defaults.hours,
    case_chatbot: (llmVars && llmVars.case_chatbot) || defaults.caseChatbot,
    case_voice: (llmVars && llmVars.case_voice) || defaults.caseVoice,
    case_automation: (llmVars && llmVars.case_automation) || defaults.caseAutomation,
    case_seo: (llmVars && llmVars.case_seo) || defaults.caseSeo,
    recommended_tier: tier,
    recommended_tier_reason: (llmVars && llmVars.recommended_tier_reason) || `Na temelju veličine (${sizeArg || 'procjena'}) i industrije, ${tier} paket pokriva najkritičnije bolne točke bez overengineering-a.`,
    roi_annual_savings_eur: (llmVars && llmVars.roi_annual_savings_eur) || (defaults.loss * 11),
    roi_payback_months: (llmVars && llmVars.roi_payback_months) || 6,
    roi_inquiries_uplift_pct: (llmVars && llmVars.roi_inquiries_uplift_pct) || 25,
    recommended_tier_note: (llmVars && llmVars.recommended_tier_note) || `Paket se može nadograditi ili smanjiti svaki kvartal — bez dugoročnog locka.`,
  };

  // Render HTML + ensure shared assets exist
  const templateDir = path.join(repoRoot, '.claude', 'skills', 'marketing-team', 'templates');
  const htmlTpl = path.join(templateDir, 'pitch-deck.html');
  const cssTpl = path.join(templateDir, 'pitch-deck.css');

  if (!fs.existsSync(htmlTpl) || !fs.existsSync(cssTpl)) {
    console.error(`✗ Template missing: ${htmlTpl}`);
    process.exit(2);
  }

  // Shared folder (fonts, assets, CSS) — created once, referenced by every pitch via ../_shared/
  const sharedDir = path.join(repoRoot, 'reports', 'pitches', '_shared');
  const copyDirRecursive = (src, dst) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) copyDirRecursive(s, d);
      else if (!fs.existsSync(d) || fs.statSync(s).mtimeMs > fs.statSync(d).mtimeMs) fs.copyFileSync(s, d);
    }
  };
  fs.mkdirSync(sharedDir, { recursive: true });
  // CSS — always re-copy if template is newer
  const sharedCss = path.join(sharedDir, 'pitch-deck.css');
  if (!fs.existsSync(sharedCss) || fs.statSync(cssTpl).mtimeMs > fs.statSync(sharedCss).mtimeMs) {
    fs.copyFileSync(cssTpl, sharedCss);
  }
  copyDirRecursive(path.join(templateDir, 'fonts'),  path.join(sharedDir, 'fonts'));
  copyDirRecursive(path.join(templateDir, 'assets'), path.join(sharedDir, 'assets'));

  const rendered = renderTemplate(htmlTpl, v);
  const outHtml = path.join(outDir, 'pitch.html');
  fs.writeFileSync(outHtml, rendered, 'utf8');

  // Metadata
  const metadata = {
    pitch_id: v.pitch_id,
    company_name: companyName,
    industry, location, size: sizeArg, web, focus, lang, contact,
    tier,
    generated_at: new Date().toISOString(),
    model: MODEL,
    api_key_present: !!process.env.ANTHROPIC_API_KEY,
    scrape: { ok: scrape.ok, reason: scrape.reason || null, title: scrape.title || null, signals: scrape.signals || null },
    llm_used: !!llmVars,
    template_vars: v,
  };
  fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  console.log(`✅ Generirano: ${outHtml}`);
  console.log(`   Metadata:  ${path.join(outDir, 'metadata.json')}`);

  if (argv.open) {
    const { spawn } = require('child_process');
    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [outHtml], { shell: true, detached: true });
  }
})();
