# WarungOS

[cloudflarebutton]

A modern Neo-Brutalist POS application for small shops, designed for Gen Z, featuring product management and sales tracking.

## About The Project

WarungOS is a visually striking, modern Point-of-Sale (POS) and inventory management system designed for small shops ('warung'). The application features a bold Neo-Brutalism user interface, targeting a tech-savvy Gen Z audience.

The core functionality is split into two main views: a fast, intuitive POS screen for daily sales, and a comprehensive Dashboard for administrative tasks. The POS view displays a grid of products that can be added to a live-updating cart. The Dashboard allows shop owners to perform CRUD operations on their product catalog, including updating names, prices, and images, and to review sales history.

The entire experience is wrapped in a high-contrast, energetic design inspired by Cloudflare's aesthetic, with sharp edges, solid colors, and interactive micro-animations that provide satisfying tactile feedback.

## Key Features

*   **Point of Sale (POS):** A fast, intuitive interface for processing customer orders.
*   **Product Management:** A full admin dashboard for CRUD (Create, Read, Update, Delete) operations on products.
*   **Sales History:** View and track past transactions to monitor shop performance.
*   **Neo-Brutalist UI:** A unique, modern design with high contrast and tactile interactions, tailored for a Gen Z audience.
*   **Responsive Design:** Flawless user experience across desktops, tablets, and mobile devices.
*   **Client-Side State Management:** Fast and reactive UI powered by Zustand for a smooth user experience.

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
    git clone https://github.com/your-username/warungos.git
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd warungos
    ```
3.  **Install dependencies:**
    ```sh
    bun install
    ```

## Development

To run the application in development mode, which includes hot-reloading for both the frontend and the backend worker:

```sh
bun run dev
```

This command will start the Vite development server for the React frontend and a local Wrangler server for the Hono backend, accessible at `http://localhost:3000`.

## Project Structure

*   `src/`: Contains the React frontend application code.
    *   `pages/`: Main pages/views of the application.
    *   `components/`: Reusable React components.
    *   `lib/`: Utility functions and API client.
    *   `store/`: Zustand state management stores.
*   `worker/`: Contains the Hono backend code running on Cloudflare Workers.
    *   `index.ts`: The entry point for the worker.
    *   `entities.ts`: Defines data models and interactions with Durable Objects.
*   `shared/`: TypeScript types and interfaces shared between the frontend and backend.

## Deployment

This project is designed for seamless deployment to the Cloudflare network.

1.  **Build the application:**
    ```sh
    bun run build
    ```
2.  **Deploy to Cloudflare:**
    ```sh
    bun run deploy
    ```

This command will build the frontend assets, bundle the worker code, and deploy the entire application to your Cloudflare account.

Alternatively, you can deploy directly from your GitHub repository with a single click:

[cloudflarebutton]

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.