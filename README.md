# Med School Practice App

A no-backend, browser-based app to practice med school questions and track your weak areas.

## What it does
- Practice multiple-choice questions with **5 answer options (A-E)**
- Add new questions any time with module + lecture tags
- Bulk upload questions from CSV
- Track total accuracy and per-module performance
- Automatically surface weak lecture areas based on accuracy

## Run
```bash
python -m http.server 8000
```
Then open: `http://localhost:8000`

## CSV format
Required columns:

`text,option_a,option_b,option_c,option_d,option_e,correct_option,module,lecture`

`correct_option` must be one of: `a,b,c,d,e`.

## Data storage
All data is stored in browser `localStorage` under the key `med-practice-bank-v1`.
