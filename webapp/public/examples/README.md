# Example document templates

Real `.xlsx` templates served by the "Download example" links in the document
upload flow. Organized by section so each upload page can link to its own
templates. Served at `/<basePath>/examples/<section>/<file>.xlsx`.

- `financial-reports/` — Monthly balance sheet, income statement (P&L)
- `financial-forecasts/` — Forecasted balance sheet, forecasted income statement
- `accounts-inventory/` — AP aging, AR aging, inventory report
- `ecommerce-performance/` — Shopify monthly sales, repeat-customer report
- `team-ownership/` — Capitalization table
- `optional-documents/` — In-store velocity (SPINS) report

To wire a link, set `exampleFile` (path relative to this folder) and
`exampleDownloadName` (the friendly filename the user receives) in the section's
config, e.g. `app/documents/financial-reports/FinancialReportsForm.tsx`.
