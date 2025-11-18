# OMZETIN
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rickyprayasa/Warungku)
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
## Technology Stack
*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
*   **UI Components:** shadcn/ui, Lucide React, Framer Motion
*   **Backend:** Hono on Cloudflare Workers
*   **Database:** Cloudflare Durable Objects for persistent state management
*   **State Management:** Zustand
*   **Forms:** React Hook Form with Zod for validation
## Getting Started
To get a local copy up and running, follow these simple steps.
### Prerequisites
*   [Bun](https://bun.sh/) installed on your machine.
*   A [Cloudflare account](https://dash.cloudflare.com/sign-up).
*   Wrangler CLI installed and configured: `bun install -g wrangler`.
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
## Development
To run the application in development mode, which includes hot-reloading for both the frontend and the backend worker:
```sh
bun run dev