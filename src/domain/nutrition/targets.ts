import { assert } from '../assert';
import type { ActivityLevel, Goal, Macros, Profile, Sex } from './foodTypes';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Light (training 1–3 days/week)',
  moderate: 'Moderate (training 3–5 days/week)',
  active: 'Active (training 6–7 days/week)',
  very_active: 'Very active (physical job + training)',
};

export const GOAL_LABELS: Record<Goal, string> = { lose: 'Lose weight', maintain: 'Maintain', gain: 'Gain weight' };

/** Energy in one kilogram of body weight change (common approximation). */
export const KCAL_PER_KG = 7700;
/** Lowest target the app will suggest without medical supervision. */
export const CALORIE_FLOOR: Record<Sex, number> = { male: 1500, female: 1200 };
export const PROTEIN_G_PER_KG = 2;
export const FAT_SHARE_OF_KCAL = 0.25;

/** Mifflin-St Jeor resting energy expenditure, kcal/day. */
export function basalMetabolicRate(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'male' ? 5 : -161);
}

export interface DailyTargets {
  macros: Macros;
  maintenanceKcal: number;
  /** True when the goal pace asked for less than the safety floor. */
  floorApplied: boolean;
}

export function ageFromBirthYear(birthYear: number, today: Date): number {
  return today.getFullYear() - birthYear;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function dailyTargets(profile: Profile, weightKg: number, today: Date): DailyTargets {
  assert(weightKg > 0, 'Body weight must be positive');
  const age = ageFromBirthYear(profile.birthYear, today);
  const maintenance = basalMetabolicRate(profile.sex, weightKg, profile.heightCm, age) * ACTIVITY_FACTORS[profile.activity];
  const dailyChange = (profile.paceKgPerWeek * KCAL_PER_KG) / 7;
  const goalKcal = profile.goal === 'lose' ? maintenance - dailyChange : profile.goal === 'gain' ? maintenance + dailyChange : maintenance;
  const floor = CALORIE_FLOOR[profile.sex];
  const computedKcal = roundTo(Math.max(goalKcal, floor), 10);
  const kcal = profile.overrides.kcal ?? computedKcal;
  const protein = profile.overrides.protein ?? Math.round(PROTEIN_G_PER_KG * weightKg);
  const fat = profile.overrides.fat ?? Math.round((kcal * FAT_SHARE_OF_KCAL) / 9);
  const carbs = profile.overrides.carbs ?? Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    macros: { kcal, protein, carbs, fat },
    maintenanceKcal: roundTo(maintenance, 10),
    floorApplied: profile.overrides.kcal === null && goalKcal < floor,
  };
}
