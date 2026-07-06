# 🚀 DataLink Parañaque

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**DataLink Parañaque** is a professional-grade, offline-first web application designed for the City Government of Parañaque’s Real Property Data Division. It automates the cleaning, validation, and relational joining of complex land record spreadsheets, transforming raw data into audit-ready intelligence.

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Core Workflows](#-core-workflows)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Export Specifications](#-export-specifications)
- [Security & Privacy](#-security--privacy)

---

## 🎯 Project Overview
The application solves the problem of manual data reconciliation in government real property units. It eliminates human error in financial calculations, automates parcel deduplication, and provides a specialized relational joiner for generating official "Abstract of Transactions" reports.

---

## 🛠 Core Workflows

### 1. Standard Processor
Designed for high-volume data cleaning and financial re-calibration of general land records.
- **System Cleanup**: Removes noise rows (headers, totals, empty lines).
- **Deduplication**: Identifies duplicate PINs and prioritizes the highest/latest ARP number.
- **Financial Calibration**: Auto-computes Market and Assessed values based on 2028/2029 projection rules.

### 2. Abstract of Transactions
A specialized relational joiner for generating official property transfer reports.
- **Three-Way Join**: Intelligently links **Assessment Rolls** (reference), **Journal Logs** (transactions), and **Sales Data** (consideration).
- **TD Expansion**: Automatically detects and expands multi-property strings (e.g., `E-003-52121/22/23`) into individual records.
- **Smart Consideration**: Maps the `SELLING PRICE` from Sales Data to the primary record, while secondary linked records receive a "REF" label to prevent financial double-counting.

---

## 📊 Key Features

### 🔍 Smart Header Detection
Uses a **Fuzzy Matcher** engine (case-insensitive and punctuation-agnostic) to identify columns like `ARP NO.`, `TD No#`, or `Tax Dec` automatically.

### 🛡️ Data Integrity Filters
Every record is analyzed and assigned a status: `VALID`, `DUPLICATE`, `AREA ERROR`, `INVALID PIN`, or `INCOMPLETE`.

### 📈 Diagnostic Analytics
Real-time visualization of property types (RESI, COMM, INDU), geographic hotspots, and join efficiency rates using **Recharts**.

### 🏛️ Audit Vault
A persistent administrative log that tracks every processing run, allowing users to download PDF Audit Certificates and recover raw data batches.

---

## 💻 Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **Data Engine**: XLSX (SheetJS)
- **Charts**: Recharts
- **PDF Generation**: jsPDF + AutoTable
- **Icons**: Lucide React

---

## 📂 Project Structure
```bash
src/
├── app/          # App router pages and layouts
├── components/   # UI & Dashboard components
├── contexts/     # Notification & Global providers
├── hooks/        # UI & State hooks
├── lib/          # CORE ENGINE (Processor, Importer, Locations)
│   ├── locations/# Official Barangay Section data
│   ├── processor.ts# Data validation & math logic
│   └── importer.ts # Fuzzy header detection & TD expansion
└── types/        # TypeScript interfaces
```

---

## ⚙️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/datalink-paranaque.git
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run the development server**:
   ```bash
   npm run dev
   ```
4. **Open in browser**: `http://localhost:9002`

---

## 🔒 Security & Privacy
- **100% Offline Processing**: No property data ever leaves the local machine. Calculations are performed in-browser.
- **Zero Cloud Storage**: All records are stored in volatile memory for the duration of the session.
- **Privacy First**: Designed for maximum compliance with government data privacy standards.

---
*Built for the Parañaque City Government - Real Property Data Division.*
