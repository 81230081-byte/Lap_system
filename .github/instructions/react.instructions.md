React / Vercel Development Instructions

These rules apply to the Lab System React/Vite frontend and its Vercel deployment.

Frontend Security

The browser must always be considered untrusted.

Never use frontend code as the only security boundary.

Frontend permission checks are only for user experience.

Database RLS and server-side RPC authorization must independently enforce permissions.

Never assume that hiding a button makes an operation secure.

Supabase Client

Use the existing Supabase client configuration.

Do not create duplicate Supabase clients unless there is a documented reason.

Never use a Supabase service-role key in React or browser code.

Never expose:

* service-role keys
* database passwords
* private API keys
* GitHub tokens
* Vercel tokens
* private credentials

through frontend code.

Authentication

Use the authenticated Supabase session.

Do not trust a username or role stored only in localStorage.

Do not use manually supplied user IDs for authorization.

The backend/database must determine the authenticated user using:

auth.uid()

Permissions

Frontend permission checks are allowed for UI visibility:

if (can('verify_results')) {
  // show verification controls
}

However, the corresponding Supabase RPC/database operation must enforce the same permission server-side.

Never implement security using only:

if (user.role === 'manager')

Data Fetching

Avoid loading the entire database during application startup.

Do not automatically download all:

* patients
* orders
* invoices
* payments
* inventory
* transactions
* journal entries
* salary records
* audit logs
* employee records

unless there is a specific documented requirement.

Prefer:

* pagination
* filtering
* search
* lazy loading
* feature-level data fetching
* server-side aggregation
* limited result sets

Dashboard

The dashboard should request only the statistics it needs.

Do not fetch entire tables merely to calculate:

* counts
* totals
* revenue
* expenses
* inventory statistics

Prefer database aggregation or dedicated RPCs.

Realtime

Realtime subscriptions must be intentional and scoped.

Do not subscribe every user to every table.

Subscribe only to the data required by the current feature.

Do not create unnecessary duplicate subscriptions.

Always clean up subscriptions when components unmount.

Patient Data

Do not log sensitive patient information to the browser console.

Avoid exposing unnecessary patient information in:

* URLs
* query strings
* localStorage
* sessionStorage
* error messages

Only fetch the patient fields required by the current screen.

Laboratory Results

The frontend must respect the laboratory result lifecycle.

Typical workflow:

pending
   ↓
pending_review
   ↓
completed

The frontend must never assume that it can directly change a result to completed.

Verification must be performed through an authorized server-side operation.

Financial UI

Financial pages should only load data for authorized users.

Do not fetch financial data first and then hide it using React.

Bad:

const allTransactions = await getAllTransactions();
if (!canViewFinance) {
  hideFinance();
}

Better:

if (canViewFinance) {
  await loadTransactions();
}

The database must also enforce access.

Error Handling

Do not expose raw database errors to users.

Avoid displaying:

* SQL statements
* database schema
* stack traces
* internal function names
* credentials
* tokens

Use safe user-facing messages.

For debugging, log only appropriate non-sensitive information.

Environment Variables

Use environment variables for environment-specific configuration.

Never hardcode secrets.

Never expose server-only secrets through variables beginning with:

VITE_

Treat all VITE_* values as potentially visible to the browser.

Vercel

The project is deployed through Vercel.

Development workflow:

Feature branch
      ↓
GitHub Pull Request
      ↓
Vercel Preview
      ↓
Testing
      ↓
Review
      ↓
main
      ↓
Production

Do not make unreviewed production changes.

Performance

Avoid unnecessary re-renders.

Avoid unnecessary Supabase queries.

Avoid duplicate requests.

Use appropriate React patterns for:

* memoization
* stable callbacks
* pagination
* lazy loading
* component splitting

Do not optimize blindly.

Measure first when possible.

Dependencies

Do not introduce new npm dependencies unless necessary.

Before adding a dependency:

1. Check whether the project already has equivalent functionality.
2. Consider bundle size.
3. Consider maintenance.
4. Consider security.
5. Consider compatibility with Vercel.

Code Changes

Before modifying a component, understand:

* where it is used
* what data it receives
* what Supabase calls it makes
* what permissions it requires
* whether other screens depend on it

Do not rewrite large sections unnecessarily.

Prefer focused, reviewable changes.

Testing

After meaningful frontend changes, verify:

* build
* lint
* relevant tests
* Supabase calls
* authentication behavior
* permission behavior
* mobile layout when relevant

Never claim a test passed unless it was actually executed.

Final Rule

React controls the user interface.

Supabase controls authorization.

Vercel controls deployment.

Never move security responsibilities from Supabase into the browser.
