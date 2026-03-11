const { query } = require('./db');

// ============================================================================
// CRUD Operations for PostgreSQL Weather Database
// These functions replace the MongoDB query layer with equivalent PostgreSQL
// queries using parameterized statements for security.
// ============================================================================

// ============================================================================
// CREATE Operations
// ============================================================================

/**
 * Insert a new weather observation with all related data.
 * Equivalent to MongoDB: db.weather.insertOne(doc)
 *
 * @param {object} data - Observation data object
 * @returns {Promise<number>} The inserted observation ID
 */
async function createObservation(data) {
  const result = await query(
    `INSERT INTO weather_observations (
      mongo_id, st, ts, call_letters, quality_control_process, data_source, type,
      longitude, latitude, elevation,
      air_temp_value, air_temp_quality,
      dew_point_value, dew_point_quality,
      pressure_value, pressure_quality,
      wind_direction_angle, wind_direction_quality, wind_type, wind_speed_rate, wind_speed_quality,
      visibility_distance_value, visibility_distance_quality,
      visibility_variability_value, visibility_variability_quality,
      sky_condition_ceiling_height_value, sky_condition_ceiling_height_quality,
      sky_condition_ceiling_height_determination, sky_condition_cavok,
      precip_est_discrepancy, precip_est_water_depth,
      sea_surface_temp_value, sea_surface_temp_quality
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33
    ) RETURNING id`,
    [
      data.mongo_id, data.st, data.ts, data.call_letters,
      data.quality_control_process, data.data_source, data.type,
      data.longitude, data.latitude, data.elevation,
      data.air_temp_value, data.air_temp_quality,
      data.dew_point_value, data.dew_point_quality,
      data.pressure_value, data.pressure_quality,
      data.wind_direction_angle, data.wind_direction_quality,
      data.wind_type, data.wind_speed_rate, data.wind_speed_quality,
      data.visibility_distance_value, data.visibility_distance_quality,
      data.visibility_variability_value, data.visibility_variability_quality,
      data.sky_condition_ceiling_height_value, data.sky_condition_ceiling_height_quality,
      data.sky_condition_ceiling_height_determination, data.sky_condition_cavok,
      data.precip_est_discrepancy, data.precip_est_water_depth,
      data.sea_surface_temp_value, data.sea_surface_temp_quality,
    ]
  );
  return result.rows[0].id;
}

/**
 * Add sections to an observation.
 * Equivalent to MongoDB: embedded array push
 *
 * @param {number} observationId
 * @param {string[]} sectionCodes
 */
async function addSections(observationId, sectionCodes) {
  for (const code of sectionCodes) {
    await query(
      'INSERT INTO observation_sections (observation_id, section_code) VALUES ($1, $2)',
      [observationId, code]
    );
  }
}

/**
 * Add a sky cover layer to an observation.
 *
 * @param {number} observationId
 * @param {object} layer
 */
async function addSkyCoverLayer(observationId, layer) {
  await query(
    `INSERT INTO sky_cover_layers (
      observation_id, coverage_value, coverage_quality,
      base_height_value, base_height_quality,
      cloud_type_value, cloud_type_quality
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      observationId, layer.coverage_value, layer.coverage_quality,
      layer.base_height_value, layer.base_height_quality,
      layer.cloud_type_value, layer.cloud_type_quality,
    ]
  );
}

// ============================================================================
// READ Operations
// ============================================================================

/**
 * Find an observation by its original MongoDB ObjectId.
 * Equivalent to MongoDB: db.weather.findOne({ _id: ObjectId(mongoId) })
 *
 * @param {string} mongoId - Original MongoDB ObjectId string
 * @returns {Promise<object|null>}
 */
async function findByMongoId(mongoId) {
  const result = await query(
    'SELECT * FROM weather_observations WHERE mongo_id = $1',
    [mongoId]
  );
  return result.rows[0] || null;
}

/**
 * Find an observation by its PostgreSQL ID.
 *
 * @param {number} id - PostgreSQL observation ID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const result = await query(
    'SELECT * FROM weather_observations WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Find observations by station identifier.
 * Equivalent to MongoDB: db.weather.find({ st: stationId })
 *
 * @param {string} stationId
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
async function findByStation(stationId, limit = 100, offset = 0) {
  const result = await query(
    'SELECT * FROM weather_observations WHERE st = $1 ORDER BY ts DESC LIMIT $2 OFFSET $3',
    [stationId, limit, offset]
  );
  return result.rows;
}

/**
 * Find observations by call letters.
 * Equivalent to MongoDB: db.weather.find({ callLetters: letters })
 *
 * @param {string} callLetters
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
async function findByCallLetters(callLetters, limit = 100, offset = 0) {
  const result = await query(
    'SELECT * FROM weather_observations WHERE call_letters = $1 ORDER BY ts DESC LIMIT $2 OFFSET $3',
    [callLetters, limit, offset]
  );
  return result.rows;
}

/**
 * Find observations within a time range.
 * Equivalent to MongoDB: db.weather.find({ ts: { $gte: start, $lte: end } })
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<object[]>}
 */
async function findByTimeRange(startDate, endDate, limit = 100, offset = 0) {
  const result = await query(
    'SELECT * FROM weather_observations WHERE ts >= $1 AND ts <= $2 ORDER BY ts ASC LIMIT $3 OFFSET $4',
    [startDate, endDate, limit, offset]
  );
  return result.rows;
}

/**
 * Find observations within a geographic bounding box.
 * Equivalent to MongoDB: db.weather.find({ position: { $geoWithin: { $box: [...] } } })
 *
 * @param {number} minLon
 * @param {number} minLat
 * @param {number} maxLon
 * @param {number} maxLat
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function findByBoundingBox(minLon, minLat, maxLon, maxLat, limit = 100) {
  const result = await query(
    `SELECT * FROM weather_observations
     WHERE longitude >= $1 AND longitude <= $3
       AND latitude >= $2 AND latitude <= $4
     ORDER BY ts DESC LIMIT $5`,
    [minLon, minLat, maxLon, maxLat, limit]
  );
  return result.rows;
}

/**
 * Find observations with air temperature in a specific range.
 * Equivalent to MongoDB: db.weather.find({ "airTemperature.value": { $gte: min, $lte: max } })
 *
 * @param {number} minTemp
 * @param {number} maxTemp
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function findByTemperatureRange(minTemp, maxTemp, limit = 100) {
  const result = await query(
    `SELECT * FROM weather_observations
     WHERE air_temp_value >= $1 AND air_temp_value <= $2
     ORDER BY air_temp_value ASC LIMIT $3`,
    [minTemp, maxTemp, limit]
  );
  return result.rows;
}

/**
 * Get a full observation with all related data (joins).
 * Equivalent to MongoDB: db.weather.findOne({ _id: id }) with all embedded docs
 *
 * @param {number} id - PostgreSQL observation ID
 * @returns {Promise<object|null>}
 */
async function findFullObservation(id) {
  const obs = await findById(id);
  if (!obs) return null;

  const [
    sections,
    pressureChange,
    pressureObs,
    skyCondObs,
    waveMeas,
    pastWeather,
    presentWeather,
    skyCoverLayers,
    extremeTemps,
    liquidPrecip,
  ] = await Promise.all([
    query('SELECT section_code FROM observation_sections WHERE observation_id = $1', [id]),
    query('SELECT * FROM atmospheric_pressure_changes WHERE observation_id = $1', [id]),
    query('SELECT * FROM atmospheric_pressure_observations WHERE observation_id = $1', [id]),
    query('SELECT * FROM sky_condition_observations WHERE observation_id = $1', [id]),
    query('SELECT * FROM wave_measurements WHERE observation_id = $1', [id]),
    query('SELECT * FROM past_weather_observations WHERE observation_id = $1', [id]),
    query('SELECT * FROM present_weather_observations WHERE observation_id = $1', [id]),
    query('SELECT * FROM sky_cover_layers WHERE observation_id = $1', [id]),
    query('SELECT * FROM extreme_air_temperatures WHERE observation_id = $1', [id]),
    query('SELECT * FROM liquid_precipitations WHERE observation_id = $1', [id]),
  ]);

  return {
    ...obs,
    sections: sections.rows.map((r) => r.section_code),
    atmosphericPressureChange: pressureChange.rows[0] || null,
    atmosphericPressureObservation: pressureObs.rows[0] || null,
    skyConditionObservation: skyCondObs.rows[0] || null,
    waveMeasurement: waveMeas.rows[0] || null,
    pastWeatherObservations: pastWeather.rows,
    presentWeatherObservations: presentWeather.rows,
    skyCoverLayers: skyCoverLayers.rows,
    extremeAirTemperatures: extremeTemps.rows,
    liquidPrecipitations: liquidPrecip.rows,
  };
}

/**
 * Aggregate: average air temperature by station.
 * Equivalent to MongoDB:
 *   db.weather.aggregate([
 *     { $group: { _id: "$st", avgTemp: { $avg: "$airTemperature.value" } } }
 *   ])
 *
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function avgTemperatureByStation(limit = 50) {
  const result = await query(
    `SELECT st, AVG(air_temp_value) AS avg_temp, COUNT(*) AS observation_count
     FROM weather_observations
     GROUP BY st
     ORDER BY avg_temp DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Aggregate: count observations by type.
 * Equivalent to MongoDB:
 *   db.weather.aggregate([
 *     { $group: { _id: "$type", count: { $sum: 1 } } }
 *   ])
 *
 * @returns {Promise<object[]>}
 */
async function countByType() {
  const result = await query(
    `SELECT type, COUNT(*) AS count
     FROM weather_observations
     GROUP BY type
     ORDER BY count DESC`
  );
  return result.rows;
}

/**
 * Aggregate: wind speed statistics by call letters.
 *
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function windSpeedStatsByCallLetters(limit = 20) {
  const result = await query(
    `SELECT call_letters,
            AVG(wind_speed_rate) AS avg_speed,
            MIN(wind_speed_rate) AS min_speed,
            MAX(wind_speed_rate) AS max_speed,
            COUNT(*) AS observation_count
     FROM weather_observations
     GROUP BY call_letters
     ORDER BY avg_speed DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Find observations with wave measurements (JOIN query).
 * Equivalent to MongoDB: db.weather.find({ waveMeasurement: { $exists: true } })
 *
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function findObservationsWithWaves(limit = 100) {
  const result = await query(
    `SELECT wo.*, wm.method, wm.waves_period, wm.waves_height, wm.waves_quality
     FROM weather_observations wo
     INNER JOIN wave_measurements wm ON wo.id = wm.observation_id
     ORDER BY wm.waves_height DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Aggregate: monthly observation counts.
 *
 * @returns {Promise<object[]>}
 */
async function monthlyObservationCounts() {
  const result = await query(
    `SELECT DATE_TRUNC('month', ts) AS month,
            COUNT(*) AS observation_count,
            AVG(air_temp_value) AS avg_temp,
            AVG(pressure_value) AS avg_pressure
     FROM weather_observations
     GROUP BY DATE_TRUNC('month', ts)
     ORDER BY month ASC`
  );
  return result.rows;
}

// ============================================================================
// UPDATE Operations
// ============================================================================

/**
 * Update air temperature for an observation.
 * Equivalent to MongoDB: db.weather.updateOne(
 *   { _id: id },
 *   { $set: { "airTemperature.value": value, "airTemperature.quality": quality } }
 * )
 *
 * @param {number} id
 * @param {number} value
 * @param {string} quality
 * @returns {Promise<boolean>}
 */
async function updateAirTemperature(id, value, qualityCode) {
  const result = await query(
    `UPDATE weather_observations
     SET air_temp_value = $2, air_temp_quality = $3
     WHERE id = $1`,
    [id, value, qualityCode]
  );
  return result.rowCount > 0;
}

/**
 * Update wind data for an observation.
 * Equivalent to MongoDB: db.weather.updateOne(
 *   { _id: id },
 *   { $set: { "wind.direction.angle": angle, ... } }
 * )
 *
 * @param {number} id
 * @param {object} windData
 * @returns {Promise<boolean>}
 */
async function updateWind(id, windData) {
  const result = await query(
    `UPDATE weather_observations
     SET wind_direction_angle = $2, wind_direction_quality = $3,
         wind_type = $4, wind_speed_rate = $5, wind_speed_quality = $6
     WHERE id = $1`,
    [
      id, windData.direction_angle, windData.direction_quality,
      windData.type, windData.speed_rate, windData.speed_quality,
    ]
  );
  return result.rowCount > 0;
}

/**
 * Update pressure for an observation.
 *
 * @param {number} id
 * @param {number} value
 * @param {string} quality
 * @returns {Promise<boolean>}
 */
async function updatePressure(id, value, qualityCode) {
  const result = await query(
    'UPDATE weather_observations SET pressure_value = $2, pressure_quality = $3 WHERE id = $1',
    [id, value, qualityCode]
  );
  return result.rowCount > 0;
}

/**
 * Bulk update: set quality flag for observations in a time range.
 * Equivalent to MongoDB: db.weather.updateMany(
 *   { ts: { $gte: start, $lte: end } },
 *   { $set: { "airTemperature.quality": quality } }
 * )
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} quality
 * @returns {Promise<number>} Number of updated rows
 */
async function bulkUpdateAirTempQuality(startDate, endDate, qualityCode) {
  const result = await query(
    'UPDATE weather_observations SET air_temp_quality = $3 WHERE ts >= $1 AND ts <= $2',
    [startDate, endDate, qualityCode]
  );
  return result.rowCount;
}

// ============================================================================
// DELETE Operations
// ============================================================================

/**
 * Delete an observation and all related records (cascading).
 * Equivalent to MongoDB: db.weather.deleteOne({ _id: id })
 *
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteObservation(id) {
  const result = await query(
    'DELETE FROM weather_observations WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
}

/**
 * Delete observations by station.
 * Equivalent to MongoDB: db.weather.deleteMany({ st: stationId })
 *
 * @param {string} stationId
 * @returns {Promise<number>} Number of deleted rows
 */
async function deleteByStation(stationId) {
  const result = await query(
    'DELETE FROM weather_observations WHERE st = $1',
    [stationId]
  );
  return result.rowCount;
}

/**
 * Delete observations older than a specific date.
 *
 * @param {Date} beforeDate
 * @returns {Promise<number>} Number of deleted rows
 */
async function deleteOlderThan(beforeDate) {
  const result = await query(
    'DELETE FROM weather_observations WHERE ts < $1',
    [beforeDate]
  );
  return result.rowCount;
}

/**
 * Delete specific sections from an observation.
 *
 * @param {number} observationId
 * @param {string} sectionCode
 * @returns {Promise<boolean>}
 */
async function deleteSection(observationId, sectionCode) {
  const result = await query(
    'DELETE FROM observation_sections WHERE observation_id = $1 AND section_code = $2',
    [observationId, sectionCode]
  );
  return result.rowCount > 0;
}

module.exports = {
  // Create
  createObservation,
  addSections,
  addSkyCoverLayer,
  // Read
  findByMongoId,
  findById,
  findByStation,
  findByCallLetters,
  findByTimeRange,
  findByBoundingBox,
  findByTemperatureRange,
  findFullObservation,
  avgTemperatureByStation,
  countByType,
  windSpeedStatsByCallLetters,
  findObservationsWithWaves,
  monthlyObservationCounts,
  // Update
  updateAirTemperature,
  updateWind,
  updatePressure,
  bulkUpdateAirTempQuality,
  // Delete
  deleteObservation,
  deleteByStation,
  deleteOlderThan,
  deleteSection,
};
