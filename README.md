# Skylight — India Edition

> **Based on [cpaczek/skylight](https://github.com/cpaczek/skylight)** — all credit for the original concept, architecture, and code goes to the original author. This fork adapts it for Indian cities.

Project the aircraft passing overhead onto your ceiling, in real time — an X-ray through the roof.

Pulls live flight data from [airplanes.live](https://airplanes.live) (no hardware needed). Point it at your coordinates and watch every plane above your city labeled with its airline, aircraft type, altitude, and destination.

---

## What's different from the original

- **Covers 5 Indian cities** — Kolkata, Mumbai, Delhi, Bangalore, Chennai. The nearest airport's runways are drawn automatically based on your coordinates.
- **API-first** — runs entirely off the free airplanes.live API, no RTL-SDR radio required.
- **Indian airlines** — IndiGo, SpiceJet, Akasa Air, Air India Express, Vistara, Biman Bangladesh resolve instantly.
- **Correct IST time** — destination local times show accurate IST (+5:30) instead of solar mean time.
- **15-mile radius** — widened from the original 3 miles to suit Indian airspace density.
- **Smoother tracking** — planes stay visible during brief API gaps instead of blinking out.
- **Zero-friction setup** — drop your coordinates in a `.env` file and run.

---

## Setup

**You'll need:** Node.js 20+, pnpm

```bash
git clone https://github.com/your-username/skylight
cd skylight
pnpm install
```

Copy the env template and add your coordinates:

```bash
cp .env.example .env
```

Open `.env` and replace the coordinates with your own (right-click your home on Google Maps to get them):

```
LAT=22.4933
LON=88.4036
```

Run:

```bash
DATA_SOURCE=api pnpm dev
```

Open **http://localhost:5173** — you should see aircraft within about 30 seconds.

---

## Using Claude Code?

Just open the project and Claude will ask for your coordinates and set everything up.

---

## Supported cities

Runway geometry is bundled for:

| City | Airport | ICAO |
|------|---------|------|
| Kolkata | Netaji Subhas Chandra Bose International | VECC |
| Mumbai | Chhatrapati Shivaji Maharaj International | VABB |
| Delhi | Indira Gandhi International | VIDP |
| Bangalore | Kempegowda International | VOBL |
| Chennai | Chennai International | VOMM |

If you're near one of these cities, the correct airport is picked automatically from your coordinates.

---

## Control panel

While the app is running, open **http://\<your-ip\>:3000/control** on your phone to live-tune brightness, rotation, labels, and more.

---

## Hardware (optional)

The original project supports a full ceiling projector build with a Raspberry Pi 5 + RTL-SDR receiver. See [cpaczek/skylight](https://github.com/cpaczek/skylight) for the complete hardware guide.

---

## License

MIT — same as the original. Original work © cpaczek.
