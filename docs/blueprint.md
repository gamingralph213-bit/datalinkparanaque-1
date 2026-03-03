# **App Name**: Panaque DataLink

## Core Features:

- Data Import Module: Seamlessly import raw land record data via direct paste from Excel, file upload (.xlsx), drag & drop, or manual table input.
- Pre-processing & Validation: Display a preview table, validate column data types (Date, numeric, required fields), convert data formats, trim spaces, and auto-uppercase text fields. Show validation warnings.
- Calibration Settings Management: Configure PIN-based rules with wildcard matching (e.g., '124-00-001-010-x-x') to auto-fill or calibrate fields like Barangay, Section, Market Value, and Unit Value. Includes an overwrite toggle for existing values and configurable assessment level for computations.
- Intelligent Data Processing Engine: Apply selected logic ('Fill/Calibrate Values', 'Remove Duplications'). Deduplication prioritizes records by the highest ARP No# for duplicate PINs. Perform auto-computations (Land Area × Unit Value = Market Value, Market Value × Assessment Level = Assessed Value) based on configured settings.
- AI-Enhanced Location Standardization Tool: Utilize an AI tool to interpret free-text 'Location' entries and suggest standardized formats, aiding users in cleaning and harmonizing inconsistent location data based on recognized patterns and common addresses.
- Offline Data Persistence & Access: Leverage Firebase Firestore with offline persistence (or IndexedDB fallback) to ensure the application is fully functional and data sessions are stored locally, enabling use without an internet connection.
- Cleaned Data Export & Summary: Display processed data in a clean table, provide a summary of processing (total imported, duplicates removed, final records), and enable export to Excel (.xlsx) and CSV, or direct table copying.

## Style Guidelines:

- Primary Color: Professional blue-grey (#3179CD). This shade is chosen for its association with trust, stability, and governmental institutions, providing a clean and serious foundation without being overly vibrant.
- Background Color: A very subtle, desaturated light blue (#F7F9FB). Its near-white quality provides an airy and minimalist backdrop that aligns with modern professional aesthetics, preventing visual fatigue for data-heavy views.
- Accent Color: A deeper, yet analogous cyan-blue (#1D9ABA). This provides a clear, but not jarring, visual contrast for interactive elements and key actions, guiding user attention while maintaining a cohesive palette.
- Main font: 'Inter' (sans-serif) for both headlines and body text. Chosen for its clean, modern, and highly legible characteristics across various sizes, fitting the requirement for a professional and calculator-fast UI.
- Utilize modern, clean outlined icons consistent with Material 3 design guidelines. Icons should be clear and functional, supporting intuitive navigation and action recognition without unnecessary visual complexity.
- The UI will feature a consistent layout with a prominent title area, a left-hand settings panel, a main data preview table, and a dedicated action bar at the bottom for process, clear, and export functions. Components will reside within rounded cards with subtle shadows to enhance clarity and visual depth, adhering to a minimalist yet modern government aesthetic.
- Incorporate smooth, subtle animations for state changes (e.g., loading indicators, successful processing confirmations, data filtering transitions) to enhance user experience and convey responsiveness without distracting from data focus.