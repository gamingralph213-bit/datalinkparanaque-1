# DataLink Parañaque - Professional Land Data Processor

## 🚀 Overview
**DataLink Parañaque** is a specialized, offline-first web application designed for the City Government of Parañaque’s Real Property Data Division. It automates the cleaning, validation, and relational joining of complex land record spreadsheets, transforming raw data into audit-ready intelligence.

---

## 🛠 Core Workflows

### 1. Standard Processor
Designed for high-volume data cleaning and financial re-calibration of general land records.
- **Multi-File Import**: Drag and drop multiple property spreadsheets simultaneously.
- **Engine Logic**: 
  - **System Cleanup**: Removes noise rows (headers, totals, empty lines).
  - **Deduplication**: Identifies duplicate PINs and prioritizes the highest/latest ARP number.
  - **Calibration**: Auto-maps locations and unit values based on official Barangay section rules.
- **Export**: Generates a comprehensive **23-column** report.
- **Naming Convention**: `Geographic Coverage_Data Integrity Filters_UPDATE CODE.xlsx`

### 2. Abstract of Transactions
A specialized relational joiner for generating official property transfer reports.
- **Three-Way Join**: Intelligently links **Assessment Rolls** (reference), **Journal Logs** (transactions), and **Sales Data** (consideration).
- **TD Expansion**: Automatically detects and expands multi-property strings (e.g., `E-003-52121/22/23`) into individual records while maintaining relational links.
- **Smart Consideration**: Maps the `SELLING PRICE` from Sales Data to the primary record, while secondary linked records receive a "REF" label to prevent financial double-counting.
- **Export**: Generates a standardized **17-column** Relational Report.

---

## 📊 Key Features

### 🔍 Smart Header Detection
The engine uses **Fuzzy Matcher** technology (case-insensitive and punctuation-agnostic) to identify columns. It recognizes variations like `ARP NO.`, `TD No#`, or `Tax Dec` automatically.

### 🛡️ Data Integrity Filters
Every record is analyzed and assigned a status:
- **VALID**: Passed all validation checks.
- **DUPLICATE**: Archived as a duplicate PIN.
- **AREA ERROR**: Flagged for zero or invalid land area.
- **INVALID PIN**: Non-standard PIN format detected.
- **INCOMPLETE**: Missing critical fields like Account Name or ARP.

### 📈 Administrative Analytics
- **Usage Distribution**: Visualizes property types (RESI, COMM, INDU).
- **Geographic Hotspots**: identifies barangays with high transaction volumes.
- **Relational Success**: Tracks the match rate between Journals and Assessment Rolls.

### 🏛️ Audit Vault
A persistent administrative log that tracks every processing run.
- **Metadata Storage**: Saves summary counts and financial aggregates.
- **Recovery Manager**: Allows users to download the original raw datasets from previous sessions.

---

## ⚙️ Configuration Suite
Users can modify global parameters in the **Configuration Panel**:
- **Location Intelligence**: Update base unit values for sections within the 16 Barangays.
- **Financial Calibration**: Adjust Assessment Levels and Tax Rates for all Actual Use (AU) codes.
- **Multipliers**: Configurable 2028-to-2029 projection rules.

---

## 📄 Export Format Specifications

### Standard Processor (23 Columns)
`TYPE` | `DATE` | `ARP NO#` | `PIN` | `PREVIOUS` | `NEW ARP NO#` | `UPDATE` | `TAXABILITY` | `ACCTNAME` | `ADDRESS` | `LOCATION` | `KIND` | `AU` | `LAND AREA` | `UNIT VALUE (2028)` | `MARKET VALUE (2028)` | `ASSESSED VALUE (2028)` | `YEARLY TAX (2028 CAP)` | `UNIT VALUE (2029)` | `MARKET VALUE (2029)` | `ASSESSED VALUE (2029)` | `YEARLY TAX (2029)` | `RECORD STATUS`

### Abstract of Transactions (17 Columns)
`ARP NO.` | `DATE OF CONVEYANCE/TRANSFER` | `OWNERSHIP TRANSFER FROM` | `OWNERSHIP TRANSFER TO` | `ADDRESS OF NEW OWNER` | `LOCATION OF PROPERTY` | `MODE OF CONVEYANCE` (DEED OF SALE) | `AMOUNT OF CONSIDERATION` | `PROPERTY CONVEYED (L)` | `PROPERTY CONVEYED (B)` | `AREA (LAND/BLDG.)` | `LOT NO.` | `TITLE NO. (PREVIOUS)` | `TITLE NO. (NEW)` | `NOTARIAL DATE` | `DOCUMENT FILE NO.` | `NOTARY / AGENT`

---

## 🔒 Security & Privacy
- **100% Offline Processing**: No property data ever leaves the local machine. All calculations are performed in the browser.
- **No Cloud Storage**: Property records are stored only in memory for the duration of the session.
- **Audit Persistence**: Meta-reports are stored locally in the browser's vault (`LocalStorage`) and are never synced to external servers.

---
*Built for the Parañaque City Government - Real Property Data Division.*