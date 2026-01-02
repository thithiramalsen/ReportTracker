Notify.lk Integration Guide
==========================

This document explains how to connect your ReportTracker app to Notify.lk and how to test SMS sending.

1) Create / configure your Notify.lk account
- Sign up at https://app.notify.lk and log in.
- From the dashboard, open "Settings" -> "API" or "Developer" to find your `user_id` and `api_key`.
- For testing you can use the provided demo sender `NotifyDEMO`. For production you must request and register an approved `sender_id` (your organization or app name).

2) Required credentials (environment variables)
- `NOTIFYLK_ENABLED=true`  # enables the integration
- `NOTIFYLK_USER_ID=...`   # copy from your Notify.lk account
- `NOTIFYLK_API_KEY=...`   # copy from your Notify.lk account
- `NOTIFYLK_SENDER_ID=YourSender` (optional; default `NotifyDEMO`)
- `APP_BASE_URL=https://your.app` (recommended; used to build absolute download links in SMS)

3) Phone number format
- Notify.lk expects Sri Lankan numbers in the form `9471XXXXXXX` (country code + local number, no leading `+`).
- The helper provided will normalize common inputs: `077xxxxxxxx` -> `9477xxxxxxxx`, remove `+` and non-digits.

4) Test sending from a browser (quick)
Replace the placeholders and visit in your browser (GET request):

```
https://app.notify.lk/api/v1/send?user_id=YOUR_USER_ID&api_key=YOUR_API_KEY&sender_id=NotifyDEMO&to=9471XXXXXXX&message=Test
```

5) Test sending using the repo helper
- Install dependencies (if you change / add any): from `backend/` run `npm install`.
- Run the test script (replace the number):

```powershell
cd backend
node scripts/sendNotifyTest.js 9471XXXXXXX
```

6) How the app uses Notify.lk
- When an admin uploads a report and assigns users, the backend calls `utils/notifylk.notifyReportUpload()` which sends each assigned user an SMS containing a short message and an absolute download URL (uses `APP_BASE_URL` if set).

7) Production notes
- Request an approved `sender_id` from Notify.lk to avoid using the demo sender for production messages.
- Keep `NOTIFYLK_API_KEY` secret. Store in your deployment's environment variables (not in source control).
- Monitor delivery and balance using the `status` endpoint:

```
https://app.notify.lk/api/v1/status?user_id=YOUR_USER_ID&api_key=YOUR_API_KEY
```

8) Troubleshooting
- If messages do not arrive:
  - Verify phone formatting (`9471...`).
  - Check account balance via the `status` endpoint.
  - If using `NotifyDEMO`, some content types (OTP) may be blocked.

9) Contact/Support
- Use Notify.lk support/docs for sender registration and account-specific questions.
