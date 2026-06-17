# Clinic Booking Website (Static S3 Mode)

This folder contains the frontend for an S3 static website demo.

- `index.html`: booking page
- `admin.html`: admin management page
- `style.css`: UI styles
- `app.js`: static booking/admin logic with S3 JSON load
- `appointments.json`: public S3 data object

## Final app behavior

- Deployment mode: static website only, no backend required
- Authentication: one hardcoded admin account
  - Email: `admin@clinic.demo`
  - Password: `admin123`
- Booking: admin enters patient name and selects an available slot
- Time slots: 30-minute intervals from `09:00` to `17:00`
- Conflict prevention: the UI blocks already-booked slots
- Appointment actions: cancel, delete, or reschedule from `admin.html`
- Data storage: loaded from public `appointments.json` on S3
- Persistence: browser changes are simulated locally; to save data permanently, manually re-upload `appointments.json` to S3

## Static S3 deployment (recommended for demo)

### 1) Create or open a bucket

1. AWS Console -> S3 -> Create bucket (or open an existing bucket)
2. Choose a unique bucket name
3. Choose a region

### 2) Upload website files and data

Upload these objects to the bucket root:

- `index.html`
- `admin.html`
- `style.css`
- `app.js`
- `appointments.json`

### 3) Enable static website hosting

Bucket -> Properties -> Static website hosting:

- Enable
- Index document: `index.html`
- Error document: `index.html`

### 4) Make objects public for demo

Bucket -> Permissions -> Bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### 5) Use the static website endpoint

Open the endpoint shown in bucket properties, for example:

```
https://YOUR_BUCKET_NAME.s3-website-us-west-2.amazonaws.com/
```

### 6) Replace the S3 data URL in `app.js`

Edit `APPOINTMENTS_DATA_URL` in `app.js` to point to:

```
https://YOUR_BUCKET_NAME.s3-website-us-west-2.amazonaws.com/appointments.json
```

## Notes for demo

- The app loads `appointments.json` from S3
- Browser changes are stored in memory during your session
- To save changes permanently, manually upload the updated `appointments.json` file to your S3 bucket using the AWS Console
