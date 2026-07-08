# Archon OS - County Position Tracking Dashboard Overlay

> "Run your county, not your spreadsheets."

Archon OS is an intelligent, read-only dashboard overlay that digitizes, automates, and highlights personnel and position tracking sheets for county government administrations. Built using a modern Next.js front-end with Vanilla CSS glassmorphic aesthetics, a PostgreSQL-style SQLite relational schema, Excel in-memory ingestion, and Gemini AI parsing/ledger search capabilities.

---

## Key Features

1. **Structural Position & Slot Tracking**
   * Track organizational vacancies, freeze status, and hiring pipelines by cost-center department.
   * Relational database maps employee records directly to approved position grades.

2. **Spreadsheet Ingestion & Match Engine**
   * Upload raw annual payroll/roster exports.
   * Auto-compares names, salaries, and slot codes to flag critical budget variances.

3. **Commission Highlight & Briefing Board**
   * Automatically isolates personnel actions (hires, promotions, step changes) scheduled for target County Commission meeting dates.
   * Generates formatted board approval memo packages for print/export.

4. **Gemini AI Document Parsing**
   * Paste raw e-mails or memos containing unstructured employee changes.
   * Gemini formats them into clean JSON candidates to apply directly to the pending action database.

5. **CFO Natural Language Search**
   * CFOs can search the ledger using plain text.
   * Translates English queries (e.g. *"Show all Jail actions with proposed salary exceeding $40k"*) into read-only SQL, executes it, and renders tabular results.

---

## Quick Start Guide

### 1. Database Initialization
Before running the application, compile the database tables and seed sample cost-centers, positions, and pending commission actions:
```bash
node scripts/db_init.js
```

### 2. Start Development Server
Run the local Next.js development environment:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Archon OS overlay.

---

## Technical Architecture

* **Framework:** Next.js (App Router)
* **Styling:** Premium Vanilla CSS (dark mode, glassmorphic grids, subtle motion)
* **Database:** SQLite (SQL structure mimicking PostgreSQL, with RLS emulation)
* **Parser:** SheetJS `xlsx` for Excel/CSV parsing in-memory
* **AI:** Google Gemini API (with offline fallbacks for standalone demonstration)
