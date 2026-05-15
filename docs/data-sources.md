# Data Sources

This document describes the open-data sources used to populate the `prefix_allocations` table.

---

## NANPA — North America (+1)

| Property | Value |
|---|---|
| Env var | `NANPA_DATA_URL` |
| Coverage | +1 (US primarily; Canadian prefixes stored as US in v1) |
| License | Public domain |
| Refresh cadence | Monthly (NANPA publishes updated assignments monthly) |
| Source | [nationalnanpa.com](https://nationalnanpa.com) |

### How to obtain the CSV

1. Visit [nationalnanpa.com](https://nationalnanpa.com) and navigate to **Reports → CO Code Assignment Activity**.
2. Download the CSV file for all NPAs or a specific region.
3. Set the environment variable:
   ```env
   NANPA_DATA_URL=https://<direct-link-to-CSV>
   ```
   Or place the file locally and use a `file://` path.

### Expected CSV columns

The loader looks for these column names (case-insensitive, spaces/special chars normalised to `_`):

| Role | Accepted column names |
|---|---|
| Area code (NPA) | `npa`, `area_code`, `areacode` |
| Exchange (NXX) | `nxx`, `exchange`, `nxx_x`, `co_code` |
| Carrier name | `company`, `assignee`, `carrier`, `company_name`, `operating_company` |
| State/region | `state`, `jurisdiction`, `st`, `state_or_province` |
| Effective date | `eff_dt`, `effective_date`, `date`, `assignment_date`, `date_assigned` |

Prefix stored: `NPA + NXX` (6-digit string, e.g. `"212555"`).

---

## Ofcom — United Kingdom (+44)

| Property | Value |
|---|---|
| Env var | `OFCOM_DATA_URL` |
| Coverage | +44 (UK geographic, mobile, non-geographic ranges) |
| License | Open Government Licence v3.0 |
| Refresh cadence | Monthly |
| Source | [ofcom.org.uk — Numbering data](https://www.ofcom.org.uk/phones-and-broadband/phone-numbers/numbering/numbering-data) |

### How to obtain the CSV

1. Visit the Ofcom numbering data page linked above.
2. Download the "Allocated number ranges" CSV.
3. Set the environment variable:
   ```env
   OFCOM_DATA_URL=https://<direct-link-to-CSV>
   ```

### Expected CSV columns

| Role | Accepted column names |
|---|---|
| Number / range start | `number`, `from`, `sabc`, `number_range`, `number_range_from`, `sa_bc` |
| Range end | `to`, `range_end`, `number_range_to` |
| Provider | `communications_provider`, `provider`, `company`, `operator`, `number_holder` |
| Number type | `type_of_number`, `type`, `number_type`, `service_type` |
| Allotment date | `date_of_allotment`, `date`, `allotment_date`, `date_allocated`, `date_of_allocation` |

Prefix stored: digits extracted from the range start, with leading UK trunk `0` stripped.
Example: `"020 7946 0"` → prefix `"207946"`.  
For ranges with both From and To, the common leading digits are used.

---

## ACMA — Australia (+61)

| Property | Value |
|---|---|
| Env var | *(not yet configured)* |
| Coverage | +61 (stub — proves the pipeline is generic) |
| License | Creative Commons Attribution |
| Refresh cadence | Monthly |
| Source | [acma.gov.au](https://www.acma.gov.au/numbering) |

The ACMA source is a stub in v1. Running the data loader records a `data_loads` entry with `row_count = 0` and `status = 'success'`. A future release will implement full ACMA ingestion.

---

## Running the Data Loader

```bash
# One-shot load (all sources configured via env vars)
docker compose run --profile loader data-loader

# Or directly in the data-loader workspace
cd apps/data-loader
DATABASE_URL=postgres://... NANPA_DATA_URL=... npm run data:load
```

The loader is also scheduled to run automatically inside the API container on the **2nd of each month at 03:00 UTC** (cache flush). To reload prefix data, run the data-loader container separately.

---

## Pipeline Steps

1. Download CSV from the configured URL.
2. Parse and validate: reject if fewer than 1,000 rows (for non-stub sources).
3. Batch-insert into a temporary `prefix_staging` table (session-scoped).
4. Atomic swap in a single transaction:
   - DELETE existing rows for `(source, country_code)`
   - INSERT all rows from staging with `ON CONFLICT DO UPDATE`
5. Record outcome in `data_loads` table (`started → success | failed`).
6. Idempotent: re-running produces the same result.
