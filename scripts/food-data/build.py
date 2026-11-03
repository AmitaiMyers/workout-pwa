"""Resolve curated foods against SR Legacy, validate, and emit the app's TypeScript dataset."""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lookup import load
from curated import FOODS

# Stand-ins that are not the named food: removed rather than mislabelled.
DROP = {'silan', 'halva', 'shakshuka', 'muesli', 'protein-bar', 'smoothie', 'fried-rice', 'kugel', 'majadra',
        'mixed-salad', 'ptitim', 'labneh', 'peanut-snack', 'cappuccino', 'tahini-prepared', 'pita-falafel',
        'shawarma', 'halloumi', 'chicken-sausage', 'cola-diet',
        # No faithful SR Legacy entry exists for these:
        'hot-dog-bun', 'sushi', 'caesar-salad', 'tuna-salad', 'egg-salad', 'grilled-cheese', 'pierogi'}
# Honest names for near-matches: key -> (English, Hebrew)
RENAME = {
    'cottage': ('Cottage cheese, 4%', 'קוטג׳ 4%'),
    'cottage-lowfat': ('Cottage cheese, 2%', 'קוטג׳ 2%'),
    'cream-cheese-light': ('Cream cheese, light', 'גבינת שמנת לייט'),
    'feta': ('Feta cheese', 'גבינת פטה'),
    'sea-bream': ('Snapper, cooked', 'לוקוס / סנפר'),
    'rugelach': ('Danish pastry, cheese', 'מאפה גבינה'),
    'biscuit': ('Butter cookie', 'עוגיית חמאה'),
    'borekas': ('Puff pastry, baked', 'בצק עלים אפוי'),
    'pad-thai': ('Chicken chow mein', 'צ׳או מיין עוף'),
    'caesar-salad': ('Garden salad with chicken (no dressing)', 'סלט ירקות עם עוף (ללא רוטב)'),
    'frozen-yogurt': ('Frozen yogurt, chocolate', 'פרוזן יוגורט שוקולד'),
    'kebab': ('Ground lamb, cooked (kebab)', 'כבש טחון מבושל (קבב)'),
    'chicken-schnitzel': ('Chicken breast, battered & fried', 'חזה עוף בבלילה מטוגן'),
    'chicken-nuggets': ('Chicken tenders (fast food)', 'סטריפס / נאגטס עוף'),
    'yellow-cheese': ('Gouda (yellow cheese)', 'גבינה צהובה (גאודה)'),
    'lamb-chop': ('Lamb loin, lean, broiled', 'מותן כבש צלוי'),
    'pizza-cheese': ('Pizza, cheese', 'פיצה גבינה'),
    'pizza-pepperoni': ('Pizza, meat topping', 'פיצה עם בשר'),
    'fried-chicken': ('Fried chicken pieces, breaded', 'עוף מטוגן בציפוי'),
    'cornflakes': ('Corn flakes', 'קורנפלקס'),
}
FDP = r" \(Includes foods for USDA's Food Distribution Program\)$"
OVERRIDE_REGEX = {
    'yogurt-greek': r"^Yogurt, Greek, plain, nonfat" + FDP,
    'cheddar': r"^Cheese, cheddar" + FDP,
    'turkey-breast': r'^Turkey, retail parts, breast, meat only, cooked, roasted$',
    'beef-ground-raw': r"^Beef, ground, 85% lean meat / 15% fat, raw" + FDP,
    'lamb-chop': r'^Lamb, loin, separable lean only, trimmed to 1/4" fat, choice, cooked, broiled$',
    'tuna-can-water': r"^Fish, tuna, light, canned in water, drained solids" + FDP,
    'tuna-steak': r'^Fish, tuna, yellowfin, fresh, cooked, dry heat$',
    'rice-brown': r"^Rice, brown, long-grain, cooked" + FDP,
    'pasta-whole': r"^Pasta, whole-wheat, cooked" + FDP,
    'egg-noodles': r'^Noodles, egg, enriched, cooked$',
    'oatmeal': r'^Cereals, oats, regular and quick, unenriched, cooked with water \(includes boiling and microwaving\), without salt$',
    'cornflakes': r'^Cereals ready-to-eat, RALSTON Corn Flakes$',
    'rice-cake': r'^Snacks, rice cakes, brown rice, plain, unsalted$',
    'flour-whole': r"^Wheat flour, whole-grain" + FDP,
    'tomato-paste': r"^Tomato products, canned, paste, without salt added" + FDP,
    'raisins': r"^Raisins, dark, seedless" + FDP,
    'dried-cranberries': r"^Cranberries, dried, sweetened" + FDP,
    'cheesecake': r'^Cake, cheesecake, commercially prepared$',
    'brownie': r'^Cookies, brownies, commercially prepared$',
    'orange-juice': r"^Orange juice, raw" + FDP,
    'sports-drink': r'^Beverages, COCA-COLA, POWERADE, lemon-lime flavored, ready-to-drink$',
    'pizza-cheese': r'^Pizza, cheese topping, regular crust, frozen, cooked$',
    'pizza-pepperoni': r'^Pizza, meat topping, thick crust, frozen, cooked$',
    'fried-chicken': r'^Fast foods, chicken, breaded and fried, boneless pieces, plain$',
    'chicken-soup': r'^Soup, chicken noodle, reduced sodium, canned, ready-to-serve$',
    'coleslaw': r'^Fast foods, coleslaw$',
    'sandwich-turkey': r'^Fast foods, submarine sandwich, turkey breast on white bread with lettuce and tomato$',
    'pad-thai': r'^Restaurant, Chinese, chicken chow mein$',
}

def resolve(foods, rx):
    pattern = re.compile(rx)
    return [(k, v) for k, v in foods.items() if pattern.search(v['desc'])]

def main(data_dir, out_path):
    foods = load(data_dir)
    problems, entries, seen = [], [], set()
    for key, en, he, cat, rx, servings in FOODS:
        if key in DROP:
            continue
        assert key not in seen, f'duplicate key {key}'
        seen.add(key)
        en, he = RENAME.get(key, (en, he))
        rx = OVERRIDE_REGEX.get(key, rx)
        hits = resolve(foods, rx)
        if len(hits) != 1:
            problems.append((key, rx, len(hits), [h[1]['desc'] for h in hits[:4]]))
            continue
        fdc_id, food = hits[0]
        n = food['n']
        missing = [k for k in ('kcal', 'protein', 'fat', 'carbs') if k not in n]
        if missing:
            problems.append((key, rx, 'missing ' + ','.join(missing), [food['desc']]))
            continue
        if servings is None:
            servings = [(label, g) for label, g in food['portions'] if 'yield' not in label][:3]
        entries.append({'id': key, 'name': en, 'nameHe': he, 'category': cat, 'fdcId': int(fdc_id), 'usda': food['desc'],
                        'per100': {'kcal': round(n['kcal']), 'protein': round(n['protein'], 1), 'carbs': round(n['carbs'], 1), 'fat': round(n['fat'], 1)},
                        'servings': [{'label': l, 'grams': g} for l, g in servings]})
    for p in problems:
        print('PROBLEM', p)
    print(f'{len(entries)} foods resolved, {len(problems)} problems')
    if out_path and not problems:
        with open(out_path, 'w') as f:
            f.write('// Generated from USDA FoodData Central, SR Legacy (public domain, CC0). Values per 100 g.\n')
            f.write('// Do not edit by hand: regenerate with scripts/food-data (see its README).\n')
            f.write("import type { BuiltInFoodData } from './foodTypes';\n\n")
            f.write('export const BUILT_IN_FOOD_DATA: readonly BuiltInFoodData[] = [\n')
            for entry in entries:
                f.write('  ' + json.dumps(entry, ensure_ascii=False, separators=(',', ':')) + ',\n')
            f.write('];\n')
        print('wrote', out_path)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
