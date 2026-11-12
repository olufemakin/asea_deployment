# Paid access for the Sold-Out Launch Studio

Two ways to sell; both unlock the same HttpOnly access cookie:
- **Stan Store (or any store) + member access code.** Simplest. Purchases can't be checked automatically, so buyers
  get a code in their purchase email and enter it once on `/access/`.
- **Stripe Payment Link.** Purchases are checked with Stripe automatically (details below).

## Stan Store setup
1. In Stan Store, create a **Digital Product** "Sold-Out Launch Studio" with your price.
2. In the product's delivery / confirmation email, give buyers:
   - the Studio link: `https://<your-launch-project>.netlify.app/access/`
   - the member code, e.g. `LAUNCH-2026-GOLD` (8+ characters; make up your own).
3. In Netlify (the launch project), set:

   | Variable | Value |
   |---|---|
   | `LAUNCH_SITE` | `1` |
   | `STORE_URL` | your Stan Store product link (all buy buttons go here) |
   | `ACCESS_CODES` | your code, e.g. `LAUNCH-2026-GOLD` (several codes: comma-separated) |
   | `ACCESS_SECRET` | a long random string; setting it switches the paywall on |

4. Redeploy. Test: open `/launch-calendar/` in a private window, you should land on `/access/`; enter the code.

Codes can be shared. To stop a leaked code, add a new one to `ACCESS_CODES`, update the Stan delivery email, then remove
the old one. Browsers already unlocked stay unlocked until `ACCESS_SECRET` changes.

# Stripe (alternative)

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


## Automatic delivery email (Stripe): everything in one email
After each paid checkout, `netlify/functions/stripe-webhook.mjs` emails the buyer:
- a button that unlocks and opens the **Members Hub** (`/members/`) on any device (`/access/?session_id=…&next=/members/`);
- the list of everything included (calendar, 120 scripts, AI writer, personal branding, authority studio, live scripts);
- both PDFs **attached**: `members/downloads/sold-out-launch-studio-workbook.pdf` and `selling-confidently-and-naturally.pdf`
  (netlify.toml includes them in the function);
- the community link (if `COMMUNITY_URL` is set).

The Members Hub (`/members/`, behind the paywall) links every tool and both downloads. After paying, buyers land there.
Rebuild the workbook after changing Studio content: `node tools/build-workbook.cjs`.
It uses [Resend](https://resend.com) to send email.
1. Resend: create an account, verify your sending domain, create an API key.
2. Stripe → Developers → Webhooks → **Add endpoint**: `https://<your-launch-project>.netlify.app/.netlify/functions/stripe-webhook`,
   event **checkout.session.completed**. Copy its **Signing secret** (`whsec_…`).
3. Netlify environment variables: `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DELIVERY_FROM` (e.g. `Tolu <hello@yourdomain.com>`),
   optional `SITE_URL`. Redeploy. Test with a real purchase (or Stripe's test mode), then refund.

## Launch invitation page (`/invite/`)
A public "join the launch list" page. Sign-ups (name, email, consent) are saved by **Netlify Forms** (form name
`launch-invite`, no extra service).
- See and download sign-ups: Netlify → your project → **Forms** → launch-invite. (Enable form detection under Forms if asked.)
- Get an email for each sign-up: Forms → **Form notifications** → Add notification → Email notification.
- Launch date: set `LAUNCH_DATE` (e.g. `2026-12-01T18:00:00Z`) to show a countdown. Without it the page says "Coming soon".


## Pay in full, payment plan and subscription (Stripe)
Create one Stripe **Payment Link** per option (all pointing back to `/access/?session_id={CHECKOUT_SESSION_ID}`):
- **Pay in full:** a one-time price.
- **Payment plan:** a recurring price (e.g. $17 monthly). After the last instalment, cancel the subscription in Stripe
  (or set it to cancel automatically). Set `STRIPE_PLAN_LINK` (its `plink_…`) and `PLAN_PAYMENTS` (e.g. `3`): once all
  instalments are paid, access stays on for good; if someone stops paying early, access stops.
- **Subscription:** a recurring price. Access works only while the subscription is active: it unlocks for 35 days at a
  time and renews when the member opens the link in their delivery email or uses "Restore my access".

Netlify variables:
| Variable | Value |
|---|---|
| `STRIPE_PAYMENT_LINK` | all three `plink_…` ids, comma-separated |
| `STRIPE_CHECKOUT_URL` / `PLAN_CHECKOUT_URL` / `SUB_CHECKOUT_URL` | the three buy.stripe.com links |
| `PRICE_FULL` / `PRICE_PLAN` / `PRICE_SUB` | labels on the buttons, e.g. `$47 one-time`, `3 × $17`, `$9 / month` |
| `STRIPE_PLAN_LINK` / `PLAN_PAYMENTS` | the payment-plan `plink_…` and its number of instalments |

With two or more links set, the sales page's offer box shows all options and the other buy buttons scroll to it.

## Community
Set `COMMUNITY_URL` (your WhatsApp / Telegram / Skool / Facebook group link). Members then see "👥 Join the community" in
the Studio and on the access page, and it's in the delivery email. Visitors never see the link; the sales page only
adds "Access to the private learnwithtolu community" to the offer list.
