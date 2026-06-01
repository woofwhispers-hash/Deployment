# Think Out Loud v2.0

AI-powered private journal with mood tracking, dark mode, PDF export, chat companion, PWA, streaks, and tags.

## Files to commit

```
think-out-loud/
├── index.html              ← Entire frontend (single file, all features)
├── api/
│   ├── reflect.js          ← AI pattern reflection (Vercel Edge Function)
│   ├── mood.js             ← AI mood detection  (Vercel Edge Function)
│   ├── chat.js             ← AI chat companion  (Vercel Edge Function)
│   ├── verify-payment.js   ← Razorpay server verification
│   └── webhook.js          ← Razorpay subscription webhook
├── public/
│   ├── manifest.json       ← PWA manifest
│   ├── sw.js               ← Service worker (offline support)
│   └── robots.txt          ← SEO
├── vercel.json             ← Routing config
├── package.json
├── .gitignore              ← .env.local excluded
└── .env.example            ← Template — copy to .env.local
```

## One-time Vercel setup

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SUPABASE_URL` | `https://gqlfprcrbfbybxlkpekk.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Your Razorpay Webhook Secret |

Then redeploy.

## Switch to production Razorpay

In `index.html`, find:
```js
const RZP_KEY = 'rzp_test_SrUXHkbYv4YdmE';
```
Replace with your live key: `rzp_live_...`

## PWA icons needed

Add to root (alongside index.html):
- `icon-192.png` — 192×192px app icon
- `icon-512.png` — 512×512px app icon

## Supabase

Your DB is already set up with RLS enabled on all tables. No further SQL needed.

## Features

| Feature | Plan |
|---|---|
| Write entries (5/month) | Free |
| Mood tracking + streak | Free |
| Dark / Light mode | Free |
| Autosave draft | Free |
| Daily writing prompts | Free |
| AI mood detection | Free |
| Mood chart + activity bars | Free |
| Tag system + filtering | Free |
| PWA install | Free |
| Daily notifications | Free |
| AI reflections | Pro |
| AI chat companion | Pro |
| PDF / Markdown / TXT export | Pro |
| Unlimited entries | Pro |
