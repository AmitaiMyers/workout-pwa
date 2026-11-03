"""Search SR Legacy foods by regex and print per-100 g kcal/protein/fat/carbs plus portions."""
import csv, re, sys, pickle, os
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr.pickle')
NUTRIENTS = {'1008': 'kcal', '1003': 'protein', '1004': 'fat', '1005': 'carbs'}

def load(data_dir):
    if os.path.exists(CACHE):
        with open(CACHE, 'rb') as f:
            return pickle.load(f)
    foods = {}
    with open(os.path.join(data_dir, 'food.csv'), newline='') as f:
        for row in csv.DictReader(f):
            foods[row['fdc_id']] = {'desc': row['description'], 'cat': row['food_category_id'], 'n': {}, 'portions': []}
    with open(os.path.join(data_dir, 'food_nutrient.csv'), newline='') as f:
        for row in csv.DictReader(f):
            key = NUTRIENTS.get(row['nutrient_id'])
            if key and row['fdc_id'] in foods:
                foods[row['fdc_id']]['n'][key] = float(row['amount'])
    units = {}
    with open(os.path.join(data_dir, 'measure_unit.csv'), newline='') as f:
        for row in csv.DictReader(f):
            units[row['id']] = row['name']
    with open(os.path.join(data_dir, 'food_portion.csv'), newline='') as f:
        for row in csv.DictReader(f):
            if row['fdc_id'] in foods:
                unit = units.get(row['measure_unit_id'], '')
                label = ' '.join(x for x in [row['amount'], unit if unit != 'undetermined' else '', row['portion_description'], row['modifier']] if x).strip()
                foods[row['fdc_id']]['portions'].append((label, float(row['gram_weight'])))
    with open(CACHE, 'wb') as f:
        pickle.dump(foods, f)
    return foods

if __name__ == '__main__':
    foods = load(sys.argv[1])
    for pattern in sys.argv[2:]:
        rx = re.compile(pattern, re.I)
        hits = [(k, v) for k, v in foods.items() if rx.search(v['desc'])]
        print(f'## /{pattern}/ -> {len(hits)}')
        for k, v in hits[:8]:
            n = v['n']
            print(f"  {k} | {v['desc']} | kcal {n.get('kcal')} P {n.get('protein')} F {n.get('fat')} C {n.get('carbs')} | {v['portions'][:3]}")
