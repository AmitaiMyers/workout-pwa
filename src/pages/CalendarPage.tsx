import { useState } from 'react';
import { Link } from 'react-router';
import { Loading, PageHeader } from '../components/PageHeader';
import { newId } from '../domain/assert';
import { dateKeyOf, monthGrid, parseDateKey, todayKey, weekdayLabels } from '../domain/dates';
import { formatDate, formatMonth } from '../domain/format';
import type { ScheduleEntry, Template, Workout } from '../domain/types';
import { deleteScheduleEntry, listSchedule, listTemplates, listWorkouts, saveScheduleEntry } from '../storage/db';
import { useDbQuery } from '../storage/hooks';
import { useWorkoutStarter } from '../state/useWorkoutStarter';

type DayStatus = 'done' | 'planned' | 'missed';

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function statusesFor(dayKey: string, today: string, workouts: readonly Workout[], entries: readonly ScheduleEntry[]): DayStatus[] {
  const statuses: DayStatus[] = [];
  if (workouts.length > 0) statuses.push('done');
  const pending = entries.filter((entry) => entry.workoutId === null);
  if (pending.length > 0) statuses.push(dayKey < today ? 'missed' : 'planned');
  return statuses;
}

export function CalendarPage() {
  const workouts = useDbQuery(listWorkouts, []);
  const schedule = useDbQuery(listSchedule, []);
  const templates = useDbQuery(listTemplates, []);
  const today = todayKey();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), index: now.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  if (workouts === undefined || schedule === undefined || templates === undefined) {
    return <Loading />;
  }

  const workoutsByDay = groupBy(workouts, (workout) => dateKeyOf(workout.startedAt));
  const scheduleByDay = groupBy(schedule, (entry) => entry.date);
  const shiftMonth = (delta: number) => {
    const date = new Date(month.year, month.index + delta, 1);
    setMonth({ year: date.getFullYear(), index: date.getMonth() });
  };
  const goToToday = () => {
    const now = new Date();
    setMonth({ year: now.getFullYear(), index: now.getMonth() });
    setSelected(today);
  };

  return (
    <div className="page">
      <PageHeader
        title="Calendar"
        actions={
          <button type="button" className="button button-ghost" onClick={goToToday}>
            Today
          </button>
        }
      />
      <div className="calendar-nav">
        <button type="button" className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <strong>{formatMonth(new Date(month.year, month.index, 1))}</strong>
        <button type="button" className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-grid" role="grid">
        {weekdayLabels().map((label, index) => (
          <span key={index} className="calendar-weekday">
            {label}
          </span>
        ))}
        {monthGrid(month.year, month.index).flat().map((day) => {
          const statuses = statusesFor(day.key, today, workoutsByDay.get(day.key) ?? [], scheduleByDay.get(day.key) ?? []);
          return (
            <button
              type="button"
              key={day.key}
              className={`calendar-day ${day.inMonth ? '' : 'calendar-day-outside'} ${day.key === today ? 'calendar-today' : ''} ${day.key === selected ? 'calendar-selected' : ''}`}
              onClick={() => setSelected(day.key)}
              aria-label={`${formatDate(parseDateKey(day.key).getTime())}${statuses.length > 0 ? `: ${statuses.join(', ')}` : ''}`}
            >
              <span>{day.dayOfMonth}</span>
              <span className="calendar-dots">
                {statuses.map((status) => (
                  <span key={status} className={`dot dot-${status}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="legend muted small">
        <span><span className="dot dot-done" /> Done</span>
        <span><span className="dot dot-planned" /> Planned</span>
        <span><span className="dot dot-missed" /> Missed</span>
      </div>
      <DayPanel
        dayKey={selected}
        today={today}
        workouts={workoutsByDay.get(selected) ?? []}
        entries={scheduleByDay.get(selected) ?? []}
        templates={templates}
      />
    </div>
  );
}

interface DayPanelProps {
  dayKey: string;
  today: string;
  workouts: readonly Workout[];
  entries: readonly ScheduleEntry[];
  templates: readonly Template[];
}

function DayPanel({ dayKey, today, workouts, entries, templates }: DayPanelProps) {
  const starter = useWorkoutStarter();
  const [templateId, setTemplateId] = useState('');
  const templateById = new Map(templates.map((template) => [template.id, template]));
  const templateOf = (entry: ScheduleEntry): Template => {
    const template = templateById.get(entry.templateId);
    if (template === undefined) {
      throw new Error(`Schedule entry ${entry.id} points to a missing template`);
    }
    return template;
  };
  const canSchedule = dayKey >= today;

  const addEntry = () => {
    void saveScheduleEntry({ id: newId(), date: dayKey, templateId, workoutId: null }).then(() => setTemplateId(''));
  };

  return (
    <section className="card">
      <h2>{formatDate(parseDateKey(dayKey).getTime())}</h2>
      {workouts.length === 0 && entries.length === 0 && <p className="muted">Nothing on this day.</p>}
      <ul className="plain-list">
        {workouts.map((workout) => (
          <li key={workout.id}>
            <Link to={`/history/${workout.id}`} className="list-row list-link">
              <span>
                <span className="dot dot-done" /> {workout.name}
              </span>
              <span className="muted small">View</span>
            </Link>
          </li>
        ))}
        {entries.map((entry) => {
          const template = templateOf(entry);
          if (entry.workoutId !== null) {
            return (
              <li key={entry.id} className="list-row">
                <span>
                  <span className="dot dot-done" /> {template.name} <span className="muted small">(completed)</span>
                </span>
              </li>
            );
          }
          return (
            <li key={entry.id} className="list-row">
              <span>
                <span className={`dot ${dayKey < today ? 'dot-missed' : 'dot-planned'}`} /> {template.name}
              </span>
              <span className="button-row">
                <button type="button" className="button button-primary" onClick={() => void starter.startFromTemplate(template, entry.id)}>
                  Start
                </button>
                <button type="button" className="icon-button" aria-label={`Remove ${template.name} from this day`} onClick={() => void deleteScheduleEntry(entry.id)}>
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {canSchedule &&
        (templates.length === 0 ? (
          <p className="muted small">
            <Link to="/templates/new">Create a template</Link> to plan workouts on the calendar.
          </p>
        ) : (
          <div className="inline-form">
            <select className="text-input" aria-label="Template to schedule" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              <option value="">Plan a workout…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button type="button" className="button button-secondary" disabled={templateId === ''} onClick={addEntry}>
              Add
            </button>
          </div>
        ))}
    </section>
  );
}
