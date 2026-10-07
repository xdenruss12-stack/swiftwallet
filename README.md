# Next.js

A modern Next.js 15 application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Next.js 15** - Latest version with improved performance and features
- **React 19** - Latest React version with enhanced capabilities
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development

## 🛠️ Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

## 📁 Project Structure

```
nextjs/
├── public/             # Static assets
├── src/
│   ├── app/            # App router components
│   │   ├── layout.tsx  # Root layout component
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable UI components
│   ├── styles/         # Global styles and Tailwind configuration
├── next.config.mjs     # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
└── tailwind.config.js  # Tailwind CSS configuration

```

## 🧩 Page Editing

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 🎨 Styling

This project uses Tailwind CSS for styling with the following features:

- Utility-first approach for rapid development
- Custom theme configuration
- Responsive design utilities
- PostCSS and Autoprefixer integration

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## 📱 Deployment

Build the application for production:

```bash
npm run build
```

## Swiftpay PHP deposits

The deposit wizard uses Swiftpay's hosted checkout for PHP payments. Payment orders are
created server-side and balances are credited only after a signed Swiftpay webhook is verified.
The customer redirect is not treated as proof of payment.

Before testing:

1. Configure these server-only environment variables:
   - `SWIFTPAY_ACCESS_KEY` — 32-character merchant access key.
   - `SWIFTPAY_SECRET_KEY` — merchant secret used for request and webhook signatures.
   - `SUPABASE_DB_URL` — database connection URL used by the Render pre-deploy migration.
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key used only by server routes.
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project URL and
     client-safe anon key.
   - `SWIFTPAY_WEBHOOK_URL` — public HTTPS URL ending in `/api/swiftpay/webhook`.
   - `NEXT_PUBLIC_SITE_URL` — the canonical URL used for the checkout return.
2. Configure the same webhook URL in the Swiftpay merchant portal if required by the account.
3. Render automatically applies the database migration during pre-deploy; for non-Render
   deployments, run `npm run db:migrate` with `SUPABASE_DB_URL` set.

`SWIFTPAY_ENVIRONMENT` defaults to `sandbox`. Sandbox and production credentials are separate;
switch to `production` only after provisioned live credentials and a verified production webhook
are ready. This integration currently supports PHP deposits only. KRW/USDT balances, sample
transaction activity, and withdrawal flows are not backed by this deposit ledger.

## Deploying on Render

This repository includes a Render Blueprint at `render.yaml`. Connect the GitHub repository
to Render and create a Blueprint; it provisions a Singapore Node web service on the Starter
plan, builds the Next.js app, starts it with `next start`, and health-checks `/login`.

During Blueprint setup, provide only the Supabase URL and anon key, Supabase service-role key,
the Supabase database connection URL, and Swiftpay sandbox access and secret keys. The site and
webhook URLs are preconfigured for `https://swiftwallet.onrender.com`; update them in
`render.yaml` if you change the service name or use a custom domain. Keep
`SWIFTPAY_ENVIRONMENT` at `sandbox` until Swiftpay provisions live credentials and the live
webhook is verified.

Use [`.env.example`](./.env.example) as a value checklist when entering the prompted variables
in Render or configuring a local environment. Replace placeholders with values from your
Supabase and Swiftpay sandbox accounts. Do not upload the sample placeholders as credentials;
enter secret values directly in Render's Environment settings, not in the Blueprint file or Git.

Each Render deployment runs `npm run db:migrate` as a pre-deploy step. Supabase CLI applies
only migrations not already recorded in the database migration history. Provide
`SUPABASE_DB_URL` using the Supabase project's **Session pooler** connection string (port 5432)
and URL-encode special characters in its password. If a migration fails, Render stops that
deployment before starting the new app version. Do not put secret values in `render.yaml` or
client-prefixed environment variables. Each push to the configured branch triggers an automatic
deployment.

Once set on the Render service, environment variables persist across future deployments.
Render prompts for `sync: false` secrets only when first creating the Blueprint; for an existing
service, add the listed values once under **Environment** in the Render Dashboard. Local `.env`
files are not automatically copied to Render.

## Platform administration

The `/admin` console provides administrator-only account suspension/reactivation, merchant
registration and status management, PHP wallet freeze controls, Swiftpay deposit review,
platform identity/support settings, a deposit enable/disable switch, and an audit log. Wallet
freezes prevent new deposit checkouts; payments already initiated with Swiftpay may still settle.
Payment statuses and wallet credits remain controlled by verified provider notifications. The
console does not support manual balance changes or payouts.

The existing withdrawal screens are demo-only: they do not create persisted withdrawal requests
or connect to a payout provider, so there is no withdrawal review queue. Do not treat those screens
as a production withdrawal process.

After the `20261008000000_platform_admin_controls.sql` migration has been applied and the intended
administrator has registered, grant initial console access from the Supabase SQL editor using
that account's email:

```sql
insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id) do nothing;
```

Replace the sample email with the registered administrator's address. The query inserts no
administrator if the address does not match an existing account. The role is stored in the
database, never in user-editable metadata. There is deliberately no self-service role promotion
or administrator-management control in the console.

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js and React
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new
