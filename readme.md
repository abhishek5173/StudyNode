************\*\*\*************Backend Setup & Structure (Implementation Plan)********************\*\*\*********************

1. npm init -y
2. npm install express mongoose jsonwebtoken bcryptjs cors dotenv
3. Folder Structure
4. setup .env

*************************Files Uses***************************

A. app.js

This file will:
-Initialize express
-Load middleware (JSON, CORS)
-Load routes (/api/auth, /api/documents)
-Connect global error handler

B. server.js

This file is the entrypoint.
It will:
-Import app.js
-Start HTTP server
-Later: attach Socket.io to HTTP server
-Listen on PORT
-This separation allows Socket.io to be added cleanly in Step 4.

C. config/db.js

This file will:
-Use mongoose.connect()
-Log DB connection success
-Handle DB connection errors

D. models/User.js

User fields:
-name
-email
-passwordHash
-timestamps
-User pre-save hooks & methods:
-Hash password
-Compare password

E. models/Document.js

Document fields:
-title
-content (Quill Delta JSON)
-owner (userId)
-collaborators: []
-timestamps

Indexes:
-owner + updatedAt

F. controllers/auth.controller.js

Contains 2 functions:
  -register
  -Check if email exists
  -Hash password
  -Save user
  -Return JWT
-LOGIN
  -Verify user email
  -Compare password
  -Return JWT

G. controllers/document.controller.js

Functions:
-createDocument
-getDocuments (user documents)
-getDocumentById
-updateDocument (title or content)
-deleteDocument
-None of these handle real-time — only database state.

H. routes/auth.routes.js
Routes:
-POST /register
-POST /login

I. routes/document.routes.js
Routes:
-Protected routes
-Apply auth middleware

Handle:
-POST /
-GET /
-GET /:id
-PUT /:id
-DELETE /:id

J. middleware/auth.middleware.js
This will:
-Read Authorization: Bearer <token>
-Verify token
-Attach user info
-Throw 401 if invalid

K. middleware/error.middleware.js
This will:
-Catch thrown errors
-Return uniform JSON:

L. utils/generateToken.js
Function:
-Takes userId
-Returns signed JWT token

M. services/document.service.js (optional but clean)
Handles:
-Business logic
-Fetching documents
-Checking permissions
-Updating content

Cleaner controllers → better structure.

***********************End****************************************************************

*****************************Code*********************************

1. App.Js
2. Server.js
3. config/db.js
4. models/User.js
5. models/Document.js
6. utils/generateToken.js
7. middleware/auth.middleware.js
8. 