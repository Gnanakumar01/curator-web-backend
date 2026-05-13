## Curator Backend

Backend API for the Curator Platform built using Node.js, Express, and MongoDB.
This service manages users, stores, categories, requirements, and responses (quotations) for the Curator system.

The backend provides REST APIs used by the Curator frontend application.

## Tech Stack

- Node.js (>=18.0.0)
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Socket.IO
- Cloudinary
- Firebase Admin

## Project Structure
curator-backend/
├── config/
│   ├── db.js
│   ├── cloudinary.js
│   └── firebase.js
├── controllers/
│   ├── authController.js
│   ├── storeController.js
│   └── requirementController.js
├── models/
│   ├── User.js
│   ├── Store.js
│   ├── Requirement.js
│   └── Response.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── storeRoutes.js
│   ├── requirementRoutes.js
│   ├── responseRoutes.js
│   ├── notificationRoutes.js
│   ├── locationRoutes.js
│   └── uploadRoutes.js
├── utils/
│   └── geocoding.js
├── .env.example
├── server.js
└── package.json

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/curator

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret_here

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase (optional - can use environment variable instead)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## Installation

```bash
# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your configuration
```

## Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/google-login` - Google OAuth login
- `POST /api/auth/login` - Email login
- `POST /api/auth/register` - User registration

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/create` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Stores
- `GET /api/stores` - Get all stores (supports lat/lng/radius query params)
- `GET /api/stores/:id` - Get store by ID
- `GET /api/stores/owner/:ownerId` - Get stores by owner
- `POST /api/stores` - Create store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store

### Requirements
- `GET /api/requirements` - Get all requirements
- `GET /api/requirements/:id` - Get requirement by ID
- `POST /api/requirements/create` - Create requirement
- `PUT /api/requirements/:id` - Update requirement
- `DELETE /api/requirements/:id` - Delete requirement

### Responses/Quotations
- `GET /api/responses` - Get all responses
- `GET /api/responses/:id` - Get response by ID
- `GET /api/responses/requirement/:requirementId` - Get responses by requirement
- `POST /api/responses/create` - Create response
- `PUT /api/responses/:id` - Update response
- `DELETE /api/responses/:id` - Delete response

### Upload
- `POST /api/upload` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files

## Production Deployment

For older servers, the following optimizations are included:
- Memory-efficient file uploads with 10MB limit
- Connection pooling for MongoDB
- Rate limiting on upload endpoints
- Graceful error handling
- Proper cleanup of resources
