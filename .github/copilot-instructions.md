Lab System — GitHub Copilot Instructions

Project Identity

This repository contains a Laboratory Management System (Lab System).

The application is a React/Vite web application deployed through Vercel and connected to Supabase.

Main responsibilities include:

* Patient management
* Laboratory test catalog
* Orders and samples
* Result entry and verification
* Invoices and payments
* Inventory
* Suppliers and purchases
* Employees and permissions
* Salaries and doctor commissions
* Treasury
* Chart of accounts
* Journal entries
* Audit logs
* Laboratory settings
* Reports

The current data may be demo/test data, but the architecture must always be treated as production-grade.

⸻

CRITICAL SECURITY RULES

1. Never bypass authorization

Never trust authorization information supplied by the browser.

Never use frontend values such as:

* user name
* role
* permission
* user ID
* employee name

as the source of truth for authorization.

The database must derive the authenticated user from:

auth.uid()

Authorization must be enforced server-side using Supabase RLS and/or SECURITY DEFINER RPCs.

Frontend permission checks are only for UI visibility.

⸻

2. Never expose secrets

Never commit:

* Supabase service-role keys
* private API keys
* passwords
* access tokens
* GitHub tokens
* Vercel tokens
* database passwords

Never put a Supabase service-role key inside React/Vite code.

Never expose server-only secrets through VITE_* variables.

⸻

3. Supabase Security

All sensitive tables must have Row Level Security enabled.

Sensitive data must not be accessible to anonymous users.

Prefer:

to authenticated

instead of:

to public

when anonymous access is not explicitly required.

Use:

auth.uid()

for identity.

Never rely exclusively on frontend permission checks.

⸻

4. SECURITY DEFINER FUNCTIONS

Any SECURITY DEFINER function must:

1. Explicitly define search_path.
2. Validate auth.uid().
3. Validate that the user is active.
4. Validate required permissions.
5. Validate all IDs received from the client.
6. Validate numeric values.
7. Validate business rules.
8. Never trust names supplied by the client.
9. Avoid unsafe dynamic SQL.
10. Never expose privileged internal functions directly to anonymous users.

Preferred pattern:

security definer
set search_path = ''

⸻

5. Financial Operations

Financial operations are highly sensitive.

Never allow a normal employee to:

* create arbitrary journal entries
* modify journal entries
* delete accounting records
* manipulate balances
* pay salaries
* pay doctor commissions
* create arbitrary treasury transactions
* change chart of accounts

unless explicitly authorized.

Every financial operation must create an appropriate audit trail.

Journal entries must always be balanced:

total debit = total credit

Reject:

* negative amounts
* zero-value financial transactions
* invalid account IDs
* invalid references
* unauthorized accounts

⸻

6. Patient Data

Patient data is sensitive.

Never expose patient information to anonymous users.

Do not log unnecessary patient information in browser console logs.

Avoid putting sensitive patient data in URLs.

Avoid unnecessary duplication of patient data.

Use database authorization for access control.

⸻

7. Laboratory Results

Result workflows must preserve the intended lifecycle.

Typical workflow:

pending
   ↓
results entered
   ↓
pending_review
   ↓
verified
   ↓
completed

Only authorized users may verify or reject results.

Do not allow the frontend to mark a result as verified without server-side authorization.

Critical results must not bypass the normal verification workflow.

⸻

8. Audit Logging

Important actions should create audit records.

Examples:

* Patient creation/deletion
* Order creation/cancellation
* Result submission
* Result verification/rejection
* Payments
* Purchases
* Salary payments
* Doctor commissions
* Manual treasury transactions
* Permission changes
* Settings changes

Audit records should identify the actor using:

auth.uid()

Do not trust the username supplied by the browser.

⸻

9. React / Frontend

The frontend must never be considered a security boundary.

Frontend checks are useful for UX:

if (can('verify_results')) {
  ...
}

But the database must independently enforce the permission.

Avoid loading all database tables when the application starts.

Prefer:

* lazy loading
* pagination
* filtered queries
* role-based data loading
* feature-specific queries

Do not fetch sensitive financial data for users who cannot use it.

⸻

10. Performance

Avoid giant startup queries that download:

* all patients
* all orders
* all invoices
* all payments
* all inventory
* all audit logs
* all transactions
* all journal lines
* all salaries

Prefer feature-level loading.

Example:

Dashboard
   ↓
Only dashboard statistics
Patients
   ↓
Paginated patients
Orders
   ↓
Paginated orders
Finance
   ↓
Financial data only for authorized users

Realtime subscriptions must be scoped whenever possible.

Do not subscribe blindly to every table for every user.

⸻

11. Vercel

The project is deployed through Vercel.

Do not hardcode environment-specific values.

Use environment variables.

Never expose server-only secrets through frontend environment variables.

Do not modify Production configuration without explicit approval.

Prefer testing through a Vercel Preview deployment first.

⸻

12. Git Workflow

Never directly modify main unless explicitly requested.

Use feature branches:

feature/...
fix/...
security/...
refactor/...
performance/...

Examples:

security/harden-rls
security/harden-rpcs
performance/lazy-load-data
fix/result-verification
feature/reporting

Every meaningful change should be isolated and reviewable.

⸻

13. Before modifying code

First inspect:

1. Existing architecture
2. Existing database schema
3. Existing RPC functions
4. Existing RLS policies
5. Existing permissions
6. Existing frontend calls
7. Existing environment variables
8. Existing tests

Do not invent tables, columns, RPCs, or permissions without checking the repository/database first.

⸻

14. Database migrations

Every database change must be represented by a migration.

Never make undocumented schema changes.

Migration files should clearly describe their purpose.

Example:

supabase/migrations/
202608080001_security_hardening.sql
202608080002_rpc_authorization.sql

Do not silently delete production data.

Never disable RLS as a shortcut.

⸻

15. Destructive Operations

Never automatically:

* DROP tables
* DROP columns
* DELETE all patients
* DELETE transactions
* DELETE journal entries
* reset production database
* disable RLS

without explicit approval.

⸻

16. Testing

Before considering a security change complete, test:

Anonymous

Cannot read patients
Cannot read orders
Cannot read invoices
Cannot read payments
Cannot read financial data
Cannot call privileged RPCs

Active employee

Can access authorized laboratory operations
Cannot perform manager-only operations
Cannot bypass verification permissions
Cannot access restricted financial data

Manager

Can perform authorized administrative operations
Can manage permissions
Can access financial reports
Can perform manager-only financial actions

Disabled user

Cannot perform protected operations

⸻

17. Security Review Checklist

Before creating a Pull Request, check:

* RLS enabled
* Anonymous access removed where inappropriate
* auth.uid() used
* Permissions enforced server-side
* SECURITY DEFINER functions secured
* Search path explicitly set
* No secrets committed
* No service-role key in frontend
* Input validation present
* Numeric validation present
* Financial operations audited
* Result verification protected
* Disabled users blocked
* No authorization based solely on frontend
* No unnecessary bulk data loading
* Tests added/updated
* Migration included for database changes

⸻

18. Coding Style

Prefer simple, readable code.

Do not introduce large frameworks or dependencies without justification.

Reuse existing utilities.

Do not duplicate Supabase initialization.

Do not duplicate permission logic unnecessarily.

Prefer small functions.

Use meaningful names.

Security must be implemented before a feature is considered complete.

⸻

19. Bug Fixing

When fixing a bug, do not only patch the visible symptom.

Investigate:

1. Frontend
2. RPC
3. Database
4. RLS
5. Authentication
6. Authorization
7. Audit trail
8. Related workflows

Fix the root cause.

⸻

20. Copilot Behavior

Before making a significant change, explain:

* What is wrong
* Why it is wrong
* What files will change
* What database objects will change
* Security impact
* Performance impact
* Migration impact
* Testing plan

After implementation, report:

Changed:
...
Security:
...
Database:
...
Frontend:
...
Tests:
...
Remaining risks:
...

Never claim a test passed unless it was actually executed.

Never claim a migration was applied unless it was actually applied.

Never claim a deployment succeeded unless it was actually verified.

⸻

PRIMARY GOAL

The goal is not simply to make the application work.

The goal is to make Lab System:

* secure
* maintainable
* performant
* auditable
* scalable
* reliable
* production-ready

while preserving the existing business workflows.
