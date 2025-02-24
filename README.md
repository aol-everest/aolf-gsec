# AOLF GSEC (Global Secretariat) System

This is the main repository for the Art of Living Foundation Global Secretariat (GSEC) system. The application manages appointments, dignitaries, and related information for the AOLF Global Secretariat.

## Project Overview

The AOLF GSEC system is a full-stack web application with the following components:

- **Frontend**: React application with TypeScript and Material-UI
- **Backend**: FastAPI application with Python and PostgreSQL
- **Authentication**: Google OAuth for user authentication

## Repository Structure

- `frontend/`: React frontend application
- `backend/`: FastAPI backend application
- `secrets/`: Configuration files and secrets (not committed to version control)
- `frontend-theme-demo/`: UI theme demonstration

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.12+)
- PostgreSQL (v14+)
- Git

### Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/your-username/aolf-gsec.git
   cd aolf-gsec
   ```

2. Set up the backend:
   ```
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Unix/macOS
   .venv\Scripts\activate     # On Windows
   pip install -r requirements.txt
   cp .env.example .env  # Then edit .env with your configuration
   alembic upgrade head
   ```

3. Set up the frontend:
   ```
   cd ../frontend
   npm install
   cp .env.example .env  # Then edit .env with your configuration
   ```

4. Start the backend server:
   ```
   cd ../backend
   uvicorn app:app --reload
   ```

5. Start the frontend development server:
   ```
   cd ../frontend
   npm start
   ```

6. Access the application at [http://localhost:3000](http://localhost:3000)

## Features

- User authentication with Google OAuth
- Appointment management
- Dignitary management
- File attachments for appointments
- User role-based access control
- Email notifications

## Development

### Backend Development

See the [backend README](backend/README.md) for detailed information on backend development.

### Frontend Development

See the [frontend README](frontend/README.md) for detailed information on frontend development.

## Deployment

### Backend Deployment

The backend can be deployed using Docker or directly on a server with Python and PostgreSQL installed.

### Frontend Deployment

The frontend can be deployed to any static hosting service like Netlify, Vercel, or AWS S3.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Contact

For questions or support, please contact the AOLF Tech Team. 