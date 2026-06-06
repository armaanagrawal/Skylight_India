# Skylight

Real-time aircraft visualiser that projects planes flying overhead onto your ceiling.

## Your job when someone opens this project

1. Ask the user: **"Go to Google Maps, right-click your home, and paste the coordinates here."**
2. Write those coordinates into `.env` (copy from `.env.example` if it doesn't exist yet)
3. Run the app

That's it. Do not proceed until you have coordinates from the user.

## Running the app

```bash
DATA_SOURCE=api pnpm dev
```

Then open http://localhost:5173

## .env format

```
LAT=22.4933
LON=88.4036
```

## Supported cities

Runway data is bundled for: Kolkata (CCU), Mumbai (BOM), Delhi (DEL), Bangalore (BLR), Chennai (MAA). The nearest airport is picked automatically from the user's coordinates — nothing to configure.

## What the numbers mean

- `LAT` / `LON` — the user's home location, not the airport. This is the center of their radar view.
- `DATA_SOURCE=api` — pulls live flight data from airplanes.live, no hardware needed.
