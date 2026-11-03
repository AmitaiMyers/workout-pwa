# Built-in food data

`src/domain/nutrition/foods.data.ts` is generated from **USDA FoodData Central, SR Legacy**
(public domain, CC0). Each curated food maps to exactly one USDA entry; values are per 100 g.

- `curated.py` lists the foods: key, English name, Hebrew name, category, the USDA description
  (as a regex) and common servings.
- `build.py` resolves every entry against the USDA files, fails on zero or multiple matches,
  drops stand-ins that are not the named food, and writes the TypeScript file.
- `lookup.py` searches the USDA data (handy when adding foods).

## Regenerate

1. Download "SR Legacy" (CSV) from https://fdc.nal.usda.gov/download-datasets and unzip it.
2. Run:

```bash
python3 -I scripts/food-data/build.py /path/to/FoodData_Central_sr_legacy_food_csv src/domain/nutrition/foods.data.ts
```

Search for a USDA description while curating:

```bash
python3 -I scripts/food-data/lookup.py /path/to/sr_legacy_csv '^Hummus'
```

`sr.pickle` is a local cache of the parsed CSVs and is git-ignored.
