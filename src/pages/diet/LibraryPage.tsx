import { Link } from 'react-router';
import { Loading, PageHeader } from '../../components/PageHeader';
import { formatKcal } from '../../domain/format';
import { recipeAsFood } from '../../domain/nutrition/foods';
import { portionMacros, scaleMacros, sumMacros } from '../../domain/nutrition/math';
import { listRecipes, listSavedMeals, listStoredFoods } from '../../storage/db';
import { useDbQuery } from '../../storage/hooks';

/** Manage saved meals, recipes and the user's own foods. */
export function LibraryPage() {
  const meals = useDbQuery(listSavedMeals, []);
  const recipes = useDbQuery(listRecipes, []);
  const stored = useDbQuery(listStoredFoods, []);
  if (meals === undefined || recipes === undefined || stored === undefined) {
    return <Loading />;
  }
  const custom = stored.filter((food) => food.source === 'custom').sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <PageHeader title="My foods & meals" back />

      <section className="card">
        <div className="section-header">
          <h2>Saved meals</h2>
          <Link to="/diet/meals/new" className="link-button">
            + New
          </Link>
        </div>
        {meals.length === 0 ? (
          <p className="muted small">Group foods you often eat together (e.g. “My usual breakfast”) and log them with one tap.</p>
        ) : (
          <ul className="plain-list">
            {meals.map((meal) => (
              <li key={meal.id}>
                <Link to={`/diet/meals/${meal.id}`} className="list-row list-link">
                  <span>{meal.name}</span>
                  <span className="muted small">{formatKcal(sumMacros(meal.items.map(portionMacros)).kcal)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Recipes</h2>
          <Link to="/diet/recipes/new" className="link-button">
            + New
          </Link>
        </div>
        {recipes.length === 0 ? (
          <p className="muted small">Add ingredients and the number of portions; then log “1 portion”.</p>
        ) : (
          <ul className="plain-list">
            {recipes.map((recipe) => {
              const portion = recipe.ingredients.length === 0 ? null : recipeAsFood(recipe).servings[0];
              return (
                <li key={recipe.id}>
                  <Link to={`/diet/recipes/${recipe.id}`} className="list-row list-link">
                    <span>{recipe.name}</span>
                    <span className="muted small">
                      {portion === undefined || portion === null ? 'No ingredients' : `${formatKcal(scaleMacros(recipeAsFood(recipe).per100, portion.grams).kcal)} / portion`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>My foods</h2>
          <Link to="/diet/foods/new" className="link-button">
            + New
          </Link>
        </div>
        {custom.length === 0 ? (
          <p className="muted small">Foods you add yourself (or from a scanned package) appear here.</p>
        ) : (
          <ul className="plain-list">
            {custom.map((food) => (
              <li key={food.id}>
                <Link to={`/diet/foods/${encodeURIComponent(food.id)}/edit`} className="list-row list-link">
                  <span>
                    {food.name}
                    {food.brand !== null && <span className="muted small"> · {food.brand}</span>}
                  </span>
                  <span className="muted small">{formatKcal(food.per100.kcal)} / 100 g</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
