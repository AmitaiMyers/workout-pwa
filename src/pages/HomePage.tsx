import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { todayKey } from '../domain/dates';
import { formatDate, formatDurationWords, formatWeight } from '../domain/format';
import { summarizeWeek } from '../domain/stats';
import { listSchedule, listTemplates, listWorkouts } from '../storage/db';
import { useDbQuery, useExerciseCatalog } from '../storage/hooks';
import { CaloriesRing } from '../components/diet/CaloriesRing';
import { formatGrams, formatKcal } from '../domain/format';
import { totalsOf } from '../domain/nutrition/log';
import { listFoodLog } from '../storage/db';
import { useNutritionSetup } from '../storage/nutritionHooks';
import { useActiveWorkout } from '../state/ActiveWorkoutContext';
import { useWorkoutStarter } from '../state/useWorkoutStarter';

const RECENT_COUNT = 3;

export function HomePage() {
  const active = useActiveWorkout();
  const starter = useWorkoutStarter();
  const templates = useDbQuery(listTemplates, []);
  const schedule = useDbQuery(listSchedule, []);
  const workouts = useDbQuery(listWorkouts, []);
  const catalog = useExerciseCatalog();
  const today = todayKey();
  const todaysFood = useDbQuery(() => listFoodLog(today), [today]);
  const nutrition = useNutritionSetup();

  if (templates === undefined || schedule === undefined || workouts === undefined || catalog === undefined || todaysFood === undefined || nutrition === undefined || active.session === undefined) {
    return <Loading />;
  }

  const templateById = new Map(templates.map((template) => [template.id, template]));
  const todaysPlan = schedule.filter((entry) => entry.date === today && entry.workoutId === null);
  const week = summarizeWeek(workouts, new Date(), (id) => catalog.get(id).tracking);
  // One primary action per screen: today's plan wins when there is one.
  const emptyWorkoutStyle = todaysPlan.length > 0 || active.session !== null ? 'button-secondary' : 'button-primary button-large';

  return (
    <div className="page">
      <PageHeader
        title="Workout"
        actions={
          <Link to="/settings" className="icon-button" aria-label="Settings">
            ⚙
          </Link>
        }
      />

      <h2 className="group-title">This week</h2>
      <section className="stat-row stat-row-tight" aria-label="This week">
        <div className="stat">
          <span className="stat-value">{week.workoutCount}</span>
          <span className="stat-label">Workouts</span>
        </div>
        <div className="stat">
          <span className="stat-value">{week.workingSetCount}</span>
          <span className="stat-label">Sets</span>
        </div>
        <div className="stat">
          <span className="stat-value">{formatWeight(week.volumeKg)}</span>
          <span className="stat-label">Volume</span>
        </div>
      </section>

      {active.session !== null && (
        <section className="card highlight-card">
          <p className="muted small">In progress</p>
          <h2>{active.session.workout.name}</h2>
          <p className="muted small">Started {formatDurationWords((Date.now() - active.session.workout.startedAt) / 1000)} ago</p>
          <Link to="/workout" className="button button-primary button-block">
            Resume workout
          </Link>
        </section>
      )}

      {todaysPlan.length > 0 && (
        <section className="card">
          <h2>Planned for today</h2>
          <ul className="plain-list">
            {todaysPlan.map((entry) => {
              const template = templateById.get(entry.templateId);
              if (template === undefined) {
                throw new Error(`Schedule entry ${entry.id} points to a missing template`);
              }
              return (
                <li key={entry.id} className="list-row">
                  <span>{template.name}</span>
                  <button type="button" className="button button-primary" onClick={() => void starter.startFromTemplate(template, entry.id)}>
                    Start
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button type="button" className={`button button-block ${emptyWorkoutStyle}`} onClick={() => void starter.startEmpty()}>
        Start empty workout
      </button>

      <section className="card today-food">
        <Link to="/diet" className="today-food-summary" aria-label="Open today's diet">
          <CaloriesRing eatenKcal={totalsOf(todaysFood).kcal} targetKcal={nutrition.targets?.macros.kcal ?? null} size="small" />
          <span className="food-row-text">
            <strong>Today's food</strong>
            <span className="muted small">
              {formatKcal(totalsOf(todaysFood).kcal)}
              {nutrition.targets === null ? '' : ` of ${formatKcal(nutrition.targets.macros.kcal)}`}
            </span>
            <span className="muted small">
              Protein {formatGrams(totalsOf(todaysFood).protein)}
              {nutrition.targets === null ? '' : ` of ${formatGrams(nutrition.targets.macros.protein)}`}
            </span>
          </span>
        </Link>
        <Link to="/diet/add" className="button button-secondary">
          + Log food
        </Link>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Templates</h2>
          <span className="button-row">
            <Link to="/templates" className="link-button">
              Manage
            </Link>
            <Link to="/templates/new" className="link-button">
              + New
            </Link>
          </span>
        </div>
        {templates.length === 0 ? (
          <p className="muted">Save a routine like “Push Day” to start it with one tap.</p>
        ) : (
          <ul className="plain-list">
            {templates.map((template) => (
              <li key={template.id} className="list-row">
                <span>
                  {template.name}
                  <span className="muted small"> · {template.exercises.length} exercises</span>
                </span>
                <button type="button" className="button button-secondary" onClick={() => void starter.startFromTemplate(template, null)}>
                  Start
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Recent</h2>
          <Link to="/history" className="link-button">
            All
          </Link>
        </div>
        {workouts.length === 0 ? (
          <p className="muted">Finished workouts show up here.</p>
        ) : (
          <ul className="plain-list">
            {workouts.slice(0, RECENT_COUNT).map((workout) => (
              <li key={workout.id}>
                <Link to={`/history/${workout.id}`} className="list-row list-link">
                  <span>{workout.name}</span>
                  <span className="muted small">{formatDate(workout.startedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
