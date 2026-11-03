import { Link } from 'react-router';
import { ExerciseBrowser } from '../components/ExercisePicker';
import { Loading, PageHeader } from '../components/PageHeader';
import { useExerciseCatalog } from '../storage/hooks';

export function ExercisesPage() {
  const catalog = useExerciseCatalog();
  if (catalog === undefined) {
    return <Loading />;
  }
  return (
    <div className="page">
      <PageHeader
        title="Exercises"
        actions={
          <Link to="/exercises/new" className="button button-secondary">
            + Custom
          </Link>
        }
      />
      <ExerciseBrowser exercises={catalog.all} />
    </div>
  );
}
