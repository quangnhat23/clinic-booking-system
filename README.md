# Clinic Booking System

This repository contains a clinic appointment booking web app prepared for CS 623 final submission.

## Final submission mode

- Static website deployment on AWS S3
- No runtime backend required in final mode
- One hardcoded admin account for demo login
  - `admin@clinic.demo`
  - `admin123`

## Project structure

- `website/`
  - `index.html`: login + booking form
  - `admin.html`: appointment management
  - `assets/style.css`: styling
  - `assets/app.js`: app logic
- `docs/`
  - `PROJECT_DOCUMENTATION.md`
  - `INSTALLATION_EXECUTION_GUIDE.md`
  - `SERVICE_RELATIONSHIP.md`
  - `TEAM_INFO_TEMPLATE.txt`
- `server/`
  - Legacy API prototype from earlier iteration (not required for final static mode)

## How to run

See:

- `website/README.md`
- `docs/INSTALLATION_EXECUTION_GUIDE.md`

## Notes

- Appointments are saved in browser `localStorage`.
- Data is per browser/device and not shared globally.
