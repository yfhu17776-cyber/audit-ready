# AuditReady

AuditReady is a browser-only evidence reconstruction tool for **California Workers’ Compensation premium/payroll audit preparation**, initially focused on construction contractors that use subcontractors.

## Core workflow

**Payment record → subcontractor → Workers’ Comp evidence → date coverage → gap/exception → audit-ready mapping**

AuditReady is intentionally different from a general Certificate of Insurance (COI) tracker. It is designed for the point when an audit is approaching and the user needs to reconstruct which subcontractor payments are supported by Workers’ Comp-related evidence and which records still require human follow-up.

## What it does

- Imports subcontractor payment CSV data.
- Imports Workers’ Comp/evidence CSV data.
- Automatically detects common column names and displays the detected mapping.
- Retains source file name and source row number for evidence traceability.
- Matches vendors by normalized name and flags possible vendor-name mismatches instead of silently accepting them.
- Distinguishes Workers’ Comp, self-insurance, exemption, ambiguous evidence, and non-WC evidence.
- Checks whether dated evidence covers each payment date.
- Detects evidence-period gaps and missing/invalid evidence dates.
- Flags missing policy numbers separately when otherwise relevant Workers’ Comp evidence covers the payment date.
- Shows an evidence chain, reason, source reference, gap length when applicable, and next action for each review item.
- Provides a filterable review queue by exception type.
- Exports an exception CSV and a payment-to-evidence mapping CSV.
- Prints the report or saves it as PDF from the browser.
- Processes imported data locally in the browser; there is no server upload endpoint in the current app.

## Input fields

### Payment CSV

Common variations supported:

- subcontractor / subcontractor name / vendor / vendor name / company / company name / payee
- amount paid / payment amount / paid amount / amount / total
- payment date / date paid / paid date / check date / payment_date / date

### Evidence CSV

Common variations supported:

- subcontractor / vendor / company / name
- policy type / coverage type / line of business / LOB / policy
- evidence type / document type / record type / evidence
- effective date / start date / from
- expiration date / end date / to / expires
- policy number / policy no / policy #
- source / file / document / evidence source

The app accepts CSV in the current version. Excel/XLSX import is intentionally not claimed as supported yet.

## Important boundary

AuditReady is an **evidence-preparation and screening tool**. It does not determine:

- whether a person or company is legally an employee or independent contractor;
- whether a payment must legally be included in audited payroll/exposure;
- insurance classification codes;
- whether a certificate or policy is legally valid;
- final premium;
- legal, tax, accounting, insurance, or coverage advice.

A \`Matched\` result means the imported records contain Workers’ Comp-related evidence whose dates cover the payment date. A \`Matched — missing policy number\` result means the evidence/date link exists but the imported record does not contain a policy number. Neither result is a legal or insurance determination.

## Privacy model

Files are parsed locally with browser JavaScript. The current application has no server upload endpoint. Users should only process information they are authorized to handle.

## Project

Single-page static web application. No backend is required for the current functionality.

## Validation note

The repository contains a built-in stress-test sample covering renewal gaps, self-insurance, non-WC evidence, missing policy metadata, and other edge cases. The public GitHub Pages deployment should still be treated as a deployment surface rather than a substitute for browser testing with representative customer data.


<!-- regression trigger: 2026-10-04T12:38:12.698Z -->

<!-- ci-trigger-2 -->
