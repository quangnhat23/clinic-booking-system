# Static Clinic Website (S3)

This folder contains the static clinic booking site:

- `index.html` - booking form
- `admin.html` - view and delete bookings
- `assets/style.css` - styles
- `assets/app.js` - localStorage logic

## Data behavior

- No backend is used.
- Appointments are saved in browser `localStorage`.
- Data persists after browser close on the same browser/device.
- Data is not shared across different devices or browsers.

## S3 deployment guide (console-first)

### 1) Create bucket

1. AWS Console -> S3 -> Create bucket
2. Bucket name: `clinicdeployment` (or your own unique name)
3. Choose region
4. For public website hosting, disable "Block all public access" for this bucket
5. Create bucket

### 2) Upload website files

Inside bucket `clinicdeployment` -> Objects -> Upload:

- Upload files: `index.html`, `admin.html`
- Upload folder: `assets/`

After upload, bucket root should contain:

- `index.html`
- `admin.html`
- `assets/` with `style.css` and `app.js`

### 3) Enable static website hosting

Bucket -> Properties -> Static website hosting:

- Enable
- Index document: `index.html`
- Error document: `index.html`

### 4) Allow public read (if public website is required)

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

If policy validation fails with `access-analyzer:ValidatePolicy`, this can happen in lab roles. Use save/apply anyway if available.

### 5) Open the website

Use the S3 static website endpoint shown in Properties.

For `us-east-1`:

```text
http://clinicdeployment.s3-website-us-east-1.amazonaws.com
```

## Optional CLI deployment

From project root:

```powershell
aws s3 sync .\website s3://clinicdeployment --delete
```

## Troubleshooting

- `403 AccessDenied`: bucket is still private or bucket policy/public access settings are blocking read.
- `404 NoSuchKey (index.html)`: `index.html` is missing at bucket root or uploaded to wrong path.
- Styles/scripts missing: ensure `assets/` exists in bucket root and includes `style.css` and `app.js`.
