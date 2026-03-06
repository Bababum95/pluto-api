# Pluto API — Changelog

Backend API for the **Pluto** application built with NestJS.

This document contains all notable changes to the project.
The format follows Conventional Commits. Versions are listed in reverse chronological order.

---

## 06.03.2026 — v0.0.6

### ✨ Features

- implement category reordering functionality
- update currency module to support ESM dynamic imports
- add transaction date handling in transaction module
- add fee structure to transfer module

### ♻️ Refactoring

- remove URL logging from bootstrap function

### 🧹 Chore

- remove unused migration script command from package.json

---

## 23.02.2026 — v0.0.5

### ✨ Features

- add fee structure to transfer module
- enhance RateController and RateService to include RateDto
- update tag DTO and schema for name length and default values
- add account-to-account transfer module
- integrate TagModule and update transaction handling
- ensure fresh rates on health check
- add Codecov integration for coverage reporting
- implement currency change restriction for accounts with transactions
- add reorder functionality for accounts

### ♻️ Refactoring

- update rate TTL handling to support environment variable
- remove ensureFreshRates call from health check
- update module imports for SettingsModule in transaction module
- simplify account creation and update tests
- remove name conflict check in account update process
- remove unique constraint on account names per user

### 📚 Documentation

- update Codecov badge in README for Pluto API
- update README for Pluto API with project details and setup instructions

### 🧹 Chore

- update CI workflow to include linting and build steps
- update CI workflow to use pnpm action setup

---

## 18.02.2026 — v0.0.4

### ✨ Features

- add optional description field to account DTO and schema

---

## 18.02.2026 — v0.0.3

### ✨ Features

- enhance account and transaction balance representation
- improve transaction filtering and response structure
- enhance transaction handling with settings and rate services
- enhance transaction creation to include account and summary details
- update health check test and include TransactionModule in AppModule
- update rates TTL to 12 hours
- add update rates script to package.json
- add public access to health check endpoint in AppController
- add transaction type to category management
- enhance account management with summary responses
- add excluded property to account management
- enhance account creation with currency population
- enhance account management with summary and decimal support
- add order property to account management
- enhance AccountService and CurrencyController with currency handling
- enhance CurrencyModule with DTOs and service methods
- add CategoryModule to application
- add production start script and update cookie path in auth controller
- enhance application with internationalization and authentication features

### 🐛 Fixes

- update SameSite attribute for cookies in auth controller and service

### ♻️ Refactoring

- simplify AuthResponseDto property declarations
- update authentication flow to use Bearer tokens instead of cookies

### 🧹 Chore

- update version and add patch script in package.json
- update health check endpoint in AppController and AppService
- update package.json scripts for development

---

## 18.02.2026 — v0.0.2

### ✨ Features

- integrate RateModule and enhance CurrencyModule with API client
- add currency management

### 🧹 Chore

- update configuration files and package details

---

## 25.01.2026 — v0.0.1

### ✨ Features

- initialize NestJS application with currency management
