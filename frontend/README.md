# Resume Forge Frontend

A modern React frontend built with Vite, TypeScript, and Material UI with dark theme.

## Quick Start

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

The frontend can be deployed using the included deploy script:

```bash
./deploy.sh
```

This will:
- Build the application
- Start it with PM2 on port 3006
- Make it available at `https://resumeforge.thatinsaneguy.com/`

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── utils/          # Utility functions
│   └── main.tsx        # Application entry point
├── public/             # Static assets
├── dist/               # Built files (generated)
└── package.json        # Dependencies and scripts
```

## 🛠️ Built With

- **React 18.3.1** - UI Library
- **TypeScript** - Type safety
- **Vite** - Fast build tool & dev server
- **Material UI 6** - Component library with dark theme
- **React Hot Toast** - Beautiful notifications
- **Axios** - HTTP client for API calls
- **React Router DOM** - Client-side routing

## 🎨 Features

- **Dark Theme** - Modern dark UI with custom Material UI theme
- **Responsive Design** - Works on desktop, tablet, and mobile
- **TypeScript** - Full type safety throughout the app
- **Hot Reload** - Instant updates during development
- **Toast Notifications** - Beautiful user feedback
- **Material Icons** - Comprehensive icon library

## 🎯 Current Pages

- **HomePage** - Landing page with Resume Forge branding and feature showcase

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 API Integration

The frontend is ready to connect to the Resume Forge API:
- Base API URL: `http://localhost:8000`
- Axios configured for HTTP requests
- Toast notifications for user feedback

## 🎨 Theme Customization

The app uses a custom Material UI dark theme located in `src/theme/theme.ts`:
- Primary: Indigo (#6366f1)
- Secondary: Cyan (#06b6d4)
- Background: Slate-900 (#0f172a)
- Surface: Slate-800 (#1e293b)

## 📱 Responsive Breakpoints

- xs: 0px+
- sm: 600px+
- md: 900px+
- lg: 1200px+
- xl: 1536px+

## 🚀 Next Steps

- Add resume upload functionality
- Implement job description input
- Connect to backend API
- Add authentication
- Create resume editor interface
- Add PDF preview/download