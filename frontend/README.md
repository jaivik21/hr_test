# AI Foloup HR Frontend v2

A modern React frontend application built with Vite, Redux Toolkit, and Chakra UI.

## 🚀 Quick Start

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run check` - Run both lint and format check

## 🛠️ Tech Stack

- **React** 18.2.0
- **Vite** 4.3.2
- **Redux Toolkit** 1.9.5
- **Chakra UI** 2.6.1
- **React Router** 6
- **Axios** 1.4.0

## 📁 Project Structure

```
src/
├── api/                # API service layer
├── assets/            # Static assets
├── components/        # Reusable components
├── config/           # App configuration
├── constants/        # Constants and enums
├── features/         # Feature modules
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── redux/            # Redux store and slices
├── routes/           # Routing configuration
├── services/         # Business logic services
├── theme/            # Chakra UI theme
└── utils/            # Utility functions
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_BASE_API_URL=http://localhost:3000
```

## 📝 Features

- ✅ Component-based architecture
- ✅ Centralized state management with Redux Toolkit
- ✅ Route-based code splitting
- ✅ Protected routes
- ✅ ESLint & Prettier configured
- ✅ Husky pre-commit hooks

## 🤝 Contributing

1. Follow ESLint and Prettier rules
2. Use conventional commit messages
3. Update documentation as needed

---

**Created**: November 12, 2025
