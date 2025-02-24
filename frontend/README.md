# AOLF GSEC Frontend

This is the frontend application for the AOLF GSEC (Global Secretariat) system. It's built with React, TypeScript, and Material-UI.

## Technologies Used

- React 18
- TypeScript
- Material-UI (MUI) for UI components
- React Router for navigation
- React Query for data fetching
- React Hook Form for form handling
- Axios for API requests
- Google OAuth for authentication

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables in `.env` file:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
   REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   REACT_APP_API_BASE_URL=http://localhost:8001
   ```

3. Start the development server:
   ```
   npm start
   ```

## Available Scripts

- `npm start`: Runs the app in development mode at [http://localhost:3000](http://localhost:3000)
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production to the `build` folder
- `npm run eject`: Ejects from Create React App configuration

## Project Structure

- `src/`: Source code
  - `components/`: Reusable UI components
  - `pages/`: Application pages
  - `services/`: API services
  - `hooks/`: Custom React hooks
  - `context/`: React context providers
  - `types/`: TypeScript type definitions
  - `utils/`: Utility functions
  - `assets/`: Static assets like images and icons

## Features

- Google OAuth authentication
- Appointment management
- Dignitary management
- User profile management
- File attachments for appointments

## Connecting to the Backend

The frontend connects to the backend API using Axios. The base URL is configured in the `.env` file with the `REACT_APP_API_BASE_URL` variable.

## Deployment

To deploy the application:

1. Build the production version:
   ```
   npm run build
   ```

2. Deploy the contents of the `build` directory to your web server or hosting service.

## Browser Support

The application supports the following browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest) 