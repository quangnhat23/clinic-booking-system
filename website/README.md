# Clinic Booking Website (Static S3 Mode)

This folder contains the final frontend used for submission:

- `index.html`: admin login + create appointment
- `admin.html`: manage all appointments (cancel/reschedule)
- `assets/style.css`: UI styles
- `assets/app.js`: auth, slot logic, localStorage, and appointment actions

## Final app behavior

- Deployment mode: static website only (no runtime backend required)
- Authentication: one hardcoded admin account
  - Email: `admin@clinic.demo`
  - Password: `admin123`
- Booking: admin types patient name and books a time slot
- Time slots: 30-minute intervals from `09:00` to `17:00`
- Conflict prevention: booked date/time slots are unavailable for new bookings
- Appointment actions: cancel and reschedule from `admin.html`
- Data storage: browser `localStorage` key `clinic_appointments_v1`

## S3 deployment (console-only)

### 1) Create or open bucket

1. AWS Console -> S3 -> Create bucket (or open existing bucket)
2. Recommended name: `clinicdeployment` (or unique equivalent)
3. Choose region

### 2) Upload website files

Upload these from this folder:

- `index.html`
- `admin.html`
- `assets/` (folder)

Bucket root must contain:

- `index.html`
- `admin.html`
- `assets/style.css`
- `assets/app.js`

### 3) Enable static website hosting

Bucket -> Properties -> Static website hosting:

- Enable
- Index document: `index.html`
- Error document: `index.html`

### 4) Public read policy (if required)

Bucket -> Permissions -> Bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadForWebsite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::clinicdeployment/*"
    }
  ]
}
```

In Learner Lab, policy edits may be restricted by role guardrails.

### 5) Open website

Use the S3 static website endpoint shown in bucket properties, for example:

```text
http://clinicdeployment.s3-website-us-east-1.amazonaws.com/
```

## IAM note for Learner Lab

- No separate IAM user is required for this project.
- Use the temporary Learner Lab role/session in AWS Console.
- If policy changes fail with a generic error, this is often a lab permission limitation.

## Troubleshooting

- `403 AccessDenied`: bucket policy/public access block is preventing object read.
- `404 NoSuchKey`: files uploaded to wrong path; `index.html` must be at bucket root.
- Missing styles/scripts: verify `assets/` exists in bucket root with `style.css` and `app.js`.
- Data not shared across devices: expected; `localStorage` is browser/device specific.
