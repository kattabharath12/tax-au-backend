# Tax Filing App - Backend

Backend API for the Auto Tax Filing Application built with Node.js, Express, and MongoDB.

## Features

- User authentication (signup/login)
- JWT-based authorization
- Tax information management
- W-9 form upload
- Dependent management
- Income and deduction tracking

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT
- **File Upload:** Multer
- **Validation:** Express Validator

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
PORT=8080
NODE_ENV=production
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Dashboard
- `GET /api/user/dashboard` - Get user dashboard data
- `PUT /api/user/tax-info` - Update tax information
- `POST /api/user/upload-w9` - Upload W-9 form
- `POST /api/user/add-dependent` - Add dependent
- `DELETE /api/user/remove-dependent/:id` - Remove dependent

## Deployment

This app is configured for Railway deployment. The `railway.toml` file contains the deployment configuration.

### Railway Deployment Steps:
1. Push code to GitHub
2. Connect Railway to your GitHub repository
3. Set environment variables in Railway dashboard
4. Deploy!

## File Structure

```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── railway.toml           # Railway deployment config
├── models/
│   └── User.js           # User model with tax info
├── routes/
│   ├── auth.js           # Authentication routes
│   └── dashboard.js      # Dashboard routes
├── middleware/
│   └── auth.js           # JWT authentication middleware
└── uploads/              # File upload directory (gitignored)
```

## License

MIT License
