/**
 * Express server entry point for the weather observation API.
 * Demonstrates the MongoDB -> PostgreSQL migration with a fully functional REST API.
 */

import express from "express";
import weatherRoutes from "./routes/weather";
import prisma from "./db/client";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected", details: String(error) });
  }
});

// Weather observation routes
app.use("/api/weather", weatherRoutes);

// API documentation
app.get("/api", (_req, res) => {
  res.json({
    name: "Weather Observation API (MongoDB -> PostgreSQL Migration)",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      weather: {
        list: "GET /api/weather?skip=0&take=100",
        count: "GET /api/weather/count",
        byMongoId: "GET /api/weather/by-mongo-id/:mongoId",
        byStation: "GET /api/weather/by-station/:station",
        byCallLetters: "GET /api/weather/by-call-letters/:callLetters",
        byDateRange: "GET /api/weather/by-date-range?start=...&end=...",
        byTemperature: "GET /api/weather/by-temperature?min=...&max=...",
        byWindSpeed: "GET /api/weather/by-wind-speed?min=...",
        byBoundingBox:
          "GET /api/weather/by-bounding-box?minLon=...&maxLon=...&minLat=...&maxLat=...",
        bySection: "GET /api/weather/by-section/:section",
        withWaves: "GET /api/weather/with-waves",
        highWaves: "GET /api/weather/high-waves?height=...",
        stations: "GET /api/weather/stations",
        callLetters: "GET /api/weather/call-letters",
      },
      stats: {
        avgTempByStation: "GET /api/weather/stats/avg-temperature-by-station",
        countByType: "GET /api/weather/stats/count-by-type",
        avgPressureByCallLetters:
          "GET /api/weather/stats/avg-pressure-by-call-letters",
        dailySummary: "GET /api/weather/stats/daily-summary",
      },
      crud: {
        update: "PUT /api/weather/:mongoId",
        delete: "DELETE /api/weather/:mongoId",
      },
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api`);
});

export default app;
