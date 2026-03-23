# Fund Manager

## System Introduction

Fund Manager is a full-stack collective savings and loan management system built for community funds, cooperatives, and member-based financial groups. It replaces fragmented spreadsheet-based tracking with a single application for managing members, savings activity, loan operations, internal accounting records, and institutional reporting.

The system is designed to support the day-to-day work of a savings fund committee or administrator. It provides a structured way to register members, record deposits and withdrawals, issue and track loans, capture repayments and penalties, monitor reserve and distribution activity, and maintain a reliable record of the fund's financial position over time.

The application also reflects practical local operating needs. It includes support for Nepali and English usage patterns, configurable organizational settings, AD and BS date handling, role-based access for administrators and staff, and operational safety features such as backup, restore, and export tools.

## System Overview

At a high level, the platform consists of a React frontend, an Express API layer, and a SQLite database. The frontend provides authenticated screens for operational staff and administrators, while the backend handles business rules, persistence, reporting queries, file handling, and system maintenance functions.

### Core Functional Areas

- **Dashboard and monitoring:** Gives users a live view of balances, activity, and high-level fund signals.
- **Member management:** Stores member profiles, contact details, joined date, status, optional photo, and member-linked financial activity.
- **Savings management:** Records deposits and withdrawals and maintains each member's net savings position.
- **Loan management:** Supports loan creation, approval, repayment tracking, penalties, attached documents, and loan status monitoring from pending to completed or defaulted.
- **Fund ledger and adjustments:** Maintains accounting-style debit and credit entries plus manual balance adjustments where needed.
- **Income periods and distributions:** Tracks income windows, allocation cycles, and distribution history for the fund.
- **Reserve fund management:** Separately records reserve-related debit, credit, and balance activity.
- **Reports and analytics:** Produces summaries such as savings performance, loan portfolio, income statement, balance sheet, and overdue loans.
- **Export and backup:** Allows Excel export of major datasets and SQLite backup and restore for operational continuity.
- **User and access control:** Supports authenticated access with admin, manager, and member roles.

### High-Level Architecture

- **Client application:** The UI lives in `client/` and is built with React, React Router, Vite, Tailwind CSS, and Recharts. It uses protected routes to restrict access and lazy-loads major pages for faster navigation.
- **Server application:** The API lives in `server/` and is built with Express. It exposes endpoints for members, savings, loans, reports, settings, fund ledger, income, distributions, reserve fund, authentication, exports, and backups.
- **Database layer:** The system uses `better-sqlite3` with a local SQLite database stored in `server/data/fund.db`. WAL mode is enabled to improve durability and concurrent access behavior.
- **Authentication model:** Users sign in through a session-token flow. Passwords are stored as salted PBKDF2 hashes, and active sessions are persisted in the database.
- **File storage:** Uploaded assets such as member photos and loan documents are stored under `server/uploads/`. Database backup files are stored under `server/backups/`.

### Main Data Domains

The database is organized around the fund's core operating records:

- `members` for profile and status data
- `savings` for deposit and withdrawal transactions
- `loans`, `loan_repayments`, `loan_documents`, and `penalties` for the full credit lifecycle
- `fund_ledger` and `balance_adjustments` for accounting control
- `income_periods` and `income_entries` for income tracking
- `distributions` and `reserve_fund` for allocation and reserve records
- `settings`, `users`, and `sessions` for system configuration and access control

### Operational Flow

In normal use, administrators or managers first configure the organization and user accounts, then register members and begin recording savings transactions. When members borrow from the fund, staff create loan records, approve them, and track repayments, interest, penalties, and supporting documents. The system aggregates this operational data into dashboards, reports, exports, and balance-oriented views so fund leadership can monitor health, performance, and accountability.

### Administration and Reliability

The system includes several features intended to support safe operation in a real fund environment:

- Role-based access to protect sensitive functions
- Configurable organization, currency, language, calendar, and interest settings
- Built-in database backup download and restore workflow
- Automatic pre-restore backup creation before database replacement
- Excel exports for members, savings, loans, and consolidated reports

## Intended Outcome

The overall purpose of Fund Manager is to give a savings group a dependable internal system of record. It centralizes operational transactions, improves transparency, reduces manual bookkeeping risk, and makes it easier to manage both member services and the fund's financial oversight from one place.
