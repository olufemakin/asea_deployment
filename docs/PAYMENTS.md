# Paid access for the Sold-Out Launch Studio (Stripe)

The Studio (`/launch-calendar/`) and the AI Script Writer (`/script-writer/`) are for paying customers.
Payment is a **Stripe Payment Link**. No accounts and no database: a paid checkout gives the buyer's browser a
signed, HttpOnly access cookie that lasts 400 days.

## How it works
1. The sales page "Get the Sold-Out Launch Studio" buttons open the Stripe Payment Link (`STRIPE_CHECKOUT_URL`).
2. After paying, Stripe sends the buyer to `/access/?session_id={CHECKOUT_SESSION_ID}`.
3. `netlify/functions/access.mjs` asks Stripe for that Checkout Session. If it is complete and paid, and it was bought
   through `STRIPE_PAYMENT_LINK`, the function sets the `lwt_access` cookie, signed with `ACCESS_SECRET`.
4. `netlify/edge-functions/paywall.js` checks the cookie on `/launch-calendar/*` and `/script-writer/*`. No valid
   cookie sends the visitor to `/access/`. `netlify/functions/launch-script.mjs` checks it before every AI call.
5. New phone or browser: on `/access/` the buyer enters the email they paid with and the receipt number from their
   Stripe receipt email. The function finds their paid session and sets the cookie again.

The paywall is **off until `ACCESS_SECRET` is set**. Until then both tools stay open, so nothing breaks while you set up.

## Current checkout
Payment Link: https://buy.stripe.com/3cI9AVeBe2hz58p5bx18c04 (also hard-wired as the fallback on the sales and access pages).

## Its own Netlify project
The Studio lives in the same repo as the interview app, but should run as its **own Netlify project**:
1. Netlify → **Add new project → Import an existing project → GitHub** → `olufemakin/asea_deployment`.
2. Branch: `main` (after merging) or `claude/wonderful-turing-39z4fz`. Build command: empty. Publish directory: `.`
3. Environment variables: `LAUNCH_SITE=1` (makes `/` open the sales page) plus the four Stripe/access variables below.
4. Deploy, then **Project configuration → Change project name** (e.g. `soldoutlaunchstudio` → `https://soldoutlaunchstudio.netlify.app`).
5. Use that address in the Stripe redirect below. Netlify AI Gateway works per project, so the AI Script Writer runs there too.

## Setup
### 1. Stripe
- Create a product "Sold-Out Launch Studio" with a one-time price, and a **Payment Link** for it.
- In the Payment Link, set **After payment → Don't show confirmation page → Redirect** to
  `https://<your-launch-project>.netlify.app/access/?session_id={CHECKOUT_SESSION_ID}`.
- Turn on **Settings → Customer emails → Successful payments**, so buyers get a receipt with a receipt number.
  "Restore my access" needs it.
- Create a **restricted API key** (Developers → API keys → Create restricted key) with
  *Checkout Sessions: Read*, *PaymentIntents: Read* and *Charges: Read*. Everything else stays *None*.

### 2. Netlify (Site configuration → Environment variables)
| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | the restricted key (`rk_live_…`) |
| `STRIPE_PAYMENT_LINK` | the Payment Link id (`plink_…`) |
| `STRIPE_CHECKOUT_URL` | the Payment Link URL (`https://buy.stripe.com/…`) |
| `ACCESS_SECRET` | a long random string, e.g. the output of `openssl rand -hex 32`. Setting it switches the paywall on |

Redeploy after changing environment variables.

### 3. Check it
Buy once with a real card, confirm you land in the Studio, then refund the payment in Stripe.
Open `/launch-calendar/` in a private window: it should send you to `/access/`.

## Notes
- Changing `ACCESS_SECRET` signs everyone out. Buyers then use "Restore my access".
- A fully refunded purchase can't unlock or restore access. A browser that was unlocked before the refund stays unlocked
  until `ACCESS_SECRET` changes.
- Only `/launch-calendar/` and `/script-writer/` are gated. The sales page (`/launch-scripts/`) and `/access/` stay public.
