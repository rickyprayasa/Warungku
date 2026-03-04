# OMZETIN

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rickyprayasa/Warungku)

A modern Neo-Brutalist POS application for small shops, designed for Gen Z, featuring product management and sales tracking.

## About The Project

OMZETIN is a visually striking, modern Point-of-Sale (POS) and inventory management system designed for small shops ('warung'). The application features a bold Neo-Brutalism user interface, targeting a tech-savvy Gen Z audience.

The core functionality is split into two main views: a menu display for customers, and a comprehensive Dashboard for administrative tasks. The menu page displays a grid of products that customers can view. The Dashboard allows shop owners to perform CRUD operations on their product catalog, review sales history, manage purchases, and view incoming user requests for new items.

The entire experience is wrapped in a high-contrast, energetic design inspired by Cloudflare's aesthetic, with sharp edges, solid colors, and interactive micro-animations that provide satisfying tactile feedback.

## Key Features

*   **Menu Display:** A visually appealing, filterable menu for customers to browse available items.
*   **Product Management:** A full admin dashboard for CRUD (Create, Read, Update, Delete) operations on products.
*   **Sales & Purchase History:** View and track past transactions to monitor shop performance.
*   **Jajanan Requests:** A feature for customers to request new items, which appear in an admin inbox.
*   **Financial Dashboards:** Get insights into cash flow and overall financial health.
*   **Neo-Brutalist UI:** A unique, modern design with high contrast and tactile interactions, tailored for a Gen Z audience.
*   **Responsive Design:** Flawless user experience across desktops, tablets, and mobile devices.
*   **Multi-Toko:** Manage multiple stores from a single account.
*   **Real-time Analytics:** Track sales, inventory, and financial metrics in real-time.

## Technology Stack

*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
*   **UI Components:** shadcn/ui, Lucide React, Framer Motion
*   **Backend:** Vercel Serverless Functions
*   **Database:** Supabase (PostgreSQL) with Row Level Security
*   **State Management:** Zustand + TanStack Query
*   **Forms:** React Hook Form with Zod for validation
*   **Payment Gateway:** Duitku (QRIS)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   [Bun](https://bun.sh/) installed on your machine.
*   A [Supabase account](https://supabase.com/sign-up).
*   A [Vercel account](https://vercel.com/signup) (for deployment).

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/omzetin.git
    ```

2.  **Navigate to the project directory:**
    ```sh
    cd omzetin
    ```

3.  **Install dependencies:**
    ```sh
    bun install
    ```

4.  **Setup environment variables:**
    ```sh
    cp .env.example .env.local
    ```

    Then edit `.env.local` and add your Supabase credentials:
    *   `VITE_SUPABASE_URL` - Your Supabase project URL
    *   `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

    Get these from: **Supabase Dashboard > Settings > API**

5.  **Run Supabase migrations:**
    ```sh
    # Using Supabase CLI
    supabase db push

    # Or run migrations manually via Supabase Dashboard > SQL Editor
    ```

## Development

To run the application in development mode:

```sh
bun run dev
```

This will start:
*   **Frontend:** Vite dev server at `http://localhost:5173`
*   **API:** Serverless functions at `http://localhost:5173/api/*`

## Deployment

### Deploy to Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com):

1.  **Push your code to GitHub**
2.  **Import to Vercel:**
    *   Go to [vercel.com/new](https://vercel.com/new)
    *   Import your GitHub repository
    *   Vercel will detect Vite and configure settings automatically

3.  **Add Environment Variables in Vercel:**
    *   `VITE_SUPABASE_URL` - Your Supabase project URL
    *   `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
    *   `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for cron jobs)

4.  **Deploy:**
    ```sh
    vercel --prod
    ```

### Setup Cron Jobs (Keep-Alive)

To keep Supabase database active on free tier, setup cron jobs:

1.  **Add Environment Variables in Vercel:**
    *   `SUPABASE_SERVICE_ROLE_KEY` - Service role key from Supabase
    *   `CRON_SECRET` - (Optional) Random string for security

2.  **Deploy to Vercel:**
    Cron jobs are automatically configured via `vercel.json`

3.  **Verify Cron Job:**
    Check [Vercel Dashboard > Deployments > Logs](https://vercel.com/dashboard) for `[keep-alive]` logs.

📖 **Detailed Guide:** See [INSTRUCTIONS_CRON_SETUP.md](./INSTRUCTIONS_CRON_SETUP.md)

## Project Structure

```
warungku/
├── src/                    # Frontend React source
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities and API clients
│   └── contexts/          # React context providers
├── api/                   # Vercel serverless functions
│   └── cron/             # Cron job endpoints
├── public/               # Static assets (served at root)
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── shared/               # Shared types and utilities
└── worker/              # (Deprecated) Cloudflare Workers code
```

## Available Scripts

```bash
# Development
bun run dev              # Start dev server

# Building
bun run build            # Build for production
bun run preview          # Preview production build locally

# Deployment
bun run deploy           # Deploy to Vercel

# Linting
bun run lint             # Run ESLint
```

## Additional Documentation

*   [CLAUDE.md](./CLAUDE.md) - Project instructions for AI assistants
*   [INSTRUCTIONS_CRON_SETUP.md](./INSTRUCTIONS_CRON_SETUP.md) - Cron job setup guide
*   [INSTRUCTIONS_DUITKU.md](./INSTRUCTIONS_DUITKU.md) - Payment gateway setup
*   [INSTRUCTIONS_EMAIL_SETUP.md](./INSTRUCTIONS_EMAIL_SETUP.md) - Email configuration
*   [KEAMANAN_APLIKASI.md](./KEAMANAN_APLIKASI.md) - Security documentation

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Support

For support, email support@rsquareidea.my.id or join our Slack channel.

---

**Made with ❤️ by RSquare Idea**
