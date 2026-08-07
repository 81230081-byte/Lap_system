Supabase Security Instructions

These rules apply to all Supabase and PostgreSQL changes in the Lab System.

Identity

Always use:

auth.uid()

as the authenticated user’s identity.

Never trust the following values from the frontend for authorization:

* user_name
* display_name
* role
* permission
* user_id
* employee_name

The database must determine the authenticated user.

Row Level Security

All sensitive tables must have Row Level Security enabled.

Anonymous users must not access sensitive laboratory, patient, financial, employee, or audit data.

Prefer:

to authenticated

instead of:

to public

when anonymous access is not explicitly required.

RLS must enforce authorization even if a malicious user bypasses the frontend.

Permissions

Permissions must be enforced server-side.

Frontend permission checks are only for controlling UI visibility.

Never assume that this is secure:

if (can('verify_results')) {
  verifyResult();
}

The database/RPC must independently verify:

private.has_permission('verify_results')

or the appropriate existing authorization mechanism.

SECURITY DEFINER

Every SECURITY DEFINER function must:

1. Validate auth.uid().
2. Validate that the user is active.
3. Validate required permissions.
4. Validate all input IDs.
5. Validate numeric values.
6. Validate business rules.
7. Use an explicit search path.

Preferred:

security definer
set search_path = ''

Never create a privileged function that blindly trusts values supplied by the browser.

RPC Security

Privileged business operations should be implemented through controlled RPC functions.

Examples include:

* payments
* salary payments
* doctor commissions
* manual transactions
* result verification
* result rejection
* order cancellation
* permission management
* accounting operations

The RPC must enforce authorization itself.

Never rely only on the React application.

Financial Security

Financial data is highly sensitive.

Protect:

* transactions
* journal_entries
* journal_lines
* salary_payments
* doctor_commission_payments
* accounts
* chart_of_accounts
* invoices
* payments
* purchases

Never allow arbitrary client-side manipulation of accounting data.

Journal entries must always satisfy:

total debit = total credit

Reject:

* negative amounts
* invalid account IDs
* invalid references
* unauthorized operations
* invalid invoice IDs
* invalid purchase IDs

Patient Security

Patient data must not be accessible anonymously.

Do not expose unnecessary patient information through RPC responses.

Do not place sensitive patient information in URLs.

Avoid unnecessary logging of patient information.

Laboratory Results

The expected result lifecycle is:

pending
    ↓
pending_review
    ↓
completed

Only authorized users may verify results.

Only authorized users may reject results.

The frontend must never be able to bypass result verification.

Audit Logging

Sensitive operations should create audit records.

Examples:

* patient changes
* order creation
* order cancellation
* result submission
* result verification
* result rejection
* payments
* purchases
* salaries
* commissions
* treasury transactions
* permission changes
* settings changes

Audit records should identify the authenticated actor using:

auth.uid()

Do not trust the username sent from the frontend.

Migrations

Every schema/database change must be represented by a migration.

Never make undocumented database changes.

Never disable RLS as a shortcut.

Never silently drop tables or columns.

Never delete existing data unless explicitly requested.

Migration names should describe their purpose.

Example:

supabase/migrations/
202608080001_security_hardening.sql

Security Review Question

Before approving any Supabase change, ask:

Can a malicious authenticated user call this Supabase endpoint directly and bypass the UI?

If the answer is yes, the implementation is not secure.

Performance

Avoid unnecessary full-table queries.

Use:

* pagination
* filtering
* indexes
* feature-specific queries
* appropriate joins

Do not load all patients, orders, invoices, transactions, journal lines, or audit records just because the application starts.

Final Rule

Supabase is the security boundary.

The browser is untrusted.

RLS and server-side authorization must remain effective even if a user modifies the JavaScript application or calls Supabase APIs directly.
