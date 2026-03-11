# MongoDB to PostgreSQL Migration

Complete migration of weather observation data from MongoDB to PostgreSQL using Prisma ORM.

## Schema Design

The MongoDB document structure has been normalized into 11 PostgreSQL tables:

### Main Table
- **`weather_observations`** — Core observation data with flattened fields for always-present sub-documents (airTemperature, dewPoint, pressure, wind, visibility, skyCondition, precipitationEstimatedObservation)

### Related Tables (1:1 optional)
- **`atmospheric_pressure_changes`** — Present in ~84% of observations
- **`atmospheric_pressure_observations`** — Present in ~0.6% of observations
- **`sea_surface_temperatures`** — Present in ~80% of observations
- **`wave_measurements`** — Present in ~75% of observations
- **`sky_condition_observations`** — Present in ~94% of observations

### Related Tables (1:N arrays)
- **`past_weather_observations`** — Present in ~90% of observations
- **`present_weather_observations`** — Present in ~91% of observations
- **`sky_cover_layers`** — Present in ~7.4% of observations
- **`extreme_air_temperatures`** — Present in ~0.1% of observations
- **`liquid_precipitations`** — Present in ~1.1% of observations

## Setup

```bash
# Install dependencies
npm install

# Set up your database URL
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Generate Prisma client
npx prisma generate

# Run database migration (creates tables)
npx prisma migrate dev --name init

# Migrate data from MongoDB JSON to PostgreSQL
npm run migrate:data -- ../MongoDB/mongo-sample-weather.json

# Verify migration
npm run migrate:verify -- ../MongoDB/mongo-sample-weather.json

# Start the API server
npm run dev
```

## API Endpoints

Visit `http://localhost:3000/api` for full endpoint documentation.

### Query Examples (MongoDB -> PostgreSQL equivalents)

| MongoDB Query | PostgreSQL API Endpoint |
|---|---|
| `db.weather.find()` | `GET /api/weather` |
| `db.weather.findOne({ _id: ObjectId(...) })` | `GET /api/weather/by-mongo-id/:id` |
| `db.weather.find({ st: "..." })` | `GET /api/weather/by-station/:st` |
| `db.weather.find({ ts: { $gte, $lte } })` | `GET /api/weather/by-date-range?start=...&end=...` |
| `db.weather.find({ "airTemperature.value": { $gte, $lte } })` | `GET /api/weather/by-temperature?min=...&max=...` |
| `db.weather.find({ sections: { $in: [...] } })` | `GET /api/weather/by-section/:section` |
| `db.weather.aggregate([{ $group: ... }])` | `GET /api/weather/stats/*` |
| `db.weather.distinct("st")` | `GET /api/weather/stations` |
| `db.weather.countDocuments()` | `GET /api/weather/count` |

## Data Migration Script

The migration script (`src/scripts/migrate-data.ts`) reads the MongoDB Extended JSON export line-by-line and:

1. Parses each MongoDB document with Extended JSON types (`$oid`, `$numberDouble`, `$numberInt`, `$date`)
2. Transforms nested MongoDB sub-documents into flat PostgreSQL columns or related table records
3. Inserts data in batches of 500 within transactions for consistency
4. Reports progress and throughput metrics

## Verification Script

The verification script (`src/scripts/verify-migration.ts`) validates:

1. Total record count matches between source and destination
2. All related tables have correct record counts
3. Spot-checks 5 random documents for field-level accuracy
