# Daily Mood & Study Tracker

This project is an Advanced Databases (NoSQL) course project.
It implements a web-based system for tracking a student's daily study activity and mood.

## Project Overview

The system allows users to register, log in, create daily study entries, and view aggregated statistics.
MongoDB is used as the primary NoSQL database, and the backend exposes a RESTful API.

## System Architecture

The project follows a client–server architecture.
The frontend consists of static HTML pages.
The backend is implemented using Node.js and Express and communicates with MongoDB using Mongoose.

Data flow:
Frontend → REST API → MongoDB

## Database Design

The database contains two main collections:
- users – stores user authentication data
- entries – stores daily study and mood records

Each entry references a user by userId.
Study subjects are stored as embedded documents inside entries.

## API Overview

Main REST API endpoints:
- POST /api/users – create user
- POST /api/login – user login
- POST /api/entries – create entry (authenticated)
- GET /api/entries – get user entries
- PUT /api/entries/:id – update entry
- DELETE /api/entries/:id – delete entry
- GET /api/stats/summary – aggregation-based statistics

## Features

- JWT-based authentication and authorization
- Full CRUD operations
- Advanced MongoDB update operators
- Aggregation pipelines for statistics
- Multiple frontend pages interacting with the backend

## Environment Variables

Create a .env file in the project root with the following variables:

PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/mood_tracker
JWT_SECRET=secret_key

## How to Run

1. Install dependencies:
npm install

2. Start the server:
node server.js

3. Open in browser:
   
http://localhost:3000/index.html

http://localhost:3000/login.html

http://localhost:3000/entries.html

http://localhost:3000/stats.html

## Contribution

This project was completed individually by one student.


