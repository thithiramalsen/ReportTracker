# Daily Reports System — Backend

Files added: server, models, routes, middleware. Use the `.env` file in this folder to configure environment variables:

Example `.env`:

MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
PORT=5000

Install and run:

1. cd backend
2. npm install
3. npm run dev   # requires nodemon (devDependencies)

Uploaded files are served from `/uploads` (URL: http://localhost:5000/uploads/...).

Optional S3 configuration
- To store uploaded PDFs in AWS S3 instead of local disk, set the following environment variables in `.env`:
	- AWS_S3_BUCKET=your-bucket-name
	- AWS_ACCESS_KEY_ID=...
	- AWS_SECRET_ACCESS_KEY=...
	- AWS_REGION=us-east-1

When S3 vars are present the backend will store files in S3 and return the S3 file URL. Otherwise files are saved under the local `uploads/` folder.

Notify.lk (SMS)
- To enable Notify.lk, set the following env vars in your `.env` or deployment environment:
	- `NOTIFYLK_ENABLED=true`
	- `NOTIFYLK_USER_ID`
	- `NOTIFYLK_API_KEY`
	- `NOTIFYLK_SENDER_ID` (optional; default `NotifyDEMO`)
	- `APP_BASE_URL` (recommended; used to build absolute download links)

See `NOTIFYLK_SETUP.md` for step-by-step instructions and testing examples.
