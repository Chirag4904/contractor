# HISAAB — FULL-STACK APPLICATION BUILD SPECIFICATION

Build a real, production-quality web application called **HISAAB**.

This is NOT a static UI prototype.

HISAAB is a construction accounting and site-management application for managing:

* Multiple construction sites
* Labour
* Attendance
* Labour advances
* Labour settlements
* Material purchases
* Cash expenses
* RTGS / NEFT payments
* Financial summaries
* Site-wise ledger
* Reports

The application should be simple enough for daily use by a contractor while maintaining strong data integrity and security.

---

# 1. TECHNOLOGY STACK

Use this stack:

## Frontend + Application Framework

* Next.js
* TypeScript
* Next.js App Router
* React

Next.js must handle both frontend and application/server-side functionality.

DO NOT create a separate Express, NestJS, or Node backend.

## Styling

* Tailwind CSS
* shadcn/ui
* Lucide icons

## Database / Backend Services

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Row Level Security (RLS)

## Deployment

* Vercel for the Next.js application
* Supabase for PostgreSQL and authentication

The application should be suitable for deployment using free/personal tiers during development and personal use.

---

# 2. NO LOCAL-FIRST ARCHITECTURE

The previous local-first requirement has been completely removed.

DO NOT use:

* IndexedDB
* Dexie.js
* localStorage as the primary database
* Firebase
* Convex
* MongoDB

All application data must be stored in Supabase PostgreSQL.

The application is cloud-backed.

Authorized users should be able to access the same data from different devices.

The application requires internet connectivity for normal operation.

---

# 3. APPLICATION ARCHITECTURE

Use:

Browser
↓
Next.js
↓
Supabase
↓
PostgreSQL

Authentication:

User
↓
Supabase Auth
↓
profiles
↓
Role
↓
RLS policies
↓
Database

Use Next.js Server Components by default where appropriate.

Use Client Components only where interactivity requires them.

Do not expose privileged Supabase credentials to the browser.

NEVER expose the Supabase service-role key to the client.

Use environment variables correctly.

---

# 4. PROJECT STRUCTURE

Use a clean structure similar to:

src/
app/
components/
lib/
supabase/
services/
hooks/
types/
utils/

supabase/
migrations/
seed.sql

Do not put all business logic inside page components.

Create reusable components and services.

---

# 5. DATABASE SCHEMA

The authoritative database schema must live in:

supabase/migrations/

Use SQL migration files.

For example:

supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_indexes.sql

Migration files must define:

* Tables
* Columns
* Primary keys
* Foreign keys
* Constraints
* Enums/check constraints
* Indexes
* RLS
* RLS policies

The TypeScript application types must correspond to the database schema.

Prefer generating Supabase TypeScript database types from the PostgreSQL schema rather than manually maintaining duplicate database types.

---

# 6. AUTHENTICATION

Use Supabase Auth.

A user must authenticate before accessing HISAAB.

Support two roles:

* admin
* user

Create a `profiles` table associated with `auth.users`.

---

# 7. ROLE-BASED ACCESS CONTROL

This is extremely important.

## ADMIN

Admin can access everything:

* Dashboard
* Sites
* Labour
* Attendance
* Advances
* Expenses
* Materials
* Labour Settlements
* Labour Payments
* Bank Payments
* Cash Expenses
* Ledger
* Reports
* Settings
* User management

## NORMAL USER

Normal users can access operational functionality.

At minimum:

* Dashboard where appropriate
* Sites
* Labour
* Attendance
* Operational expenses where appropriate

Normal users MUST NOT access:

* Labour settlements
* Labour payments
* Bank payments
* Financial ledger
* Admin reports
* User management
* Role management

Do not implement role restrictions only by hiding navigation items.

Security must be enforced through:

1. Frontend route protection
2. Next.js/server-side authorization
3. Supabase Row Level Security

A normal user must not be able to bypass the UI and directly query restricted data.

---

# 8. SITE-LEVEL USER ASSIGNMENT

DO NOT implement site-level user assignment in this version.

There should be NO `site_users` table in the initial schema.

For Phase 1:

* Admins can access all sites.
* Normal authenticated users can access the application's normal operational site data.
* Role-based restrictions are sufficient.

However, structure the application cleanly so that site-level assignment can be added later without redesigning the existing core tables.

A future version may introduce:

site_users

* site_id
* user_id
* created_at

Do NOT implement this future functionality now.

---

# 9. MAIN NAVIGATION

Desktop:

Use a persistent sidebar.

Navigation:

* Dashboard
* Sites
* Labour
* Attendance
* Expenses
* Reports
* Settings

Admin-only:

* Settlements
* Bank Payments
* Ledger
* User Management

On mobile:

Use a responsive drawer/navigation pattern.

Do not force a desktop sidebar onto small screens.

---

# 10. SITE MANAGEMENT

Create Site fields:

* id
* siteName
* siteCode
* clientName
* department
* location
* startDate
* endDate
* status
* notes
* createdAt
* updatedAt

Status:

* Active
* Completed
* On Hold
* Archived

Users can:

* Add site
* Edit site
* Search sites
* Filter sites
* Archive sites

Only admins should create/modify/archive sites unless explicitly permitted otherwise.

Never permanently delete important financial data casually.

Prefer archive/soft-delete behavior.

---

# 11. SITE DASHBOARD

Clicking a site opens its Site Dashboard.

Show:

* Site name
* Site code
* Client
* Location
* Current month

Summary cards:

* Labour Cost
* Material Cost
* Bank Payments
* Cash Expenses
* Advances
* Total Site Cost

All values must be calculated dynamically from database records.

DO NOT hard-code financial figures.

---

# 12. LABOUR

Labour fields:

* id
* siteId
* name
* role
* phone
* dailyWage
* overtimeRate
* joiningDate
* active
* notes
* createdAt
* updatedAt

Every labourer belongs to a site.

OT calculation:

overtimeRate = dailyWage / 8

Allow manual OT-rate override.

Store the actual OT rate used.

---

# 13. ATTENDANCE

Create a monthly attendance register.

User selects:

* Site
* Year
* Month

Display:

* Labour Name
* Daily Wage
* Day 1
* Day 2
* ...
* Day 31
* Present Days
* Half Days
* OT Hours
* Gross Wage
* Advance
* Net Payable

Attendance values:

* Present
* Absent
* Half Day
* Leave

Default status is empty.

Do not require typing P/A manually.

Use a selectable/clickable attendance cell.

Desktop:

* Sticky Labour Name
* Sticky header
* Horizontal scrolling
* Readable day columns

Mobile:

* Horizontal scrolling is allowed
* Keep Labour Name visible where practical
* Use touch-friendly cells
* Do not shrink 31 columns into unusable widths

---

# 14. ATTENDANCE CALCULATIONS

Present = 1 day

Half Day = 0.5 day

Absent = 0

Leave = 0

Regular wage:

(Present Days + Half Days × 0.5) × Daily Wage

OT:

OT Hours × OT Rate

Gross:

Regular Wage + OT Amount

Example:

Daily wage = ₹800
Present = 24
Half Day = 1
OT = 10 hours
OT rate = ₹100

Regular:

24.5 × ₹800 = ₹19,600

OT:

10 × ₹100 = ₹1,000

Gross:

₹20,600

Centralize all calculations.

Do not duplicate calculation logic.

---

# 15. ADVANCES

Advances are separate transactions.

Fields:

* id
* siteId
* labourId
* date
* amount
* paymentMode
* note
* createdAt
* updatedAt

Payment modes:

* Cash
* UPI
* Bank
* Other

A labourer can have multiple advances.

---

# 16. LABOUR SETTLEMENTS

Settlement is an ADMIN-ONLY feature.

Do not expose settlement pages or data to normal users.

Settlement screen:

* Labour
* Regular Wage
* OT
* Gross
* Advance
* Net Payable
* Amount Paid
* Remaining
* Payment Status

Payment status:

* Unpaid
* Partially Paid
* Paid

Do not make payment status the source of truth.

Calculate payment status from actual `labour_payments`.

Example:

Net payable = ₹18,600
Paid = ₹10,000
Remaining = ₹8,600

Status = Partially Paid

---

# 17. LABOUR PAYMENTS

Create a separate transaction table for actual labour payments.

Fields:

* id
* siteId
* labourId
* paymentDate
* amount
* paymentMode
* note
* createdAt
* updatedAt

Payment modes:

* Cash
* UPI
* Bank
* Other

These records are ADMIN ONLY.

---

# 18. MATERIAL PURCHASES

Create:

* Material Purchase
* Material Purchase Items

A purchase can contain multiple items.

Purchase:

* id
* siteId
* vendorId
* purchaseDate
* invoiceNumber
* paymentStatus
* notes
* createdAt
* updatedAt

Purchase item:

* id
* purchaseId
* materialName
* quantity
* unit
* rate
* amount

Amount:

quantity × rate

Example:

Cement:
100 bags × ₹410 = ₹41,000

Sand:
2 trolley × ₹7,500 = ₹15,000

Total:
₹56,000

Do not mix purchase amount with payment transactions.

---

# 19. VENDORS

Create a vendors table.

Fields:

* id
* name
* phone
* address
* createdAt
* updatedAt

---

# 20. BANK PAYMENTS

Create an ADMIN-ONLY Bank Payments module.

Fields:

* id
* siteId
* date
* partyName
* amount
* paymentMode
* purpose
* referenceNumber
* notes
* createdAt
* updatedAt

Payment modes:

* RTGS
* NEFT

Allow:

* Add
* Edit
* Search
* Filter by site
* Filter by date
* Filter by party
* Filter by payment mode
* Sort by date
* Sort by amount

Show:

* Total RTGS
* Total NEFT
* Total Bank Payments

Normal users cannot access this data.

---

# 21. CASH EXPENSES

Fields:

* id
* siteId
* date
* category
* description
* amount
* paidTo
* notes
* createdAt
* updatedAt

Categories:

* Material
* Labour
* Advance
* Transport
* Machinery
* Fuel
* Office
* Other

---

# 22. LEDGER

Do NOT create a separate manually maintained ledger table.

Generate the ledger from underlying financial transactions.

Include:

* Date
* Category
* Description
* Party/Labour
* Payment Mode
* Amount

The ledger is ADMIN ONLY.

Do not duplicate financial records.

---

# 23. DASHBOARD

Main Dashboard:

* Total Active Sites

Current month:

* Total Labour Cost
* Total Material Cost
* Total RTGS
* Total NEFT
* Total Cash Expenses
* Total Site Expenses

Site cards:

* Site Name
* Current Month Spend
* Labour
* Material
* Bank
* Cash

Use charts only where they improve usability.

Do not overuse charts.

---

# 24. SEARCH AND FILTERING

Support filtering by:

* Site
* Date
* Month
* Labour
* Vendor
* Payment Mode
* Category

Create reusable filter components.

On mobile use filter drawers/sheets.

---

# 25. RESPONSIVE DESIGN

Responsive design is a core requirement.

The application must work well on:

* Desktop
* Laptop
* Tablet
* Mobile

Do not simply shrink desktop layouts.

Create appropriate mobile layouts.

Forms:

* Single-column on mobile

Cards:

* Responsive grid
* Stack appropriately

Tables:

* Horizontal scrolling where necessary

Buttons:

* Touch-friendly

Navigation:

* Desktop sidebar
* Mobile drawer/navigation

Attendance:

* Touch-friendly
* Horizontal scrolling
* Sticky labour name where practical

Every major feature must remain usable on a phone.

---

# 26. UI DESIGN

Design should feel:

* Modern
* Premium
* Professional
* Clean
* Minimal
* Fast

Use:

* Rounded cards
* Strong typography
* Subtle shadows
* Excellent spacing
* Clear hierarchy
* Modern tables
* Compact forms
* Lucide icons
* Restrained colours

Avoid:

* Excessive gradients
* Excessive animations
* Childish colours
* Generic admin-dashboard styling
* Clutter

---

# 27. REUSABLE COMPONENTS

Create reusable components such as:

* DataTable
* Modal
* FormField
* CurrencyInput
* DateInput
* SiteSelector
* LabourSelector
* MonthSelector
* SummaryCard
* EmptyState
* ConfirmationDialog
* MobileFilterSheet
* PageHeader

Use shadcn/ui components wherever appropriate.

---

# 28. SERVICES / BUSINESS LOGIC

Separate business logic from UI.

Create reusable services/utilities for:

* Labour calculations
* Attendance calculations
* OT calculations
* Advance totals
* Settlement calculations
* Site totals
* Dashboard calculations
* Ledger generation
* Currency formatting
* Date formatting

Do not duplicate financial calculations.

---

# 29. SECURITY

Implement Supabase RLS on all application tables.

Admin-only data must be protected at database level.

Do not rely on frontend role checks.

Normal users must not be able to query:

* settlements
* labour payments
* bank payments
* admin ledger
* admin reports
* user management

Use authenticated user identity from Supabase Auth.

Never expose service-role credentials to the client.

---

# 30. DATA INTEGRITY

Use:

* UUID primary keys
* Foreign keys
* Appropriate NOT NULL constraints
* Appropriate CHECK constraints
* Unique constraints where required
* Indexes on frequently queried columns

Important relationships:

* Labour → Site
* Attendance → Labour
* Advance → Labour + Site
* Labour Payment → Labour + Site
* Material Purchase → Site
* Material Item → Material Purchase
* Bank Payment → Site
* Cash Expense → Site

Do NOT create site-user relationships yet.

---

# 31. AUDIT INFORMATION

For important financial records, store:

* createdAt
* updatedAt
* createdBy
* updatedBy where appropriate

This is useful for tracking who entered financial data.

---

# 32. DO NOT IMPLEMENT FUTURE FEATURES

Do not implement:

* Site-level user assignment
* GST
* TDS
* Government bill measurements
* MB
* Running bills
* Profit calculation
* AI assistant
* Advanced inventory
* Complex accounting
* Payroll compliance

Keep the architecture extensible for future additions.

Site-level user assignment may be added later using a new `site_users` junction table. Do not create that table now.

---

# 33. DEMO DATA

Create sample/demo data only if required for development.

Clearly identify demo data.

Provide a simple way to remove demo data.

Do not leave fake/demo financial figures in production.

---

# 34. ACCEPTANCE CRITERIA

Before declaring the application complete:

1. Multiple sites can be created.
2. Sites can be edited and archived.
3. Users can authenticate.
4. Admin and normal-user roles work.
5. Admin can see everything.
6. Normal users can access normal operational functionality.
7. Normal users can use attendance.
8. Normal users cannot access settlements.
9. Normal users cannot access bank payments.
10. Normal users cannot access admin ledger.
11. RLS prevents direct unauthorized access.
12. Labour can be added to sites.
13. Daily wage can be set.
14. OT rate automatically calculates as wage / 8.
15. OT rate can be overridden.
16. Attendance works for every day of a month.
17. Attendance calculations work.
18. OT calculations work.
19. Advances work.
20. Labour settlement calculations work.
21. Labour payments are stored separately.
22. Material purchases support multiple items.
23. Material amounts calculate correctly.
24. Bank payments work.
25. Cash expenses work.
26. Dashboard totals update dynamically.
27. Ledger is dynamically generated.
28. Search/filtering works.
29. Data persists in Supabase.
30. Data is available across devices for authorized users.
31. Application is fully responsive.
32. Mobile navigation works.
33. Mobile attendance remains usable.
34. No hard-coded financial totals.
35. No fake/static major features.
36. Database schema is implemented through Supabase migrations.
37. Database constraints are implemented.
38. RLS policies are implemented.
39. No service-role key is exposed to the browser.
40. Application is deployable to Vercel.
41. No `site_users` table or site-level user assignment is implemented.

---

# 35. IMPLEMENTATION ORDER

Build incrementally.

## Phase 1 — Foundation

1. Create Next.js project
2. Configure TypeScript
3. Configure Tailwind
4. Configure shadcn/ui
5. Configure Supabase
6. Create database migrations
7. Create database schema
8. Create indexes
9. Create authentication
10. Create profiles/roles
11. Create RLS
12. Create responsive application shell

## Phase 2 — Sites

13. Site Management
14. Site Dashboard

## Phase 3 — Labour

15. Labour
16. Attendance
17. Advances
18. Labour calculations

## Phase 4 — Financial Modules

19. Materials
20. Vendors
21. Cash Expenses
22. Bank Payments
23. Labour Payments
24. Settlements

## Phase 5 — Reporting

25. Dashboard
26. Ledger
27. Reports
28. Search/filtering

## Phase 6 — Finalization

29. Mobile refinement
30. RLS/security testing
31. Data validation
32. Error handling
33. Loading/empty states
34. Production cleanup
35. Vercel deployment

Do not build everything as one giant component.

Do not create fake APIs or fake database data in place of real functionality.

Build the real Supabase-backed application incrementally.

piyushpassword@123