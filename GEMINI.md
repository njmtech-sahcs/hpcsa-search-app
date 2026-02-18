# HPCSA Registration Search Project Overview

This document provides a summary of the `hpcsa-search` project, intended to serve as instructional context for future interactions with the Gemini CLI.

## Project Purpose

The `hpcsa-search` project is a Next.js application designed to facilitate the verification of healthcare practitioner registrations with the Health Professions Council of South Africa (HPCSA). It offers both single registration lookup and robust batch processing capabilities for verifying registrations from Excel or CSV files. The tool automates the search process, provides real-time status verification, and allows for the export of results with summary sheets.

## Technologies Used

- **Framework:** Next.js 16 (with App Router)
- **Language:** TypeScript
- **Browser Automation:** Playwright
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS v4
- **File Uploads:** react-dropzone
- **Validation:** Zod (runtime type validation)
- **Data Handling:** xlsx (for Excel file processing)

## Architecture Highlights

The application follows a Next.js architecture with API routes for handling search functionalities:

- `src/app/api/search/`: Endpoint for single registration searches.
- `src/app/api/batch-search/`: Endpoint for batch processing of registration lists.

Frontend components reside in `src/app/` and `src/components/`, utilizing `shadcn/ui` for a consistent and accessible user interface. Utility functions and services are organized within `src/lib/`.

## Building and Running

### Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun (package manager)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/njmtech/hpcsa-search.git
    cd hpcsa-search
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Configuration

Copy the example environment file and configure it as needed. Defaults are generally suitable for basic operation.

```bash
cp .env.example .env
# Edit .env with your specific configurations
```

Key configurable environment variables include:

- `HPCSA_API_URL`: (Required) HPCSA online reporting endpoint.
- `BATCH_SIZE`: Number of registrations processed per batch.
- `MAX_CONCURRENT_REQUESTS`: Maximum parallel API requests.
- `REQUEST_DELAY_MS`: Delay between batches.
- `REQUEST_TIMEOUT_MS`: Request timeout in milliseconds.
- `MAX_RETRIES`: Retry attempts for failed requests.
- `PLAYWRIGHT_TIMEOUT`: Browser automation timeout in milliseconds.

### Development Server

To run the application in development mode:

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build and Start

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm run start
```

## Development Conventions and Quality Assurance

- **Linting:** ESLint is used for code quality and style enforcement.
  - `npm run lint`: Run ESLint.
  - `npm run lint:fix`: Run ESLint and automatically fix issues.
- **Pre-commit Hooks:** Husky is configured for pre-commit hooks to ensure code quality before commits. `pretty-quick` is used for staged file formatting.
- **Type Safety:** The project uses TypeScript extensively, complemented by Zod for runtime validation, ensuring robust data handling.
- **UI/UX:** Adherence to shadcn/ui components and Tailwind CSS for a consistent and modern user experience.

## Project Structure Overview

```
src/
├── app/                  # Next.js App Router: main UI and API routes
│   ├── api/              # API endpoints
│   │   ├── search/       # Single registration search
│   │   └── batch-search/ # Batch processing
│   ├── page.tsx          # Main application page
│   └── layout.tsx        # Global layout
├── components/           # React components
│   └── ui/               # shadcn/ui components
└── lib/                  # Utility functions and services
```

## Usage

### Single Search

Navigate to the "Single Search" tab, enter a registration number, and click "Search" to view real-time verification results.

### Batch Upload

Upload an Excel (.xlsx, .xls) or CSV (.csv) file containing registration numbers. The application will process these in batches, provide progress tracking, categorize results (Active, Inactive, Not Found), and allow for export of a formatted Excel report. Sample test files are available in the `docs/` directory.

## Deployment

The application can be deployed to Vercel or any Node.js hosting platform that supports Next.js.

```bash
vercel deploy
```
