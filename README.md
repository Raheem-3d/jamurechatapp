# Office Chat and Task Management App

A comprehensive platform for team chat, task management, and collaboration.

## Features

- User Authentication & Role-based Access
- Department-wise Group Chats
- Custom Channel Creation
- Task-based Chat Threads
- Personal Chats
- Task Assignment & Management
- Admin Features
- Real-time Communication with Socket.io
- **🆕 AI Message Rewriter** - Improve messages with 6 different tones
- **🆕 AI Description Generator** - Auto-generate project descriptions from titles

## Tech Stack

- **Frontend**: Next.js with App Router
- **Backend**: Node.js with Express
## Multi-tenant SaaS (beta)

This build introduces organization-based registration and trials.

What’s new:
- Organization (tenant) model with 14-day trial window
- Free Trial flow: create an organization + admin user
- Organization-level subscription records (Razorpay integration updated)
- Auth/session now includes `organizationId` and subscription snapshot
- Trial emails and subscription banner upgraded to organization scope

How to try:
1) Run database migrations to apply new Prisma schema (Organization/Subscription changes).
   - Update your DB with the new schema in `prisma/schema.prisma`.
2) Start the app and visit the Home page.
3) Click “Start Free Trial” → complete the company form.
4) You’ll be auto-signed-in as the org Admin and redirected to the dashboard.

Notes and migration:
- Subscriptions are now tied to organizations, not individual users.
- Legacy `/api/register` remains for invite-based user signup and no longer creates subscriptions.
- Razorpay order and webhook now activate the organization subscription.
- More tenant isolation (scoping data to `organizationId`) and role management UI are planned next.
- **Database**: Mysql
- **ORM**: Prisma
- **Real-time**: Socket.io
- **UI**: shadcn/ui components with Tailwind CSS

## Project Structure

- `/app` - Next.js frontend
- `/backend` - Node.js Express backend
- `/prisma` - Prisma schema and migrations

## Getting Started

### Prerequisites

- Node.js (v16+)
- Mysql database
MIT

## SaaS Trial + Payments Setup

This app can run as a SaaS with a 14‑day trial, Gmail reminders, and Razorpay payments.

### 1) Environment Variables

Add the following to your `.env`:

Required
- DATABASE_URL="mysql://..."
- APP_BASE_URL="http://localhost:3000" # or your production URL
- NEXTAUTH_SECRET=...
- NEXTAUTH_URL=...

Email (choose ONE method)
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=your@gmail.com
- SMTP_PASS=app_password
- EMAIL_FROM="JamureChat <no-reply@yourdomain>"

OR Gmail OAuth2
- GMAIL_USER=your@gmail.com
- GMAIL_OAUTH_CLIENT_ID=...
- GMAIL_OAUTH_CLIENT_SECRET=...
- GMAIL_OAUTH_REFRESH_TOKEN=...
- EMAIL_FROM="JamureChat <your@gmail.com>"

Razorpay
- RAZORPAY_KEY_ID=...
- RAZORPAY_KEY_SECRET=...
- NEXT_PUBLIC_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
- RAZORPAY_WEBHOOK_SECRET=...  # create in Razorpay dashboard when adding webhook
- SUBSCRIPTION_PRICE_PAISE=99900  # default ₹999.00

Timezone
- All trial calculations are anchored to Asia/Kolkata.

**AI Features (NEW)**
```env
PERPLEXITY_API_KEY=pplx-your-api-key-here  # Required for AI Message Rewriter & Description Generator
```

### 2) Install deps and migrate

```
pnpm install
npx prisma migrate dev -n "saas-subscriptions"
```

### 3) Webhook

- In Razorpay Dashboard → Settings → Webhooks: add a webhook URL
	- URL: `${APP_BASE_URL}/api/payments/razorpay/webhook`
	- Secret: set to `RAZORPAY_WEBHOOK_SECRET`
	- Events: payment.captured (and/or order.paid)

### 4) Scheduling

- A lightweight in-process scheduler runs with the server and sends trial reminders at: 7d, 3d, 1d, 12h before, and at expiry. For higher reliability, you can replace it with a job queue (BullMQ + Redis).

### 5) Testing

```
pnpm test
```

### Notes

- Registration now creates a `Subscription` with a 14-day trial.
- Reminder emails are sent to Gmail accounts using SMTP or OAuth2.
- Orders are created via `/api/payments/razorpay/order` and confirmed via webhook.
- Admins can list subscriptions at `/api/admin/subscriptions`.




 Standalone Quick Tasks-------- new section