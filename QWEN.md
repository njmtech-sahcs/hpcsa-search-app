# HPCSA Registration Search - Project Context

## Project Overview

**HPCSA Registration Search** is a Next.js 16 application that automates the verification of healthcare practitioner registrations with the Health Professions Council of South Africa (HPCSA). The application supports both single registration lookups and batch processing of Excel/CSV files.

### Core Features

- **Single Registration Search**: Quick lookup by registration number with real-time status verification
- **Batch Processing**: Upload Excel (`.xlsx`, `.xls`) or CSV (`.csv`) files for bulk verification
- **Smart Filtering**:
  - CSV files: Filters by `Attended` field and `Professional council name` = "HPCSA"
  - Excel files: Uses `Registration number` field (no council filtering)
- **Export Functionality**:
  - **Export Active**: Exports verified active members (2 sheets: Active, Not Found)
  - **Export Full List**: CSV-only feature with 3 sheets (Attended, Panelists, Did Not Attend)
- **SOLID Architecture**: Service layer with proper dependency injection and interface segregation

## Technology Stack

| Technology       | Version | Purpose                         |
| ---------------- | ------- | ------------------------------- |
| **Next.js**      | 16.1.6  | React framework with App Router |
| **React**        | 19.2.3  | UI library                      |
| **TypeScript**   | 5.x     | Type-safe development           |
| **Tailwind CSS** | 4.x     | Styling                         |
| **shadcn/ui**    | Latest  | UI components                   |
| **XLSX**         | 0.18.5  | Excel/CSV parsing               |
| **Playwright**   | 1.58.2  | Browser automation (fallback)   |
| **Zod**          | 4.3.6   | Runtime validation              |

## Project Structure

```
njmtech-hpcsa-search/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── batch-search/     # Batch verification endpoint
│   │   │   └── search/            # Single search endpoint
│   │   ├── page.tsx               # Main UI component
│   │   ├── layout.tsx             # App layout
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── theme-provider.tsx     # Dark/light theme
│   │   └── theme-toggle.tsx       # Theme switcher
│   └── lib/
│       ├── services/              # Service layer (SOLID principles)
│       │   ├── types.ts           # Interfaces and types
│       │   ├── hpcsa-service.ts   # HPCSA API communication
│       │   ├── file-parser-service.ts  # CSV/Excel parsing strategies
│       │   ├── registration-extractor-service.ts  # Registration extraction
│       │   ├── batch-processor-service.ts  # Batch orchestration
│       │   └── service-container.ts  # Dependency injection container
│       └── utils.ts               # Utility functions
├── docs/                          # Sample files for testing
├── .env.example                   # Environment variables template
├── vercel.json                    # Vercel deployment config
└── package.json                   # Dependencies and scripts
```

## Building and Running

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

### Development

```bash
# Start development server (Turbo mode)
npm run dev

# Open http://localhost:3000
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format staged files (pre-commit)
npm run pretty-quick
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# HPCSA API Configuration
HPCSA_API_URL=https://hpcsaonline.custhelp.com/cc/ReportController/getDataFromRnow

# Batch Processing Configuration
BATCH_SIZE=20                    # Registrations per batch
MAX_CONCURRENT_REQUESTS=10       # Parallel API requests
REQUEST_DELAY_MS=100             # Delay between batches (ms)
REQUEST_TIMEOUT_MS=10000         # Request timeout (ms)
MAX_RETRIES=3                    # Retry attempts for failures
```

## File Format Requirements

### Excel Files (`.xlsx`, `.xls`)

| Column                | Required          | Description                             |
| --------------------- | ----------------- | --------------------------------------- |
| `Registration number` | Yes               | Registration number (e.g., `MP0518891`) |
| `Registration`        | Yes (alternative) | Alternative field name                  |

### CSV Files (`.csv`) - Zoom Attendee Reports

| Column                        | Required | Description                          |
| ----------------------------- | -------- | ------------------------------------ |
| `Attended`                    | Yes      | Must be "Yes" to process             |
| `Professional council name`   | Yes      | Must be "HPCSA" to process           |
| `Professional council number` | Yes      | Registration number for verification |

**Note**: CSV files with metadata headers (like Zoom reports) are automatically handled.

## Export Features

### Export Active (Available for .xlsx and .csv)

- **Sheet 1 (Active)**: Members with `Status = "active"`
- **Sheet 2 (Not Found)**: All other members (not found, inactive, etc.)

### Export Full List (CSV files only)

- **Sheet 1 (Attended)**: All attendees with `Attended = "Yes"`
- **Sheet 2 (Panelists)**: All panelists from "Panelist Details" section
- **Sheet 3 (Did Not Attend)**: All with `Attended = "No"`

## Architecture Principles

### SOLID Implementation

1. **Single Responsibility Principle (SRP)**
   - Each service has one clear responsibility
   - `HPCSAService`: API communication only
   - `FileParserService`: File parsing only
   - `RegistrationExtractorService`: Registration extraction only

2. **Open/Closed Principle (OCP)**
   - Registry pattern for file parsers
   - Easy to add new parsers without modifying existing code

3. **Liskov Substitution Principle (LSP)**
   - All service implementations properly substitute their interfaces

4. **Interface Segregation Principle (ISP)**
   - Small, focused interfaces
   - `FileParser`, `FileTypeDetector`, `RegistrationExtractor` are separate

5. **Dependency Inversion Principle (DIP)**
   - High-level modules depend on abstractions
   - Service container for dependency injection

### Service Layer

```typescript
// Service Container (Composition Root)
const container = getServiceContainer();
const hpcsaService = container.getHPCSAService();
const fileParser = container.getFileParserRegistry();
const extractor = container.getRegistrationExtractor();
```

## Development Conventions

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Prettier**: Auto-formatting on commit (via husky)
- **Naming**: PascalCase for components/types, camelCase for variables/functions

### Git Hooks

- **pre-commit**: Runs `pretty-quick` on staged files
- **commit-msg**: Commit message validation

### Testing

Currently no automated tests. Manual testing recommended:

1. Test single search with known registration numbers
2. Test batch upload with sample files in `docs/`
3. Verify export functionality for both Excel and CSV

## Deployment

### Vercel

The project is configured for Vercel deployment:

```bash
# Deploy to Vercel
vercel deploy
```

Configuration in `vercel.json`:

- Build command: `npm run build`
- Install command: `npm install`

### Environment Setup

Ensure all environment variables are set in Vercel dashboard:

- `HPCSA_API_URL`
- `BATCH_SIZE`
- `MAX_CONCURRENT_REQUESTS`
- `REQUEST_DELAY_MS`
- `REQUEST_TIMEOUT_MS`
- `MAX_RETRIES`

## Sample Data

Test files are available in the `docs/` folder:

- `81117837665_attendee_report.csv` - Zoom attendee report example
- `*.xlsx` - Excel spreadsheet examples

Use these files to test the batch upload functionality.

## Common Issues

### Build Errors

If you encounter module resolution errors:

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Vercel Deployment

If services folder is missing in deployment:

```bash
# Ensure services are committed
git add -f src/lib/services/
git commit -m "fix: Add services folder"
git push
```

### CSV Parsing

If CSV files show empty results:

- Check console logs for "Sample row keys"
- Verify column names match expected fields
- Ensure file is UTF-8 encoded

## API Endpoints

### POST `/api/search`

Single registration search.

**Request:**

```json
{
  "registrationNumber": "MP0518891"
}
```

**Response:**

```json
{
  "results": [
    {
      "name": "Dr John Smith",
      "registration": "MP0518891",
      "city": "Durban",
      "status": "Active"
    }
  ],
  "message": null
}
```

### POST `/api/batch-search`

Batch file processing.

**Request:** `multipart/form-data` with `file` field

**Response:**

```json
{
  "results": [...],
  "activeCount": 35,
  "inactiveCount": 0,
  "notFoundCount": 1,
  "totalProcessed": 36
}
```

## Contributing

This is an internal tool for NJM Tech. For questions or issues, contact the development team.

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Run `npm run lint` and `npm run build`
4. Submit pull request

### Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions
- `chore:` Maintenance tasks
