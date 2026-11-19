# Changelog

All notable changes, newest first. Dates are when the change landed.

## 2026-11-19

### Added
- Browser-only demo on GitHub Pages: the real frontend talking to an in-browser API (MSW) with labelled sample data, and a bar to switch between resident, staff and warden.
- Screenshots of every role, on desktop and at phone width.
- Tests for the demo API, the frontend helpers, JWT handling, invite codes and the entity column mappings.
- Issue and PR templates, Dependabot, EditorConfig, and a CI step that builds the demo.

### Fixed
- The backend refused to start against a fresh database: `email` (CITEXT) and `token_hash` (CHAR(64)) didn't match the entity mappings, so schema validation failed.
- CSV export now downloads with `fetch`, so a failed export shows a toast instead of an error page.
- Backend tests no longer print the JDK's Mockito self-attach warning.

### Changed
- The frontend dev server runs on port 3000, and its `/api` proxy follows the backend's `PORT`.

## 2026-11-16

### Added
- First complete version: hostel setup with invite codes, 30-second ticket reporting with photos and visit slots, auto-routing, the ticket state machine with an audit trail, idempotent SLA escalation, in-app notifications and the warden dashboard with CSV export.
