## Curator Backend

Backend API for the Curator Platform built using Node.js, Express, and MongoDB.
This service manages users, stores, categories, requirements, and responses (quotations) for the Curator system.

The backend provides REST APIs used by the Curator frontend application.

## Tech Stack

Node.js

Express.js

MongoDB

Mongoose

JWT Authentication

CORS

dotenv

## Project Structure
curator-backend
│
├── config
│ └── db.js

├── controllers
│ ├── authControllers.js
│ ├── requirementControllers.js
│ └── storeController.js

├── models
│ ├── User.js
│ ├── Store.js
│ ├── Category.js
│ ├── Requirement.js
│ └── Response.js

├── routes
│ ├── authRoutes.js
│ ├── userRoutes.js
│ ├── storeRoutes.js
│ ├── categoryRoutes.js
│ ├── requirementRoutes.js
│ └── responseRoutes.js

├── .env
├── server.js
└── package.json
