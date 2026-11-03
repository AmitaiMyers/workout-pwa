import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { NumberInput } from '../components/NumberInput';
import { Loading, PageHeader } from '../components/PageHeader';
import { todayKey } from '../domain/dates';
import { formatGrams, formatKcal } from '../domain/format';
import type { ActivityLevel, Goal, Profile, Sex, TargetOverrides } from '../domain/nutrition/foodTypes';
import { ACTIVITY_LABELS, dailyTargets, GOAL_LABELS } from '../domain/nutrition/targets';
import { exportBackup, restoreBackup, saveProfile, saveWeight, validateBackup } from '../storage/db';
import { useNutritionSetup } from '../storage/nutritionHooks';
import { deliverFile, importErrorMessage, jsonFile, readJsonFile } from '../state/files';

const LOSE_PACES = [0.25, 0.5, 0.75, 1] as const;
const GAIN_PACES = [0.25, 0.5] as const;
const DEFAULT_PACE = 0.5;

interface Draft {
  sex: Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: ActivityLevel;
  goal: Goal;
  paceKgPerWeek: number;
  overrides: TargetOverrides;
}

function draftFrom(profile: Profile | null, weightKg: number | null, today: Date): Draft {
  if (profile === null) {
    return { sex: 'male', age: null, heightCm: null, weightKg, activity: 'moderate', goal: 'maintain', paceKgPerWeek: DEFAULT_PACE, overrides: { kcal: null, protein: null, carbs: null, fat: null } };
  }
  return {
    sex: profile.sex,
    age: today.getFullYear() - profile.birthYear,
    heightCm: profile.heightCm,
    weightKg,
    activity: profile.activity,
    goal: profile.goal,
    paceKgPerWeek: profile.paceKgPerWeek,
    overrides: profile.overrides,
  };
}

function profileFrom(draft: Draft, today: Date): Profile | null {
  if (draft.age === null || draft.heightCm === null || draft.age < 14 || draft.age > 100 || draft.heightCm < 100 || draft.heightCm > 250) {
    return null;
  }
  return {
    sex: draft.sex,
    birthYear: today.getFullYear() - draft.age,
    heightCm: draft.heightCm,
    activity: draft.activity,
    goal: draft.goal,
    paceKgPerWeek: draft.paceKgPerWeek,
    overrides: draft.overrides,
  };
}

function ProfileSection() {
  const setup = useNutritionSetup();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const today = new Date();

  useEffect(() => {
    if (setup !== undefined && draft === null) {
      setDraft(draftFrom(setup.profile, setup.currentWeightKg, new Date()));
    }
  }, [setup, draft]);

  if (setup === undefined || draft === null) {
    return <Loading />;
  }
  const update = (changes: Partial<Draft>) => {
    setSaved(false);
    setDraft({ ...draft, ...changes });
  };
  const profile = profileFrom(draft, today);
  const weightValid = draft.weightKg !== null && draft.weightKg >= 30 && draft.weightKg <= 300;
  const preview = profile !== null && weightValid && draft.weightKg !== null ? dailyTargets(profile, draft.weightKg, today) : null;
  const auto = profile !== null && weightValid && draft.weightKg !== null ? dailyTargets({ ...profile, overrides: { kcal: null, protein: null, carbs: null, fat: null } }, draft.weightKg, today).macros : null;
  const paces = draft.goal === 'gain' ? GAIN_PACES : LOSE_PACES;

  const save = async () => {
    if (profile === null || draft.weightKg === null) return;
    await saveProfile(profile);
    if (draft.weightKg !== setup.currentWeightKg) {
      await saveWeight({ date: todayKey(), weightKg: draft.weightKg });
    }
    setSaved(true);
  };

  const override = (key: keyof TargetOverrides, label: string, format: (value: number) => string) => (
    <label className="field">
      <span>{label}</span>
      <NumberInput
        value={draft.overrides[key]}
        onChange={(value) => update({ overrides: { ...draft.overrides, [key]: value } })}
        allowDecimals={false}
        label={`${label} override`}
        // The muted placeholder shows the automatic value; typing a number overrides it.
        placeholder={auto === null ? 'auto' : format(auto[key])}
      />
    </label>
  );

  return (
    <section className="card">
      <h2>Profile & daily targets</h2>
      <div className="segmented" role="tablist" aria-label="Sex (for the calorie formula)">
        {(['male', 'female'] as const).map((sex) => (
          <button type="button" role="tab" key={sex} aria-selected={draft.sex === sex} className={draft.sex === sex ? 'segmented-active' : ''} onClick={() => update({ sex })}>
            {sex === 'male' ? 'Male' : 'Female'}
          </button>
        ))}
      </div>
      <div className="macro-inputs">
        <label className="field">
          <span>Age</span>
          <NumberInput value={draft.age} onChange={(age) => update({ age })} allowDecimals={false} label="Age" />
        </label>
        <label className="field">
          <span>Height (cm)</span>
          <NumberInput value={draft.heightCm} onChange={(heightCm) => update({ heightCm })} allowDecimals label="Height in cm" />
        </label>
        <label className="field">
          <span>Weight (kg)</span>
          <NumberInput value={draft.weightKg} onChange={(weightKg) => update({ weightKg })} allowDecimals label="Weight in kg" />
        </label>
      </div>
      <label className="field">
        <span>Activity level</span>
        <select className="text-input" value={draft.activity} onChange={(event) => update({ activity: event.target.value as ActivityLevel })}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
            <option key={level} value={level}>
              {ACTIVITY_LABELS[level]}
            </option>
          ))}
        </select>
      </label>
      <div className="segmented" role="tablist" aria-label="Goal">
        {(Object.keys(GOAL_LABELS) as Goal[]).map((goal) => (
          <button
            type="button"
            role="tab"
            key={goal}
            aria-selected={draft.goal === goal}
            className={draft.goal === goal ? 'segmented-active' : ''}
            onClick={() => update({ goal, paceKgPerWeek: goal === 'gain' ? Math.min(draft.paceKgPerWeek, 0.5) : draft.paceKgPerWeek })}
          >
            {GOAL_LABELS[goal]}
          </button>
        ))}
      </div>
      {draft.goal !== 'maintain' && (
        <div className="field">
          <span>Pace per week</span>
          <div className="chip-row wrap-chips" role="radiogroup" aria-label="Pace per week">
            {paces.map((pace) => (
              <button type="button" key={pace} role="radio" aria-checked={draft.paceKgPerWeek === pace} className={`chip ${draft.paceKgPerWeek === pace ? 'chip-active' : ''}`} onClick={() => update({ paceKgPerWeek: pace })}>
                {draft.goal === 'lose' ? '−' : '+'}
                {pace} kg
              </button>
            ))}
          </div>
        </div>
      )}

      <h3 className="group-title">Targets (leave blank for automatic)</h3>
      <div className="macro-inputs macro-inputs-4">
        {override('kcal', 'kcal', (value) => String(value))}
        {override('protein', 'Protein g', (value) => String(value))}
        {override('carbs', 'Carbs g', (value) => String(value))}
        {override('fat', 'Fat g', (value) => String(value))}
      </div>

      {preview === null ? (
        <p className="muted small">Fill in age (14–100), height (100–250 cm) and weight (30–300 kg) to see your targets.</p>
      ) : (
        <div className="target-preview">
          <strong>{formatKcal(preview.macros.kcal)} / day</strong>
          <span className="muted small">
            Protein {formatGrams(preview.macros.protein)} · Carbs {formatGrams(preview.macros.carbs)} · Fat {formatGrams(preview.macros.fat)}
          </span>
          <span className="muted small">Maintenance ≈ {formatKcal(preview.maintenanceKcal)} (Mifflin-St Jeor × activity).</span>
          {preview.floorApplied && <span className="field-error">That pace would go below a safe minimum, so the target is held at {formatKcal(preview.macros.kcal)}.</span>}
        </div>
      )}
      <button type="button" className="button button-primary button-block" disabled={preview === null} onClick={() => void save()}>
        {saved ? 'Saved ✓' : 'Save profile'}
      </button>
      <p className="muted small">Protein defaults to 2 g per kg of body weight and fat to 25% of calories; carbs fill the rest. These are general estimates, not medical advice.</p>
    </section>
  );
}

function backupFileName(): string {
  return `workout-log-backup-${todayKey()}.json`;
}

function BackupSection() {
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const exportAll = async () => {
    const backup = await exportBackup();
    const file = jsonFile(backup, backupFileName());
    await deliverFile(file, 'Workout Log backup');
    setMessage({ kind: 'info', text: `Backup created (${Math.ceil(file.size / 1024)} KB). Keep it somewhere safe, like iCloud Drive or Google Drive.` });
  };

  const importFile = (file: File) => {
    // A user-picked file may be anything: parsing and validation failures become a visible message.
    void readJsonFile(file)
      .then(validateBackup)
      .then(
        async (backup) => {
          const when = new Date(backup.exportedAt).toLocaleString();
          if (!window.confirm(`Replace ALL data on this phone with the backup from ${when}? This cannot be undone.`)) return;
          await restoreBackup(backup);
          // Reload so every screen (and the in-progress workout) re-reads the restored data.
          window.location.reload();
        },
        (reason: unknown) => setMessage({ kind: 'error', text: importErrorMessage(reason, 'This file is not a Workout Log backup.') }),
      );
  };

  return (
    <section className="card">
      <h2>Backup</h2>
      <p className="muted small">Your data only lives on this phone. Export a backup file to keep it safe or move it to a new phone.</p>
      <div className="button-row wrap">
        <button type="button" className="button button-secondary" onClick={() => void exportAll()}>
          Export backup
        </button>
        <label className="button button-ghost">
          Import backup…
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file !== undefined) importFile(file);
            }}
          />
        </label>
      </div>
      {message !== null && <p className={message.kind === 'error' ? 'field-error' : 'muted small'}>{message.text}</p>}
    </section>
  );
}

export function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" back />
      <ProfileSection />
      <Link to="/diet/weight" className="button button-secondary button-block">
        ⚖ Body weight log
      </Link>
      <BackupSection />
    </div>
  );
}
