# Structure

Directory layout and organization of the codebase.

## Project Root
- `.git/`: Git repository metadata.
- `.planning/`: GSD system planning artifacts.
  - `codebase/`: Current project map.
- `frontend/`: React frontend application.
- `README.md`: Project overview and getting started guide.

## Frontend Structure
- `frontend/`
  - `public/`: Static assets (favicons, etc).
  - `src/`
    - `assets/`: Images and other static source files.
    - `pages/`: Top-level page components (`Login.jsx`, `DoctorDashboard.jsx`, etc).
    - `App.jsx`: Root application component with routing.
    - `main.jsx`: Application entry point.
    - `index.css`: Global styles (Tailwind imports).
  - `vite.config.js`: Vite build configuration.
  - `package.json`: Dependencies and scripts.

## Naming Conventions
- **Components/Pages**: PascalCase (e.g., `DoctorDashboard.jsx`).
- **Styles/Assets**: camelCase or kebab-case.
- **Utility Files**: camelCase.

[2026-04-24]
