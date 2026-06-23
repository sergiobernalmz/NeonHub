# ADR-001: Security Hardening — 2026

## Status
Accepted

## Context
Security audit of NeonHub identified several critical and high severity issues requiring immediate remediation.

## Decisions

### 1. Password Hashing — Landing Page
**Problem:** Landing page used SHA-256 for password hashing (fast, unsalted, brute-forceable)
**Decision:** Replace with bcrypt (cost factor 12)
**Consequences:** Existing SHA-256 hashes must be migrated; bcrypt is ~250ms per hash

### 2. Stripe Metadata — Remove Sensitive Data
**Problem:** `owner_password_hash` (plain text) was sent to Stripe in checkout session metadata
**Decision:** Remove all sensitive data from Stripe metadata; store only non-sensitive identifiers
**Consequences:** None (Stripe never needed the password)

### 3. CSRF Protection
**Problem:** CSRF middleware existed but was never activated
**Decision:** Activate globally for all non-GET requests except webhooks and API-key routes
**Consequences:** All frontend clients must send `x-csrf-token` header on state-changing requests

### 4. JWT Token Storage
**Problem:** Access token stored in localStorage (XSS-accessible)
**Decision:** Documented as known issue; in-memory migration planned for future
**Consequences:** XSS vector can steal tokens (mitigated by CSP + input sanitization)

### 5. Health Endpoint Information Leakage
**Problem:** /health exposed process.memoryUsage() publicly
**Decision:** Remove memory usage from public endpoint; add /api/admin/health for detailed stats
**Consequences:** None

### 6. Sustainability Scheduler Crash
**Problem:** NULL values in external API data caused scheduler to crash and be disabled
**Decision:** Add comprehensive null guards + graceful error handling in scheduler
**Consequences:** Scheduler re-enabled with robust error handling

## Consequences
- All users must re-authenticate after deployment (password hashes upgraded)
- Frontend must include CSRF token in all mutating requests
- Security documentation updated to reflect current state
