import { HashRouter, Link, Route, Routes, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { ActiveWorkoutProvider, useActiveWorkout } from './state/ActiveWorkoutContext';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { CalendarPage } from './pages/CalendarPage';
import { CustomExercisePage } from './pages/CustomExercisePage';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { TemplateEditPage } from './pages/TemplateEditPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { WorkoutDetailPage } from './pages/WorkoutDetailPage';
import { WorkoutEditPage } from './pages/WorkoutEditPage';

/** Shortcut back to the running workout from any other screen. */
function ActiveWorkoutBanner() {
  const { session } = useActiveWorkout();
  const location = useLocation();
  if (!session || location.pathname === '/workout') {
    return null;
  }
  return (
    <Link to="/workout" className="active-banner">
      <span className="pulse" aria-hidden="true" />
      {session.workout.name} in progress — tap to resume
    </Link>
  );
}

/** The live workout screen is a focused mode: no tab bar to tap by accident mid-set. */
function Shell() {
  const location = useLocation();
  const focused = location.pathname === '/workout';
  return (
    <div className={`app-shell ${focused ? 'app-shell-focused' : ''}`}>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workout" element={<ActiveWorkoutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<WorkoutDetailPage />} />
            <Route path="/history/:id/edit" element={<WorkoutEditPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercises/new" element={<CustomExercisePage />} />
            <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
            <Route path="/exercises/:id/edit" element={<CustomExercisePage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/templates/:id" element={<TemplateEditPage />} />
            <Route path="*" element={<p className="empty">Page not found.</p>} />
          </Routes>
        </main>
        <ActiveWorkoutBanner />
        {!focused && <BottomNav />}
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <ActiveWorkoutProvider>
        <Shell />
      </ActiveWorkoutProvider>
    </HashRouter>
  );
}
