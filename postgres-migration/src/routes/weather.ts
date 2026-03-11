/**
 * Express routes for weather observation data.
 * Each route maps to the equivalent MongoDB query, now using Postgres via Prisma.
 */

import { Router, Request, Response } from "express";
import * as queries from "../db/queries";

const router = Router();

// GET /api/weather - List observations with pagination
// MongoDB equivalent: db.weather.find().skip(skip).limit(limit).sort({ ts: -1 })
router.get("/", async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const [observations, total] = await Promise.all([
      queries.findAllObservations({ skip, take }),
      queries.countObservations(),
    ]);
    res.json({ data: observations, total, skip, take });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/count - Count observations
// MongoDB equivalent: db.weather.countDocuments()
router.get("/count", async (_req: Request, res: Response) => {
  try {
    const count = await queries.countObservations();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Failed to count observations", details: String(error) });
  }
});

// GET /api/weather/stations - List distinct stations
// MongoDB equivalent: db.weather.distinct("st")
router.get("/stations", async (_req: Request, res: Response) => {
  try {
    const stations = await queries.findDistinctStations();
    res.json({ data: stations, count: stations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stations", details: String(error) });
  }
});

// GET /api/weather/call-letters - List distinct call letters
// MongoDB equivalent: db.weather.distinct("callLetters")
router.get("/call-letters", async (_req: Request, res: Response) => {
  try {
    const callLetters = await queries.findDistinctCallLetters();
    res.json({ data: callLetters, count: callLetters.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch call letters", details: String(error) });
  }
});

// GET /api/weather/by-mongo-id/:mongoId - Find by original MongoDB _id
// MongoDB equivalent: db.weather.findOne({ _id: ObjectId(mongoId) })
router.get("/by-mongo-id/:mongoId", async (req: Request, res: Response) => {
  try {
    const observation = await queries.findObservationByMongoId(req.params.mongoId);
    if (!observation) {
      res.status(404).json({ error: "Observation not found" });
      return;
    }
    res.json({ data: observation });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observation", details: String(error) });
  }
});

// GET /api/weather/by-station/:station - Find by station
// MongoDB equivalent: db.weather.find({ st: station })
router.get("/by-station/:station", async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByStation(
      req.params.station,
      { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-call-letters/:callLetters - Find by call letters
// MongoDB equivalent: db.weather.find({ callLetters: callLetters })
router.get("/by-call-letters/:callLetters", async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByCallLetters(
      req.params.callLetters,
      { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-date-range?start=...&end=... - Find by date range
// MongoDB equivalent: db.weather.find({ ts: { $gte: start, $lte: end } })
router.get("/by-date-range", async (req: Request, res: Response) => {
  try {
    const start = req.query.start as string;
    const end = req.query.end as string;
    if (!start || !end) {
      res.status(400).json({ error: "start and end query params required" });
      return;
    }
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByDateRange(
      new Date(start),
      new Date(end),
      { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-temperature?min=...&max=... - Find by temperature range
// MongoDB equivalent: db.weather.find({ "airTemperature.value": { $gte: min, $lte: max } })
router.get("/by-temperature", async (req: Request, res: Response) => {
  try {
    const min = parseFloat(req.query.min as string);
    const max = parseFloat(req.query.max as string);
    if (isNaN(min) || isNaN(max)) {
      res.status(400).json({ error: "min and max query params required (numbers)" });
      return;
    }
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByTemperatureRange(
      min, max, { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-wind-speed?min=... - Find by wind speed threshold
// MongoDB equivalent: db.weather.find({ "wind.speed.rate": { $gte: min } })
router.get("/by-wind-speed", async (req: Request, res: Response) => {
  try {
    const min = parseFloat(req.query.min as string);
    if (isNaN(min)) {
      res.status(400).json({ error: "min query param required (number)" });
      return;
    }
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByWindSpeed(
      min, { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-bounding-box?minLon=...&maxLon=...&minLat=...&maxLat=...
// MongoDB equivalent: db.weather.find({ "position.coordinates": { $geoWithin: { $box: [...] } } })
router.get("/by-bounding-box", async (req: Request, res: Response) => {
  try {
    const minLon = parseFloat(req.query.minLon as string);
    const maxLon = parseFloat(req.query.maxLon as string);
    const minLat = parseFloat(req.query.minLat as string);
    const maxLat = parseFloat(req.query.maxLat as string);
    if ([minLon, maxLon, minLat, maxLat].some(isNaN)) {
      res.status(400).json({ error: "minLon, maxLon, minLat, maxLat required" });
      return;
    }
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsByBoundingBox(
      minLon, maxLon, minLat, maxLat, { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/by-section/:section - Find by section code
// MongoDB equivalent: db.weather.find({ sections: { $in: [section] } })
router.get("/by-section/:section", async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsBySection(
      req.params.section,
      { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/with-waves - Find observations with wave measurements
// MongoDB equivalent: db.weather.find({ waveMeasurement: { $exists: true } })
router.get("/with-waves", async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsWithWaveMeasurements(
      { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// GET /api/weather/high-waves?height=... - Find observations with high waves
// MongoDB equivalent: db.weather.find({ "waveMeasurement.waves.height": { $gte: height } })
router.get("/high-waves", async (req: Request, res: Response) => {
  try {
    const height = parseFloat(req.query.height as string);
    if (isNaN(height)) {
      res.status(400).json({ error: "height query param required (number)" });
      return;
    }
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 100;
    const observations = await queries.findObservationsWithHighWaves(
      height, { skip, take }
    );
    res.json({ data: observations, count: observations.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch observations", details: String(error) });
  }
});

// --- Aggregation Endpoints ---

// GET /api/weather/stats/avg-temperature-by-station
// MongoDB equivalent: db.weather.aggregate([{ $group: { _id: "$st", avgTemp: { $avg: "$airTemperature.value" } } }])
router.get("/stats/avg-temperature-by-station", async (_req: Request, res: Response) => {
  try {
    const result = await queries.getAverageTemperatureByStation();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to aggregate", details: String(error) });
  }
});

// GET /api/weather/stats/count-by-type
// MongoDB equivalent: db.weather.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }])
router.get("/stats/count-by-type", async (_req: Request, res: Response) => {
  try {
    const result = await queries.countObservationsByType();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to aggregate", details: String(error) });
  }
});

// GET /api/weather/stats/avg-pressure-by-call-letters
// MongoDB equivalent: db.weather.aggregate([{ $group: { _id: "$callLetters", avgPressure: { $avg: "$pressure.value" } } }])
router.get("/stats/avg-pressure-by-call-letters", async (_req: Request, res: Response) => {
  try {
    const result = await queries.getAveragePressureByCallLetters();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to aggregate", details: String(error) });
  }
});

// GET /api/weather/stats/daily-summary
// MongoDB equivalent: Complex $group aggregation by date
router.get("/stats/daily-summary", async (_req: Request, res: Response) => {
  try {
    const result = await queries.getDailySummary();
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: "Failed to aggregate", details: String(error) });
  }
});

// --- CRUD Operations ---

// Allowlist of fields that can be updated via PUT
const UPDATABLE_FIELDS = new Set([
  "st",
  "callLetters",
  "qualityControlProcess",
  "dataSource",
  "type",
  "airTemperatureValue",
  "airTemperatureQuality",
  "dewPointValue",
  "dewPointQuality",
  "pressureValue",
  "pressureQuality",
  "windDirectionAngle",
  "windDirectionQuality",
  "windType",
  "windSpeedRate",
  "windSpeedQuality",
  "visibilityDistanceValue",
  "visibilityDistanceQuality",
  "visibilityVariabilityValue",
  "visibilityVariabilityQuality",
  "skyConditionCeilingHeightValue",
  "skyConditionCeilingHeightQuality",
  "skyConditionCeilingHeightDetermination",
  "skyConditionCavok",
  "precipEstDiscrepancy",
  "precipEstWaterDepth",
  "elevation",
  "sections",
]);

// PUT /api/weather/:mongoId - Update an observation
// MongoDB equivalent: db.weather.updateOne({ _id: ObjectId(mongoId) }, { $set: { ... } })
router.put("/:mongoId", async (req: Request, res: Response) => {
  try {
    // Sanitize input: only allow updatable fields, reject nested relations and protected fields
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(req.body)) {
      if (UPDATABLE_FIELDS.has(key)) {
        sanitized[key] = req.body[key];
      }
    }
    if (Object.keys(sanitized).length === 0) {
      res.status(400).json({ error: "No valid updatable fields provided", allowedFields: Array.from(UPDATABLE_FIELDS) });
      return;
    }
    const observation = await queries.updateObservation(
      req.params.mongoId,
      sanitized
    );
    res.json({ data: observation });
  } catch (error) {
    res.status(500).json({ error: "Failed to update observation", details: String(error) });
  }
});

// DELETE /api/weather/:mongoId - Delete an observation
// MongoDB equivalent: db.weather.deleteOne({ _id: ObjectId(mongoId) })
router.delete("/:mongoId", async (req: Request, res: Response) => {
  try {
    await queries.deleteObservation(req.params.mongoId);
    res.json({ message: "Observation deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete observation", details: String(error) });
  }
});

export default router;
