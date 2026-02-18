# 🔍 HPCSA Registration Search

> **Verify healthcare practitioner registrations with the Health Professions Council of South Africa (HPCSA) — instantly and at scale.**

A powerful Next.js application designed to streamline the verification of healthcare practitioner registrations. Whether you need to check a single registration number or validate hundreds from an Excel spreadsheet, this tool automates the search process and delivers clear, actionable results.

---

## ✨ Features

### 🎯 Single Registration Search

- Quick lookup by registration number (e.g., `MP0518891`)
- Real-time status verification (Active/Inactive)
- Displays practitioner details including name and location

### 📊 Batch Processing

- **Upload Excel or CSV files** with registration lists
- **Automated batch verification** with configurable concurrency
- **Progress tracking** during processing
- **Smart categorization**: Active, Inactive, and Not Found
- **Export results** to formatted Excel with summary sheets

### 🛠 Built With

| Technology          | Purpose                               |
| ------------------- | ------------------------------------- |
| **Next.js 16**      | React framework with App Router       |
| **TypeScript**      | Type-safe development                 |
| **Playwright**      | Browser automation for HPCSA searches |
| **shadcn/ui**       | Beautiful, accessible UI components   |
| **Tailwind CSS v4** | Modern styling                        |
| **react-dropzone**  | Drag-and-drop file uploads            |
| **Zod**             | Runtime type validation               |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/njmtech/hpcsa-search.git
cd hpcsa-search

# Install dependencies
npm install
```

### Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration (defaults work for most cases)
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start verifying registrations.

---

## 📖 How to Use

### Single Search

1. Navigate to the **Single Search** tab
2. Enter a registration number (e.g., `MP0518891`)
3. Click **Search**
4. View results with status, name, and location

### Batch Upload

1. Prepare an Excel or CSV file with a **"Registration"** column
2. Navigate to the **Batch Upload** tab
3. Drag & drop or click to upload your file
4. Watch the progress as registrations are verified
5. Review the summary dashboard
6. **Export results** to Excel with one click

---

## 🏗 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── search/          # Single registration search endpoint
│   │   └── batch-search/    # Batch processing endpoint
│   ├── page.tsx             # Main UI component
│   └── layout.tsx           # App layout
├── components/
│   └── ui/                  # shadcn/ui components
└── lib/                     # Utility functions
```

---

## ⚙️ Configuration Options

| Variable                  | Default    | Description                     |
| ------------------------- | ---------- | ------------------------------- |
| `HPCSA_API_URL`           | (required) | HPCSA online reporting endpoint |
| `BATCH_SIZE`              | 20         | Registrations per batch         |
| `MAX_CONCURRENT_REQUESTS` | 10         | Parallel API requests           |
| `REQUEST_DELAY_MS`        | 100        | Delay between batches           |
| `REQUEST_TIMEOUT_MS`      | 10000      | Request timeout (ms)            |
| `MAX_RETRIES`             | 3          | Retry attempts for failures     |
| `PLAYWRIGHT_TIMEOUT`      | 30000      | Browser automation timeout (ms) |

---

## 📦 Available Scripts

```bash
npm run dev      # Start development server (Turbo mode)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 🎨 UI Components

Built with [shadcn/ui](https://ui.shadcn.com) — a collection of reusable, accessible components:

- Cards, Tables, Badges
- Progress indicators
- Drag-and-drop zones
- Tabs for navigation
- Toast notifications

---

## 📝 Example File Format

For batch uploads, structure your file with the following required columns:

**Required columns by file type:**

- **Excel files**: `Registration number` (or `Registration`)
- **CSV files**: `Attended` and `Professional council number`

**Excel (.xlsx, .xls) example:**

| Registration number | Name | Surname |
| ------------------- | ---- | ------- |
| MP0518891           | John | Smith   |
| DR1234567           | Jane | Doe     |
| DR7654321           | Bob  | Wilson  |

**CSV (.csv) example** (e.g., Zoom attendee reports):

| Attended | User Name (Original Name) | First Name | Last Name | Email            | Professional council name | Professional council number | ... |
| -------- | ------------------------- | ---------- | --------- | ---------------- | ------------------------- | --------------------------- | --- |
| Yes      | John Smith                | John       | Smith     | john@example.com | HPCSA                     | MP0518891                   | ... |
| No       | Jane Doe                  | Jane       | Doe       | jane@example.com | HPCSA                     | DR1234567                   | ... |
| Yes      | Bob Wilson                | Bob        | Wilson    | bob@example.com  | SANC                      | 15805344                    | ... |

**Supported formats:**

- Excel: `.xlsx`, `.xls`
- CSV: `.csv` (UTF-8 encoded)

**Notes:**

- Excel files: All rows are processed using the `Registration number` field
- CSV files: Only rows where `Attended` = "Yes" are processed using the `Professional council number` field
- CSV files with metadata headers (like Zoom reports) are automatically handled - only rows with valid `Attended` and `Professional council number` values are processed
- Rows with missing registration numbers or empty `Attended` values are automatically skipped

---

## 🚀 Deployment

Deploy on [Vercel](https://vercel.com) for optimal performance:

```bash
vercel deploy
```

Or deploy to any Node.js hosting platform that supports Next.js.

---

## 📄 License

This project is private and proprietary.

---

## 🤝 Contributing

This is an internal tool for NJM Tech. For questions or issues, contact the development team.

---

**Built with ❤️ for NJM Tech** | [Next.js](https://nextjs.org) + [HPCSA Verification](https://www.hpcsa.co.za)
