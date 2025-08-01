# Resume Forge Frontend

A modern React frontend built with Vite, TypeScript, and Material UI with dark theme.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### Installation

1. **Navigate to the frontend directory:**
```bash
cd resume-forge-frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🛠️ Built With

- **React 18.3.1** - UI Library
- **TypeScript** - Type safety
- **Vite** - Fast build tool & dev server
- **Material UI 6** - Component library with dark theme
- **React Hot Toast** - Beautiful notifications
- **Axios** - HTTP client for API calls
- **React Router DOM** - Client-side routing

## 📁 Project Structure

```
resume-forge-frontend/
├── src/
│   ├── components/
│   │   └── HomePage.tsx          # Main landing page
│   ├── theme/
│   │   └── theme.ts             # Material UI dark theme
│   ├── App.tsx                  # Main app component
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── package.json               # Dependencies
└── vite.config.ts            # Vite configuration
```

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