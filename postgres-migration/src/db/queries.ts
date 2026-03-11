/**
 * Postgres query layer - replaces all MongoDB query operations.
 *
 * Each function documents the equivalent MongoDB query it replaces.
 */

import { Prisma } from "@prisma/client";
import prisma from "./client";

// ---------------------------------------------------------------------------
// 1. Find all observations (equivalent to: db.weather.find())
// ---------------------------------------------------------------------------
export async function findAllObservations(options?: {
  skip?: number;
  take?: number;
  orderBy?: Prisma.WeatherObservationOrderByWithRelationInput;
}) {
  return prisma.weatherObservation.findMany({
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: options?.orderBy ?? { ts: "desc" },
    include: {
      atmosphericPressureChange: true,
      atmosphericPressureObservation: true,
      seaSurfaceTemperature: true,
      waveMeasurement: true,
      skyConditionObservation: true,
      pastWeatherObservations: true,
      presentWeatherObservations: true,
      skyCoverLayers: true,
      extremeAirTemperatures: true,
      liquidPrecipitations: true,
    },
  });
}

// ---------------------------------------------------------------------------
// 2. Find by MongoDB _id (equivalent to: db.weather.findOne({ _id: ObjectId(...) }))
// ---------------------------------------------------------------------------
export async function findObservationByMongoId(mongoId: string) {
  return prisma.weatherObservation.findUnique({
    where: { mongoId },
    include: {
      atmosphericPressureChange: true,
      atmosphericPressureObservation: true,
      seaSurfaceTemperature: true,
      waveMeasurement: true,
      skyConditionObservation: true,
      pastWeatherObservations: true,
      presentWeatherObservations: true,
      skyCoverLayers: true,
      extremeAirTemperatures: true,
      liquidPrecipitations: true,
    },
  });
}

// ---------------------------------------------------------------------------
// 3. Find by station (equivalent to: db.weather.find({ st: "..." }))
// ---------------------------------------------------------------------------
export async function findObservationsByStation(
  station: string,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: { st: station },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { ts: "desc" },
    include: {
      atmosphericPressureChange: true,
      seaSurfaceTemperature: true,
      waveMeasurement: true,
    },
  });
}

// ---------------------------------------------------------------------------
// 4. Find by call letters (equivalent to: db.weather.find({ callLetters: "..." }))
// ---------------------------------------------------------------------------
export async function findObservationsByCallLetters(
  callLetters: string,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: { callLetters },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { ts: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 5. Find by date range (equivalent to:
//    db.weather.find({ ts: { $gte: start, $lte: end } }))
// ---------------------------------------------------------------------------
export async function findObservationsByDateRange(
  startDate: Date,
  endDate: Date,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      ts: {
        gte: startDate,
        lte: endDate,
      },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { ts: "asc" },
  });
}

// ---------------------------------------------------------------------------
// 6. Find by temperature range (equivalent to:
//    db.weather.find({ "airTemperature.value": { $gte: min, $lte: max } }))
// ---------------------------------------------------------------------------
export async function findObservationsByTemperatureRange(
  minTemp: number,
  maxTemp: number,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      airTemperatureValue: {
        gte: minTemp,
        lte: maxTemp,
      },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { airTemperatureValue: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 7. Find by wind speed threshold (equivalent to:
//    db.weather.find({ "wind.speed.rate": { $gte: minSpeed } }))
// ---------------------------------------------------------------------------
export async function findObservationsByWindSpeed(
  minSpeed: number,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      windSpeedRate: { gte: minSpeed },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { windSpeedRate: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 8. Find by geographic bounding box (equivalent to:
//    db.weather.find({ "position.coordinates": { $geoWithin: { $box: [...] } } }))
// ---------------------------------------------------------------------------
export async function findObservationsByBoundingBox(
  minLon: number,
  maxLon: number,
  minLat: number,
  maxLat: number,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      longitude: { gte: minLon, lte: maxLon },
      latitude: { gte: minLat, lte: maxLat },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { ts: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 9. Aggregate: Average temperature by station (equivalent to:
//    db.weather.aggregate([
//      { $group: { _id: "$st", avgTemp: { $avg: "$airTemperature.value" } } }
//    ]))
// ---------------------------------------------------------------------------
export async function getAverageTemperatureByStation() {
  return prisma.weatherObservation.groupBy({
    by: ["st"],
    _avg: { airTemperatureValue: true },
    _count: { id: true },
    _min: { airTemperatureValue: true },
    _max: { airTemperatureValue: true },
    orderBy: { _avg: { airTemperatureValue: "desc" } },
    take: 50,
  });
}

// ---------------------------------------------------------------------------
// 10. Aggregate: Count observations by type (equivalent to:
//     db.weather.aggregate([
//       { $group: { _id: "$type", count: { $sum: 1 } } }
//     ]))
// ---------------------------------------------------------------------------
export async function countObservationsByType() {
  return prisma.weatherObservation.groupBy({
    by: ["type"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
}

// ---------------------------------------------------------------------------
// 11. Aggregate: Average pressure by call letters (equivalent to:
//     db.weather.aggregate([
//       { $group: { _id: "$callLetters", avgPressure: { $avg: "$pressure.value" } } },
//       { $sort: { avgPressure: -1 } },
//       { $limit: 20 }
//     ]))
// ---------------------------------------------------------------------------
export async function getAveragePressureByCallLetters() {
  return prisma.weatherObservation.groupBy({
    by: ["callLetters"],
    _avg: { pressureValue: true },
    _count: { id: true },
    orderBy: { _avg: { pressureValue: "desc" } },
    take: 20,
  });
}

// ---------------------------------------------------------------------------
// 12. Count total observations (equivalent to: db.weather.countDocuments())
// ---------------------------------------------------------------------------
export async function countObservations(where?: Prisma.WeatherObservationWhereInput) {
  return prisma.weatherObservation.count({ where });
}

// ---------------------------------------------------------------------------
// 13. Find observations with wave measurements (equivalent to:
//     db.weather.find({ waveMeasurement: { $exists: true } }))
// ---------------------------------------------------------------------------
export async function findObservationsWithWaveMeasurements(
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      waveMeasurement: { isNot: null },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    include: { waveMeasurement: true },
    orderBy: { ts: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 14. Find observations with high wave heights (equivalent to:
//     db.weather.find({ "waveMeasurement.waves.height": { $gte: threshold } }))
// ---------------------------------------------------------------------------
export async function findObservationsWithHighWaves(
  heightThreshold: number,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      waveMeasurement: {
        waveHeight: { gte: heightThreshold },
      },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    include: { waveMeasurement: true },
    orderBy: { ts: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 15. Update an observation (equivalent to:
//     db.weather.updateOne({ _id: ObjectId(...) }, { $set: { ... } }))
// ---------------------------------------------------------------------------
export async function updateObservation(
  mongoId: string,
  data: Prisma.WeatherObservationUpdateInput
) {
  return prisma.weatherObservation.update({
    where: { mongoId },
    data,
  });
}

// ---------------------------------------------------------------------------
// 16. Delete an observation (equivalent to:
//     db.weather.deleteOne({ _id: ObjectId(...) }))
// ---------------------------------------------------------------------------
export async function deleteObservation(mongoId: string) {
  return prisma.weatherObservation.delete({
    where: { mongoId },
  });
}

// ---------------------------------------------------------------------------
// 17. Find distinct stations (equivalent to: db.weather.distinct("st"))
// ---------------------------------------------------------------------------
export async function findDistinctStations() {
  const result = await prisma.weatherObservation.findMany({
    select: { st: true },
    distinct: ["st"],
    orderBy: { st: "asc" },
  });
  return result.map((r) => r.st);
}

// ---------------------------------------------------------------------------
// 18. Find distinct call letters (equivalent to: db.weather.distinct("callLetters"))
// ---------------------------------------------------------------------------
export async function findDistinctCallLetters() {
  const result = await prisma.weatherObservation.findMany({
    select: { callLetters: true },
    distinct: ["callLetters"],
    orderBy: { callLetters: "asc" },
  });
  return result.map((r) => r.callLetters);
}

// ---------------------------------------------------------------------------
// 19. Search sections array (equivalent to:
//     db.weather.find({ sections: { $in: ["AG1"] } }))
// ---------------------------------------------------------------------------
export async function findObservationsBySection(
  section: string,
  options?: { skip?: number; take?: number }
) {
  return prisma.weatherObservation.findMany({
    where: {
      sections: { has: section },
    },
    skip: options?.skip,
    take: options?.take ?? 100,
    orderBy: { ts: "desc" },
  });
}

// ---------------------------------------------------------------------------
// 20. Complex aggregation: weather summary by date (equivalent to:
//     db.weather.aggregate([
//       { $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
//           avgTemp: { $avg: "$airTemperature.value" },
//           avgPressure: { $avg: "$pressure.value" },
//           avgWindSpeed: { $avg: "$wind.speed.rate" },
//           count: { $sum: 1 }
//       }},
//       { $sort: { _id: 1 } }
//     ]))
// ---------------------------------------------------------------------------
export async function getDailySummary() {
  // Use raw query for date-based aggregation
  const result = await prisma.$queryRaw<
    Array<{
      date: string;
      avg_temp: number;
      avg_pressure: number;
      avg_wind_speed: number;
      observation_count: bigint;
    }>
  >`
    SELECT
      DATE(ts) as date,
      AVG(air_temperature_value) as avg_temp,
      AVG(pressure_value) as avg_pressure,
      AVG(wind_speed_rate) as avg_wind_speed,
      COUNT(*) as observation_count
    FROM weather_observations
    GROUP BY DATE(ts)
    ORDER BY date ASC
  `;

  return result.map((row) => ({
    date: row.date,
    avgTemp: Number(row.avg_temp),
    avgPressure: Number(row.avg_pressure),
    avgWindSpeed: Number(row.avg_wind_speed),
    observationCount: Number(row.observation_count),
  }));
}
