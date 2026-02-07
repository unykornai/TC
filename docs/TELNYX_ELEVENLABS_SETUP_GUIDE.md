# TELNYX + ELEVENLABS AI VOICE AGENT — COMPLETE SETUP GUIDE
## How We Did It, What Broke, and How to Do the Next Number Clean

**Date:** February 7, 2026  
**Author:** OPTKAS Engineering (Automated Build)  
**Status:** PRODUCTION — Line is live and answering calls  
**Phone:** 877-570-XRPL (877-570-9775)

---

## TABLE OF CONTENTS

1. [Overview — What This System Does](#1-overview)
2. [API Keys & Accounts Required](#2-api-keys)
3. [Step 1: Create the ElevenLabs Conversational Agent](#step-1)
4. [Step 2: Import the Phone Number into ElevenLabs](#step-2)
5. [Step 3: Configure the ElevenLabs Phone Number (THE CRITICAL STEP)](#step-3)
6. [Step 4: Create the TeXML Bridge File](#step-4)
7. [Step 5: Host the TeXML File (Netlify or Any Static Host)](#step-5)
8. [Step 6: Create the Telnyx TeXML Application](#step-6)
9. [Step 7: Assign the Phone Number to the TeXML App](#step-7)
10. [Step 8: Test the Line](#step-8)
11. [What Broke and Why — The 3 Issues We Hit](#issues)
12. [Quick Reference — All API Endpoints](#quick-ref)
13. [Reusable Script — Do It All In One Shot](#one-shot)

---

## 1. OVERVIEW — WHAT THIS SYSTEM DOES <a name="1-overview"></a>

```
Caller dials your number
        ↓
Telnyx receives the call (PSTN carrier)
        ↓
Telnyx TeXML App fetches your bridge XML file
        ↓
TeXML <Dial><Sip> bridges call to ElevenLabs SIP endpoint
        ↓
ElevenLabs matches the phone number to your AI agent
        ↓
AI agent answers with your custom greeting & personality
        ↓
Full conversational AI handles the call
```

**Why TeXML bridge?** ElevenLabs can receive SIP calls, but Telnyx doesn't natively forward to external SIP endpoints on inbound calls without a TeXML instruction. The TeXML bridge is a tiny XML file that tells Telnyx "dial this SIP address" — it's the glue between the two systems.

---

## 2. API KEYS & ACCOUNTS REQUIRED <a name="2-api-keys"></a>

| Service | What You Need | Where to Get It |
|:--------|:-------------|:----------------|
| **ElevenLabs** | API key (`xi-api-key`) | https://elevenlabs.io → Profile → API Keys |
| **ElevenLabs** | Agent subscription (Conversational AI) | Must have Conversational AI enabled on your plan |
| **Telnyx** | API key (v2 Bearer) | https://portal.telnyx.com → API Keys |
| **Telnyx** | A purchased phone number | Telnyx Mission Control → Numbers |
| **Static hosting** | Netlify, Vercel, S3, GitHub Pages — anything | For hosting the TeXML bridge XML |

### Our Keys (for reference)
```
ElevenLabs: sk_4e7b35d5987d5caad118e68a35ceb126ee3ded1e6dd7d854
Telnyx:     KEY019C3980408A763C1E4F8DB19C7F17E4_NdMcLcYzFsBFSkZVK1Q937
```

---

## STEP 1: CREATE THE ELEVENLABS CONVERSATIONAL AGENT <a name="step-1"></a>

### API Call
```
POST https://api.elevenlabs.io/v1/convai/agents/create
```

### Headers
```
xi-api-key: YOUR_ELEVENLABS_KEY
Content-Type: application/json
```

### Body
```json
{
  "name": "Your Agent Name",
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": "Your system prompt goes here. This is what makes the AI know things and have personality."
      },
      "first_message": "Hello! Thanks for calling. How can I help you today?",
      "language": "en"
    },
    "tts": {
      "voice_id": "cjVigY5qzO86Huf0OWal"
    }
  }
}
```

### Available Voices (Pre-made, no cloning needed)
| Voice ID | Name | Description |
|:---------|:-----|:------------|
| `cjVigY5qzO86Huf0OWal` | Smooth Tenor | Male 40s, classy, conversational — **WE USE THIS** |
| `nPczCjzI2devNBz1zQrb` | Brian | Deep, resonant, authoritative |
| `pNInz6obpgDQGcFmaJgB` | Adam | Dominant, firm male |
| `onwK4e9ZLuTAKqWW03F9` | Daniel | Steady broadcaster, British |
| `pqHfZKP75CvOlQylNhV4` | Bill | Wise, mature, balanced |

### What You Get Back
```json
{
  "agent_id": "agent_XXXXXXXXXXXXXXXXXXXX"
}
```

**SAVE THIS AGENT ID.** You need it for everything.

### To UPDATE the agent later (change prompt, voice, greeting):
```
PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}
```
Same headers, same body structure. Only include the fields you want to change.

---

## STEP 2: IMPORT THE PHONE NUMBER INTO ELEVENLABS <a name="step-2"></a>

This tells ElevenLabs "this phone number exists and it should be handled by this agent."

### API Call
```
POST https://api.elevenlabs.io/v1/convai/phone-numbers/create
```

### Headers
```
xi-api-key: YOUR_ELEVENLABS_KEY
Content-Type: application/json
```

### Body
```json
{
  "phone_number": "+18775709775",
  "provider": "telnyx",
  "label": "877-570-XRPL Main Line",
  "agent_id": "agent_XXXXXXXXXXXXXXXXXXXX"
}
```

### What You Get Back
```json
{
  "phone_number_id": "phnum_XXXXXXXXXXXXXXXXXXXX",
  "agent_id": "agent_XXXX...",
  "phone_number": "+18775709775",
  "supports_inbound": false,
  "supports_outbound": false,
  "inbound_trunk": null,
  "outbound_trunk": null
}
```

**⚠️ CRITICAL: Notice `supports_inbound: false` and `inbound_trunk: null`.** This is the default state. The phone number is registered but NOT yet configured to actually receive calls. **This is what caused Issue #2 — the line rang but nobody picked up.**

**SAVE THE `phone_number_id`.** You need it for the next step.

---

## STEP 3: CONFIGURE THE ELEVENLABS PHONE NUMBER (THE CRITICAL STEP) <a name="step-3"></a>

**This is where we got burned twice.** The ElevenLabs docs are unclear about the exact field names. Here's what actually works:

### API Call
```
PATCH https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
```

### Headers
```
xi-api-key: YOUR_ELEVENLABS_KEY
Content-Type: application/json
```

### Body — INBOUND (receiving calls)
```json
{
  "inbound_trunk_config": {
    "transport": "tcp",
    "media_encryption": "disabled"
  }
}
```

### Body — OUTBOUND (making calls)
```json
{
  "outbound_trunk_config": {
    "address": "sip.telnyx.com",
    "transport": "tcp",
    "media_encryption": "disabled",
    "username": "YOUR_TELNYX_SIP_USERNAME",
    "password": "YOUR_TELNYX_SIP_PASSWORD"
  }
}
```

### ⚠️ FIELD NAME GOTCHAS — WHAT WE LEARNED THE HARD WAY

| What you'd expect | What actually works | Notes |
|:------------------|:-------------------|:------|
| `inbound_trunk` | `inbound_trunk_config` | Config suffix required for PATCH |
| `outbound_trunk` | `outbound_trunk_config` | Config suffix required for PATCH |
| `uri` | `address` | The SIP address field is called `address`, NOT `uri` |
| `sip_uri` | `address` | Same — it's just `address` |
| `encryption` | `media_encryption` | Full field name |

### What Success Looks Like
After the PATCH, GET the phone number to verify:
```
GET https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
```

You should see:
```json
{
  "phone_number_id": "phnum_6601kgws1jt9ey7vypeymft9whsj",
  "phone_number": "+18775709775",
  "supports_inbound": true,
  "supports_outbound": true,
  "inbound_trunk": {
    "allowed_addresses": ["0.0.0.0/0"],
    "media_encryption": "disabled",
    "transport": "tcp"
  },
  "outbound_trunk": {
    "address": "sip.telnyx.com",
    "transport": "tcp",
    "media_encryption": "disabled"
  }
}
```

**If `supports_inbound` is `false`, calls will ring but the AI won't pick up.** This is the #1 gotcha.

---

## STEP 4: CREATE THE TeXML BRIDGE FILE <a name="step-4"></a>

This is a tiny XML file that tells Telnyx how to route the inbound call.

### File: `texml-bridge.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:+18775709775@sip.rtc.elevenlabs.io:5060;transport=tcp</Sip>
  </Dial>
</Response>
```

### How it works:
- Telnyx fetches this XML when a call comes in
- `<Dial><Sip>` tells Telnyx to bridge the call via SIP
- The SIP URI points to ElevenLabs' SIP endpoint: `sip.rtc.elevenlabs.io:5060`
- The `+18775709775` in the SIP URI tells ElevenLabs which agent to route to (it matches against registered phone numbers)
- `transport=tcp` — MUST match what you configured in Step 3

### FOR YOUR NEXT NUMBER:
Just change `+18775709775` to whatever the new number is. Everything else stays the same:
```xml
<Sip>sip:+1YOURNEWUMBER@sip.rtc.elevenlabs.io:5060;transport=tcp</Sip>
```

---

## STEP 5: HOST THE TeXML FILE <a name="step-5"></a>

The XML file needs to be publicly accessible via HTTPS. Telnyx will fetch it on every inbound call.

### Options:
- **Netlify** (what we use) — deploy static site, file at `/texml-bridge.xml`
- **GitHub Pages** — put it in your docs folder
- **AWS S3** — static hosting bucket
- **Any web server** — just needs to be reachable via HTTPS

### Our URL:
```
https://optkas-tc.netlify.app/texml-bridge.xml
```

### ⚠️ IMPORTANT:
- Must be HTTPS (Telnyx won't fetch HTTP)
- Must return `Content-Type: text/xml` or `application/xml`
- Must be fast — Telnyx has a timeout on fetching the XML
- Netlify serves static files instantly, so this is reliable

---

## STEP 6: CREATE THE TELNYX TeXML APPLICATION <a name="step-6"></a>

### API Call
```
POST https://api.telnyx.com/v2/texml_applications
```

### Headers
```
Authorization: Bearer YOUR_TELNYX_KEY
Content-Type: application/json
```

### Body
```json
{
  "friendly_name": "OPTKAS-ElevenLabs-Bridge",
  "voice_url": "https://YOUR-DOMAIN.netlify.app/texml-bridge.xml",
  "voice_method": "GET",
  "inbound_channels": 10,
  "outbound_channels": 10
}
```

### What You Get Back
```json
{
  "data": {
    "id": "2890265544894711120",
    "friendly_name": "OPTKAS-ElevenLabs-Bridge",
    "voice_url": "https://optkas-tc.netlify.app/texml-bridge.xml"
  }
}
```

**SAVE THE `id`.** This is your TeXML Application ID.

---

## STEP 7: ASSIGN THE PHONE NUMBER TO THE TeXML APP <a name="step-7"></a>

### API Call
```
PATCH https://api.telnyx.com/v2/phone_numbers/{telnyx_phone_number_id}/voice
```

### Headers
```
Authorization: Bearer YOUR_TELNYX_KEY
Content-Type: application/json
```

### Body
```json
{
  "connection_id": "YOUR_TEXML_APP_ID",
  "tech_prefix_enabled": false
}
```

### ⚠️ NOTE:
The `connection_id` here is the TeXML Application ID from Step 6. Even though it's called `connection_id`, you're assigning the number to the TeXML app, not a SIP connection.

### To find your Telnyx phone number ID:
```
GET https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=+18775709775
```

The `id` in the response is what you use in the PATCH URL.

---

## STEP 8: TEST THE LINE <a name="step-8"></a>

1. **Call the number** from your cell phone
2. **You should hear**: The AI greeting within 2-3 seconds
3. **If it rings forever**: Check Step 3 — `supports_inbound` must be `true`
4. **If it's dead/disconnected**: Check Step 7 — number must be assigned to TeXML app
5. **If you hear Telnyx default message**: TeXML URL is wrong or not accessible

### Verify via ElevenLabs:
```
GET https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
```
Confirm `supports_inbound: true` and `agent_id` is set.

### Verify via Telnyx:
```
GET https://api.telnyx.com/v2/phone_numbers/{phone_id}/voice
```
Confirm `connection_id` matches your TeXML app.

---

## WHAT BROKE AND WHY — THE 3 ISSUES WE HIT <a name="issues"></a>

### Issue #1: DEAD LINE (no ring, nothing)

**Symptom:** Call the number, instant disconnect or "not in service"

**Root Cause:** The phone number was assigned to an FQDN Connection (direct SIP routing) instead of a TeXML Application. FQDN connections are designed for when YOU run a SIP server. ElevenLabs doesn't work that way for inbound — it needs the call to arrive via SIP INVITE to their endpoint, which requires Telnyx to actively bridge the call.

**Fix:** Created the TeXML bridge approach:
1. Created a TeXML bridge XML file with `<Dial><Sip>` pointing to ElevenLabs
2. Hosted it on Netlify
3. Created a TeXML Application in Telnyx pointing to that URL
4. Reassigned the phone from the FQDN connection to the TeXML app

**Lesson:** Don't use FQDN connections for this. Use TeXML Applications. The TeXML bridge is the correct pattern.

---

### Issue #2: RINGS BUT NOBODY PICKS UP

**Symptom:** Phone rings 6-8 times, then voicemail or disconnect. ElevenLabs AI never answers.

**Root Cause:** When you create a phone number in ElevenLabs via the API, it defaults to:
```json
{
  "supports_inbound": false,
  "inbound_trunk": null
}
```

The phone number was **registered** with ElevenLabs but not **configured for inbound**. ElevenLabs saw the incoming SIP INVITE but didn't know it should accept it because inbound wasn't enabled.

**Fix:** PATCH the phone number with `inbound_trunk_config`:
```json
{
  "inbound_trunk_config": {
    "transport": "tcp",
    "media_encryption": "disabled"
  }
}
```

After this PATCH, `supports_inbound` flipped to `true` and the AI started picking up.

**Lesson:** ALWAYS patch the `inbound_trunk_config` immediately after creating the phone number. Don't assume the defaults will work.

---

### Issue #3: WRONG API FIELD NAMES

**Symptom:** PATCH requests return 422 Unprocessable Entity or silently ignore your updates.

**Root Cause:** ElevenLabs API field names are not what you'd guess:

| Wrong (what you'd try) | Right (what actually works) |
|:-----------------------|:---------------------------|
| `inbound_trunk` | `inbound_trunk_config` |
| `outbound_trunk` | `outbound_trunk_config` |
| `uri` or `sip_uri` | `address` |
| `encryption` | `media_encryption` |

The GET response shows `inbound_trunk` and `outbound_trunk` (without `_config`), but the PATCH endpoint requires `inbound_trunk_config` and `outbound_trunk_config` (WITH `_config`). This inconsistency cost us 3 failed attempts.

**Lesson:** The PATCH field names have `_config` suffix. The GET response does NOT. Use the exact names documented in Step 3 of this guide.

---

## QUICK REFERENCE — ALL API ENDPOINTS <a name="quick-ref"></a>

### ElevenLabs

| Action | Method | Endpoint |
|:-------|:-------|:---------|
| Create agent | POST | `https://api.elevenlabs.io/v1/convai/agents/create` |
| Update agent | PATCH | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}` |
| Get agent | GET | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}` |
| List voices | GET | `https://api.elevenlabs.io/v1/voices` |
| Import phone | POST | `https://api.elevenlabs.io/v1/convai/phone-numbers/create` |
| Update phone | PATCH | `https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}` |
| Get phone | GET | `https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}` |
| Delete phone | DELETE | `https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}` |

**Auth header:** `xi-api-key: YOUR_KEY`

### Telnyx

| Action | Method | Endpoint |
|:-------|:-------|:---------|
| List numbers | GET | `https://api.telnyx.com/v2/phone_numbers` |
| Get number voice | GET | `https://api.telnyx.com/v2/phone_numbers/{id}/voice` |
| Update number voice | PATCH | `https://api.telnyx.com/v2/phone_numbers/{id}/voice` |
| Create TeXML app | POST | `https://api.telnyx.com/v2/texml_applications` |
| List TeXML apps | GET | `https://api.telnyx.com/v2/texml_applications` |

**Auth header:** `Authorization: Bearer YOUR_KEY`

---

## REUSABLE SCRIPT — DO THE NEXT NUMBER IN ONE SHOT <a name="one-shot"></a>

Copy this PowerShell script. Replace the 5 variables at the top. Run it. Done.

```powershell
# ═══════════════════════════════════════════════════════════
# OPTKAS — Telnyx + ElevenLabs AI Voice Agent Setup Script
# Sets up a new phone number with AI agent in one shot
# ═══════════════════════════════════════════════════════════

# ── CONFIGURATION — CHANGE THESE 5 THINGS ──
$ELEVENLABS_KEY = "sk_4e7b35d5987d5caad118e68a35ceb126ee3ded1e6dd7d854"
$TELNYX_KEY     = "KEY019C3980408A763C1E4F8DB19C7F17E4_NdMcLcYzFsBFSkZVK1Q937"
$PHONE_NUMBER   = "+18775709775"          # E.164 format
$AGENT_ID       = "agent_0501kgwrcceqeyhab6fq60bzdm4h"  # Existing agent, or leave blank to create new
$TEXML_APP_ID   = "2890265544894711120"   # Existing TeXML app, or leave blank to create new
$TEXML_URL      = "https://optkas-tc.netlify.app/texml-bridge.xml"

# ── HEADERS ──
$elHeaders = @{
    "xi-api-key"   = $ELEVENLABS_KEY
    "Content-Type" = "application/json"
}
$txHeaders = @{
    "Authorization" = "Bearer $TELNYX_KEY"
    "Content-Type"  = "application/json"
}

Write-Host "═══════════════════════════════════════════" -ForegroundColor Gold
Write-Host "  OPTKAS Voice Agent Setup" -ForegroundColor Gold
Write-Host "  Phone: $PHONE_NUMBER" -ForegroundColor Gold
Write-Host "═══════════════════════════════════════════" -ForegroundColor Gold

# ── STEP 1: Create agent (if needed) ──
if (-not $AGENT_ID) {
    Write-Host "`n[1/5] Creating ElevenLabs agent..." -ForegroundColor Cyan
    $agentBody = @{
        name = "My AI Voice Agent"
        conversation_config = @{
            agent = @{
                prompt = @{ prompt = "You are a helpful AI assistant." }
                first_message = "Hello! Thanks for calling. How can I help you today?"
                language = "en"
            }
            tts = @{ voice_id = "cjVigY5qzO86Huf0OWal" }
        }
    } | ConvertTo-Json -Depth 10
    
    $resp = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/create" -Method POST -Headers $elHeaders -Body $agentBody
    $AGENT_ID = $resp.agent_id
    Write-Host "  ✅ Agent created: $AGENT_ID" -ForegroundColor Green
} else {
    Write-Host "`n[1/5] Using existing agent: $AGENT_ID" -ForegroundColor Green
}

# ── STEP 2: Import phone number into ElevenLabs ──
Write-Host "`n[2/5] Importing phone number into ElevenLabs..." -ForegroundColor Cyan
$phoneBody = @{
    phone_number = $PHONE_NUMBER
    provider     = "telnyx"
    label        = "OPTKAS Line - $PHONE_NUMBER"
    agent_id     = $AGENT_ID
} | ConvertTo-Json

try {
    $phoneResp = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/phone-numbers/create" -Method POST -Headers $elHeaders -Body $phoneBody
    $PHONE_ID = $phoneResp.phone_number_id
    Write-Host "  ✅ Phone imported: $PHONE_ID" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Phone may already exist. Checking..." -ForegroundColor Yellow
    # List existing and find it
    $existing = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/phone-numbers" -Method GET -Headers $elHeaders
    $found = $existing | Where-Object { $_.phone_number -eq $PHONE_NUMBER }
    if ($found) {
        $PHONE_ID = $found.phone_number_id
        Write-Host "  ✅ Found existing: $PHONE_ID" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Failed to create or find phone number" -ForegroundColor Red
        exit 1
    }
}

# ── STEP 3: Configure inbound + outbound trunks (THE CRITICAL STEP) ──
Write-Host "`n[3/5] Configuring inbound trunk (THIS IS THE KEY STEP)..." -ForegroundColor Cyan
$trunkBody = @{
    inbound_trunk_config = @{
        transport        = "tcp"
        media_encryption = "disabled"
    }
} | ConvertTo-Json -Depth 5

$trunkResp = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/phone-numbers/$PHONE_ID" -Method PATCH -Headers $elHeaders -Body $trunkBody
Write-Host "  ✅ Inbound configured — supports_inbound: $($trunkResp.supports_inbound)" -ForegroundColor Green

# Verify it worked
Start-Sleep -Seconds 1
$verify = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/phone-numbers/$PHONE_ID" -Method GET -Headers $elHeaders
if ($verify.supports_inbound -eq $true) {
    Write-Host "  ✅ VERIFIED: supports_inbound = true" -ForegroundColor Green
} else {
    Write-Host "  ❌ WARNING: supports_inbound is still false! Check the PATCH." -ForegroundColor Red
}

# ── STEP 4: Create TeXML app (if needed) ──
if (-not $TEXML_APP_ID) {
    Write-Host "`n[4/5] Creating Telnyx TeXML Application..." -ForegroundColor Cyan
    $texmlBody = @{
        friendly_name     = "ElevenLabs-Bridge"
        voice_url         = $TEXML_URL
        voice_method      = "GET"
        inbound_channels  = 10
        outbound_channels = 10
    } | ConvertTo-Json
    
    $texmlResp = Invoke-RestMethod -Uri "https://api.telnyx.com/v2/texml_applications" -Method POST -Headers $txHeaders -Body $texmlBody
    $TEXML_APP_ID = $texmlResp.data.id
    Write-Host "  ✅ TeXML app created: $TEXML_APP_ID" -ForegroundColor Green
} else {
    Write-Host "`n[4/5] Using existing TeXML app: $TEXML_APP_ID" -ForegroundColor Green
}

# ── STEP 5: Assign phone number to TeXML app ──
Write-Host "`n[5/5] Assigning phone to TeXML app in Telnyx..." -ForegroundColor Cyan

# First find the Telnyx phone number ID
$numSearch = Invoke-RestMethod -Uri "https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=$PHONE_NUMBER" -Method GET -Headers $txHeaders
$TELNYX_NUM_ID = $numSearch.data[0].id

$voiceBody = @{
    connection_id        = $TEXML_APP_ID
    tech_prefix_enabled  = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.telnyx.com/v2/phone_numbers/$TELNYX_NUM_ID/voice" -Method PATCH -Headers $txHeaders -Body $voiceBody
Write-Host "  ✅ Phone assigned to TeXML app" -ForegroundColor Green

# ── DONE ──
Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Gold
Write-Host "  ✅ SETUP COMPLETE" -ForegroundColor Green
Write-Host "  Phone: $PHONE_NUMBER" -ForegroundColor Gold
Write-Host "  Agent: $AGENT_ID" -ForegroundColor Gold
Write-Host "  EL Phone ID: $PHONE_ID" -ForegroundColor Gold
Write-Host "  TeXML App: $TEXML_APP_ID" -ForegroundColor Gold
Write-Host "" -ForegroundColor Gold
Write-Host "  Call $PHONE_NUMBER now to test!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Gold
```

### For the TeXML bridge file for a NEW number:
Just create a new XML file (or update the existing one) with the new number:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:+1YOURNEWNUMBER@sip.rtc.elevenlabs.io:5060;transport=tcp</Sip>
  </Dial>
</Response>
```

If you have **multiple numbers** going to **different agents**, create separate XML files:
- `texml-bridge-line1.xml` → dials `+18775709775`
- `texml-bridge-line2.xml` → dials `+1XXXXXXXXXX`

And create a separate TeXML app for each, pointing to the right XML file.

If all numbers go to the **same agent**, you can reuse one TeXML app — just make sure each number is imported into ElevenLabs and configured with `inbound_trunk_config`.

---

## ARCHITECTURE DIAGRAM

```
                    ┌──────────────────────────┐
                    │      CALLER (PSTN)       │
                    └────────────┬─────────────┘
                                 │ Dials 877-570-9775
                                 ▼
                    ┌──────────────────────────┐
                    │     TELNYX (Carrier)      │
                    │  Phone: +18775709775     │
                    │  Assigned to: TeXML App  │
                    └────────────┬─────────────┘
                                 │ Fetches TeXML bridge
                                 ▼
                    ┌──────────────────────────┐
                    │   NETLIFY (Static Host)   │
                    │  texml-bridge.xml         │
                    │  <Dial><Sip>...</Sip>    │
                    └────────────┬─────────────┘
                                 │ Returns SIP dial instruction
                                 ▼
                    ┌──────────────────────────┐
                    │  TELNYX SIP BRIDGE        │
                    │  Dials SIP endpoint       │
                    └────────────┬─────────────┘
                                 │ SIP INVITE to sip.rtc.elevenlabs.io:5060
                                 ▼
                    ┌──────────────────────────┐
                    │  ELEVENLABS (AI Engine)   │
                    │  Matches +18775709775    │
                    │  Routes to Agent          │
                    │  Agent answers with AI    │
                    └──────────────────────────┘
```

---

## COST BREAKDOWN

| Service | Cost | Notes |
|:--------|:-----|:------|
| **ElevenLabs** | ~$0.08-0.15/min | Depends on plan, voice model, LLM |
| **Telnyx** | ~$0.01/min inbound | Plus monthly number cost (~$1-2/mo) |
| **Netlify** | Free | Static hosting for the XML file |
| **Total** | ~$0.10-0.17/min | Institutional-grade AI phone line |

---

## CHECKLIST FOR NEXT NUMBER

- [ ] Purchase number on Telnyx
- [ ] Create or reuse ElevenLabs agent
- [ ] Import number into ElevenLabs (`POST /convai/phone-numbers/create`)
- [ ] **PATCH inbound_trunk_config** (transport: tcp, media_encryption: disabled)
- [ ] **VERIFY supports_inbound = true** (GET the phone number)
- [ ] Create TeXML bridge XML with the new number
- [ ] Host the XML file
- [ ] Create or reuse TeXML Application on Telnyx
- [ ] Assign number to TeXML app on Telnyx
- [ ] **CALL IT AND TEST**

---

*Built for OPTKAS Capital Markets — 877-570-XRPL*  
*"Every piece is real and verifiable."*
