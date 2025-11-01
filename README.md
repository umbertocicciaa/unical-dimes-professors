# UNICAL DIMES Professors - Teacher Review Platform

A modern full-stack web application for anonymous teacher and course reviews. Built with React, TypeScript, Python FastAPI, and PostgreSQL.

## Features

- 🌟 **Star Rating System**: 1-5 star ratings based on average votes
- 🔐 **Secure Authentication**: Email + password login with Argon2 hashing and JWT access tokens
- 🎓 **Teacher & Course Management**: Browse teachers and their courses
- 💬 **Mandatory Descriptions**: All reviews require detailed descriptions (minimum 10 characters)
- 📊 **Average Ratings**: Automatic calculation of average ratings
- 🐳 **Docker Support**: Complete Docker setup for local development

## Tech Stack

### Frontend

- React 18 with TypeScript
- React Router for navigation
- Axios for API communication
- Modern CSS with responsive design

### Backend

- Python 3.11
- FastAPI (modern async API framework)
- SQLAlchemy (ORM)
- PostgreSQL database
- Pydantic for data validation

### Infrastructure

- Docker & Docker Compose
- PostgreSQL 15

## Project Structure

```plain txt
unical-dimes-professors/
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   └── App.tsx        # Main app component
│   ├── Dockerfile
│   └── package.json
├── backend/               # Python FastAPI backend
│   ├── app/
│   │   ├── models.py     # Database models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── database.py   # Database configuration
│   │   └── main.py       # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
└── docker-compose.yml     # Docker orchestration
```

## Getting Started

### Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- Git

### Installation & Running

1. **Clone the repository**

   ```bash
   git clone https://github.com/umbertocicciaa/unical-dimes-professors.git
   cd unical-dimes-professors
   ```

2. **Start the application with Docker Compose**

   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL database on port 5432
   - FastAPI backend on port 8000
   - React frontend on port 3000

3. **Access the application**
   - Frontend: <http://localhost:3000>
   - Backend API: <http://localhost:8000>
   - API Documentation: <http://localhost:8000/docs>

### Local Development (without Docker)

#### Backend Setup

1. Create a virtual environment:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and security secrets:
   # AUTH_SECRET_KEY, AUTH_REFRESH_SECRET, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
   ```

4. Start PostgreSQL (using Docker):

   ```bash
   docker run -d \
     --name professors-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=professors_db \
     -p 5432:5432 \
     postgres:15
   ```

5. Apply database migrations and seed roles/users:

   ```bash
   alembic upgrade head
   python seed_data.py  # optional, creates demo data and a default admin user
   ```

6. Run the backend:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

## API Endpoints

### Authentication

- `POST /auth/register` — Self-service registration (assigns the `viewer` role)
- `POST /auth/login` — Exchange credentials for access and refresh tokens
- `POST /auth/refresh` — Rotate refresh token and issue a new access token
- `POST /auth/logout` — Revoke the active refresh token
- `GET /auth/me` — Return the authenticated user profile and roles

> **Default roles**
>
> - `admin`: full CRUD and user management  
> - `editor`: manage teachers, courses, and reviews  
> - `viewer`: read catalog data and submit reviews  
>
> The seed script provisions an initial admin account using `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`.

### Teachers

- `GET /api/teachers` — List all teachers with ratings
- `GET /api/teachers/{id}` — Get teacher details
- `POST /api/teachers` — Create a new teacher (**requires** `admin` or `editor`)
- `PUT /api/teachers/{id}` — Update a teacher (**requires** `admin` or `editor`)
- `DELETE /api/teachers/{id}` — Delete a teacher (**requires** `admin`)

### Courses

- `GET /api/courses` — List all courses
- `GET /api/courses/{id}` — Get course details
- `POST /api/courses` — Create a new course (**requires** `admin` or `editor`)
- `PUT /api/courses/{id}` — Update a course (**requires** `admin` or `editor`)
- `DELETE /api/courses/{id}` — Delete a course (**requires** `admin`)

### Reviews

- `GET /api/reviews` — List all reviews
- `GET /api/teachers/{teacher_id}/reviews` — Get reviews for a specific teacher
- `POST /api/reviews` — Create a new review (requires login; `viewer`+)
- `PUT /api/reviews/{id}` — Update a review (**requires** `admin` or `editor`)
- `DELETE /api/reviews/{id}` — Delete a review (**requires** `admin`)

## Usage Guide

### Adding a Teacher

1. Use the API to add a teacher:

   ```bash
   curl -X POST http://localhost:8000/api/teachers \
     -H "Content-Type: application/json" \
     -d '{"name": "Prof. John Doe", "department": "Computer Science"}'
   ```

### Adding a Course

1. Add a course for a teacher:

   ```bash
   curl -X POST http://localhost:8000/api/courses \
     -H "Content-Type: application/json" \
     -d '{"name": "Data Structures", "teacher_id": 1}'
   ```

### Submitting a Review

1. Open the frontend at <http://localhost:3000>
2. Click on a teacher card
3. Click "Add Review"
4. Select a course, rate (1-5 stars), and write a description (min 10 characters)
5. Submit the review

## Database Schema

### Teachers

- `id`: Primary key
- `name`: Teacher name
- `department`: Department name (optional)
- `created_at`: Timestamp

### Courses

- `id`: Primary key
- `name`: Course name
- `teacher_id`: Foreign key to teachers
- `created_at`: Timestamp

### Reviews

- `id`: Primary key
- `teacher_id`: Foreign key to teachers
- `course_id`: Foreign key to courses
- `rating`: Integer (1-5)
- `description`: Text (minimum 10 characters)
- `created_at`: Timestamp

## Development

### Running Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```

### Code Style

Backend:

```bash
cd backend
black app/
flake8 app/
```

Frontend:

```bash
cd frontend
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions, please open an issue on GitHub.
