# AuditReady

AuditReady is a browser-based Workers' Comp audit evidence checker.

## What it does

- Imports subcontractor payment CSV data.
- Imports COI (Certificate of Insurance) records.
- Matches subcontractors by normalized name.
- Checks whether a COI coverage period covers each payment date.
- Flags **No COI** and **Date gap** exceptions.
- Calculates payment amounts associated with gaps.
- Exports the exception list as CSV.
- Prints the report / saves it as PDF from the browser.

## Privacy model

The current app processes imported CSV data in the browser with JavaScript. It does not contain a server upload endpoint. Users should still avoid entering information they are not authorized to process.

## Important limitation

AuditReady is an evidence-matching and document-gap screening tool. It is not insurance, accounting, legal, tax, or coverage advice, and a flagged record does not by itself establish that a claim, exemption, or premium treatment is legally required.

## Supported CSV fields

Payment data can use common variations of:

- subcontractor / vendor / company / name
- amount paid / payment amount / amount / total
- payment date / date paid / paid date / check date / date

COI data can use common variations of:

- subcontractor / vendor / company / name
- policy type
- effective date / start date / from
- expiration date / end date / to / expires

## Project

Single-page static web application. No backend is required for the current functionality.
