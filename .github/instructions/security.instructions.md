Security Engineering Instructions

These rules apply to every part of the Lab System.

Security Priority

Security must never be treated as an optional feature.

Every change must consider:

1. Authentication
2. Authorization
3. Data exposure
4. Input validation
5. Database security
6. Business-logic abuse
7. Auditability
8. Performance
9. Deployment security

Threat Model

Assume that an attacker can:

* modify JavaScript in the browser
* call Supabase APIs directly
* inspect network requests
* modify request parameters
* call RPC functions directly
* attempt unauthorized IDs
* manipulate frontend state
* bypass hidden UI controls
* replay requests
* create malformed inputs

The system must remain secure under these conditions.

Authentication

Never trust a client-provided identity.

Use Supabase Auth and:

auth.uid()

as the source of authenticated identity.

A user being logged into the application does not automatically mean they are authorized for every operation.

Authorization

Authorization must be enforced on the server/database.

Never rely only on:

if (user.role === 'manager')

or:

if (can('permission')) 

These checks are only for UI behavior.

RLS and/or secure RPCs must independently enforce authorization.

Privilege Escalation

Always test for privilege escalation.

A normal employee must not be able to become a manager by changing:

* localStorage
* session state
* React state
* request parameters
* user profile values
* role fields sent by the browser

Manager-only operations must be enforced in Supabase.

Row Level Security

Sensitive tables must have RLS enabled.

Anonymous users must not have access to sensitive data.

Check both:

SELECT

and:

INSERT / UPDATE / DELETE

permissions.

Do not assume that read protection automatically protects writes.

RPC Security

Every privileged RPC must verify:

* authenticated user
* active account
* required permission
* valid inputs
* valid referenced records
* valid business state

Do not trust client-provided:

* username
* employee name
* role
* permission
* user ID

SECURITY DEFINER

SECURITY DEFINER functions require special scrutiny.

They must use an explicit search path:

set search_path = ''

They must validate authorization internally.

They must not expose unnecessary privileged functionality.

They must not become a way to bypass RLS.

Input Validation

Validate all inputs.

Especially:

* UUIDs
* amounts
* dates
* statuses
* enum-like values
* arrays
* JSON
* references to other records

Reject invalid values before performing business operations.

Financial Security

Treat financial operations as high-risk.

Protect:

* payments
* invoices
* transactions
* treasury
* salaries
* doctor commissions
* purchases
* journal entries
* chart of accounts

Never allow unauthorized manipulation of balances.

Never allow negative or invalid financial amounts.

Accounting entries must balance:

debit = credit

Business Logic

Security is not only about RLS.

Look for business-logic vulnerabilities such as:

* paying an invoice multiple times
* cancelling an already completed order
* verifying an already cancelled order
* submitting results twice
* reducing inventory multiple times
* paying more than an invoice amount
* creating invalid accounting entries
* modifying records belonging to another workflow

Validate state transitions server-side.

Patient Privacy

Protect patient information.

Do not expose unnecessary patient data.

Do not log sensitive patient data unnecessarily.

Do not include patient information in error messages unless necessary.

Do not expose unrestricted bulk patient exports.

Audit

High-risk actions must be auditable.

Record:

* authenticated actor
* action
* timestamp
* relevant reference
* safe details

Do not allow ordinary users to rewrite audit history.

Secrets

Never commit:

* passwords
* tokens
* API keys
* service-role keys
* private keys
* database credentials

If a secret is discovered in the repository, treat it as compromised and recommend rotation.

Dependencies

Review dependencies for:

* known vulnerabilities
* unnecessary packages
* abandoned packages
* suspicious packages

Do not install packages just to solve trivial problems.

XSS / Injection

Avoid unsafe HTML rendering.

Do not use dangerous HTML injection unless absolutely necessary and sanitized.

Never construct SQL using untrusted string concatenation.

Prefer parameterized queries and Supabase APIs.

Error Messages

Do not expose internal details to users.

Avoid returning:

* SQL errors
* stack traces
* database structure
* internal paths
* credentials
* tokens

Logging

Never log:

* passwords
* access tokens
* service-role keys
* private keys
* unnecessary patient data
* sensitive financial details

Security Testing

For security-sensitive changes test:

Anonymous user

Must not access protected data.

Normal employee

Must not access manager-only functionality.

Manager

Should access authorized administrative functions.

Disabled user

Must not perform protected operations.

Malicious client

Changing frontend state or request parameters must not bypass authorization.

Pull Request Security Review

Before approving a security-sensitive Pull Request, check:

* Authentication enforced
* Authorization enforced server-side
* RLS verified
* RPC authorization verified
* SECURITY DEFINER reviewed
* Input validation added
* Business logic validated
* Financial operations protected
* Patient data protected
* Audit trail preserved
* Secrets checked
* Dependencies reviewed
* Tests executed

Critical Rule

Never say a feature is secure because the UI hides it.

The correct question is:

What happens if an attacker completely ignores the UI and calls the backend directly?

If the backend still prevents the unauthorized action, the security model is working.

If the backend allows it, the feature is not secure.
