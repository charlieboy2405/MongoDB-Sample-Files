const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getClient, close } = require('./db');

/**
 * MongoDB Extended JSON value extractors.
 * Converts MongoDB extended JSON types to plain JavaScript values.
 */
function extractValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'object') return val;
  if ('$numberDouble' in val) return parseFloat(val.$numberDouble);
  if ('$numberInt' in val) return parseInt(val.$numberInt, 10);
  if ('$numberLong' in val) return parseInt(val.$numberLong, 10);
  if ('$oid' in val) return val.$oid;
  if ('$date' in val) {
    const ms = val.$date.$numberLong
      ? parseInt(val.$date.$numberLong, 10)
      : val.$date;
    return new Date(ms);
  }
  return val;
}

/**
 * Safely extract a nested value from a MongoDB document.
 */
function getNestedValue(doc, ...keys) {
  let current = doc;
  for (const key of keys) {
    if (current === null || current === undefined) return null;
    current = current[key];
  }
  return extractValue(current);
}

/**
 * Parse a single MongoDB document and return structured data for all tables.
 */
function parseDocument(doc) {
  const mongoId = extractValue(doc._id);
  const ts = extractValue(doc.ts);

  // Position: extract coordinates from GeoJSON
  let longitude = null;
  let latitude = null;
  if (doc.position && doc.position.coordinates) {
    longitude = extractValue(doc.position.coordinates[0]);
    latitude = extractValue(doc.position.coordinates[1]);
  }

  const mainRow = {
    mongo_id: mongoId,
    st: doc.st,
    ts: ts,
    call_letters: doc.callLetters,
    quality_control_process: doc.qualityControlProcess,
    data_source: doc.dataSource,
    type: doc.type,
    longitude,
    latitude,
    elevation: getNestedValue(doc, 'elevation'),
    air_temp_value: getNestedValue(doc, 'airTemperature', 'value'),
    air_temp_quality: doc.airTemperature.quality,
    dew_point_value: getNestedValue(doc, 'dewPoint', 'value'),
    dew_point_quality: doc.dewPoint.quality,
    pressure_value: getNestedValue(doc, 'pressure', 'value'),
    pressure_quality: doc.pressure.quality,
    wind_direction_angle: getNestedValue(doc, 'wind', 'direction', 'angle'),
    wind_direction_quality: doc.wind.direction.quality,
    wind_type: doc.wind.type,
    wind_speed_rate: getNestedValue(doc, 'wind', 'speed', 'rate'),
    wind_speed_quality: doc.wind.speed.quality,
    visibility_distance_value: getNestedValue(doc, 'visibility', 'distance', 'value'),
    visibility_distance_quality: doc.visibility.distance.quality,
    visibility_variability_value: doc.visibility.variability.value,
    visibility_variability_quality: doc.visibility.variability.quality,
    sky_condition_ceiling_height_value: getNestedValue(doc, 'skyCondition', 'ceilingHeight', 'value'),
    sky_condition_ceiling_height_quality: doc.skyCondition.ceilingHeight.quality,
    sky_condition_ceiling_height_determination: doc.skyCondition.ceilingHeight.determination,
    sky_condition_cavok: doc.skyCondition.cavok,
    precip_est_discrepancy: doc.precipitationEstimatedObservation.discrepancy,
    precip_est_water_depth: getNestedValue(doc, 'precipitationEstimatedObservation', 'estimatedWaterDepth'),
    sea_surface_temp_value: doc.seaSurfaceTemperature
      ? getNestedValue(doc, 'seaSurfaceTemperature', 'value')
      : null,
    sea_surface_temp_quality: doc.seaSurfaceTemperature
      ? doc.seaSurfaceTemperature.quality
      : null,
  };

  // Atmospheric Pressure Change (84.3%)
  let atmosphericPressureChange = null;
  if (doc.atmosphericPressureChange) {
    const apc = doc.atmosphericPressureChange;
    atmosphericPressureChange = {
      tendency_code: apc.tendency.code,
      tendency_quality: apc.tendency.quality,
      quantity_3hours_value: getNestedValue(apc, 'quantity3Hours', 'value'),
      quantity_3hours_quality: apc.quantity3Hours.quality,
      quantity_24hours_value: getNestedValue(apc, 'quantity24Hours', 'value'),
      quantity_24hours_quality: apc.quantity24Hours.quality,
    };
  }

  // Atmospheric Pressure Observation (0.6%)
  let atmosphericPressureObservation = null;
  if (doc.atmosphericPressureObservation) {
    const apo = doc.atmosphericPressureObservation;
    atmosphericPressureObservation = {
      altimeter_setting_value: getNestedValue(apo, 'altimeterSetting', 'value'),
      altimeter_setting_quality: apo.altimeterSetting.quality,
      station_pressure_value: getNestedValue(apo, 'stationPressure', 'value'),
      station_pressure_quality: apo.stationPressure.quality,
    };
  }

  // Sky Condition Observation (94.4%)
  let skyConditionObservation = null;
  if (doc.skyConditionObservation) {
    const sco = doc.skyConditionObservation;
    skyConditionObservation = {
      total_coverage_value: sco.totalCoverage.value,
      total_coverage_opaque: sco.totalCoverage.opaque,
      total_coverage_quality: sco.totalCoverage.quality,
      lowest_cloud_coverage_value: sco.lowestCloudCoverage.value,
      lowest_cloud_coverage_quality: sco.lowestCloudCoverage.quality,
      low_cloud_genus_value: sco.lowCloudGenus.value,
      low_cloud_genus_quality: sco.lowCloudGenus.quality,
      lowest_cloud_base_height_value: getNestedValue(sco, 'lowestCloudBaseHeight', 'value'),
      lowest_cloud_base_height_quality: sco.lowestCloudBaseHeight.quality,
      mid_cloud_genus_value: sco.midCloudGenus.value,
      mid_cloud_genus_quality: sco.midCloudGenus.quality,
      high_cloud_genus_value: sco.highCloudGenus.value,
      high_cloud_genus_quality: sco.highCloudGenus.quality,
    };
  }

  // Wave Measurement (75.5%)
  let waveMeasurement = null;
  if (doc.waveMeasurement) {
    const wm = doc.waveMeasurement;
    waveMeasurement = {
      method: wm.method,
      waves_period: getNestedValue(wm, 'waves', 'period'),
      waves_height: getNestedValue(wm, 'waves', 'height'),
      waves_quality: wm.waves.quality,
      sea_state_code: wm.seaState.code,
      sea_state_quality: wm.seaState.quality,
    };
  }

  // Past Weather Observations (90.4%, array)
  const pastWeatherObservations = (doc.pastWeatherObservationManual || []).map((obs) => ({
    atmospheric_condition_value: obs.atmosphericCondition.value,
    atmospheric_condition_quality: obs.atmosphericCondition.quality,
    period_value: getNestedValue(obs, 'period', 'value'),
    period_quality: obs.period.quality,
  }));

  // Present Weather Observations (91.1%, array)
  const presentWeatherObservations = (doc.presentWeatherObservationManual || []).map((obs) => ({
    condition: obs.condition,
    quality: obs.quality,
  }));

  // Sky Cover Layers (7.4%, array)
  const skyCoverLayers = (doc.skyCoverLayer || []).map((layer) => ({
    coverage_value: layer.coverage.value,
    coverage_quality: layer.coverage.quality,
    base_height_value: getNestedValue(layer, 'baseHeight', 'value'),
    base_height_quality: layer.baseHeight.quality,
    cloud_type_value: layer.cloudType.value,
    cloud_type_quality: layer.cloudType.quality,
  }));

  // Sections (100%, array of strings)
  const sections = doc.sections || [];

  // Extreme Air Temperatures (0.1%, array)
  const extremeAirTemperatures = (doc.extremeAirTemperature || []).map((eat) => ({
    period: getNestedValue(eat, 'period'),
    code: eat.code,
    value: getNestedValue(eat, 'value'),
    quantity: eat.quantity,
  }));

  // Liquid Precipitations (1.1%, array)
  const liquidPrecipitations = (doc.liquidPrecipitation || []).map((lp) => ({
    period: getNestedValue(lp, 'period'),
    depth: getNestedValue(lp, 'depth'),
    condition: lp.condition,
    quality: lp.quality,
  }));

  return {
    mainRow,
    atmosphericPressureChange,
    atmosphericPressureObservation,
    skyConditionObservation,
    waveMeasurement,
    pastWeatherObservations,
    presentWeatherObservations,
    skyCoverLayers,
    sections,
    extremeAirTemperatures,
    liquidPrecipitations,
  };
}

/**
 * Insert a parsed document into all related PostgreSQL tables within a transaction.
 */
async function insertDocument(client, parsed) {
  const { mainRow } = parsed;

  // Insert main observation
  const mainResult = await client.query(
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
      mainRow.mongo_id, mainRow.st, mainRow.ts, mainRow.call_letters,
      mainRow.quality_control_process, mainRow.data_source, mainRow.type,
      mainRow.longitude, mainRow.latitude, mainRow.elevation,
      mainRow.air_temp_value, mainRow.air_temp_quality,
      mainRow.dew_point_value, mainRow.dew_point_quality,
      mainRow.pressure_value, mainRow.pressure_quality,
      mainRow.wind_direction_angle, mainRow.wind_direction_quality,
      mainRow.wind_type, mainRow.wind_speed_rate, mainRow.wind_speed_quality,
      mainRow.visibility_distance_value, mainRow.visibility_distance_quality,
      mainRow.visibility_variability_value, mainRow.visibility_variability_quality,
      mainRow.sky_condition_ceiling_height_value, mainRow.sky_condition_ceiling_height_quality,
      mainRow.sky_condition_ceiling_height_determination, mainRow.sky_condition_cavok,
      mainRow.precip_est_discrepancy, mainRow.precip_est_water_depth,
      mainRow.sea_surface_temp_value, mainRow.sea_surface_temp_quality,
    ]
  );

  const observationId = mainResult.rows[0].id;

  // Atmospheric Pressure Change
  if (parsed.atmosphericPressureChange) {
    const apc = parsed.atmosphericPressureChange;
    await client.query(
      `INSERT INTO atmospheric_pressure_changes (
        observation_id, tendency_code, tendency_quality,
        quantity_3hours_value, quantity_3hours_quality,
        quantity_24hours_value, quantity_24hours_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        observationId, apc.tendency_code, apc.tendency_quality,
        apc.quantity_3hours_value, apc.quantity_3hours_quality,
        apc.quantity_24hours_value, apc.quantity_24hours_quality,
      ]
    );
  }

  // Atmospheric Pressure Observation
  if (parsed.atmosphericPressureObservation) {
    const apo = parsed.atmosphericPressureObservation;
    await client.query(
      `INSERT INTO atmospheric_pressure_observations (
        observation_id, altimeter_setting_value, altimeter_setting_quality,
        station_pressure_value, station_pressure_quality
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        observationId, apo.altimeter_setting_value, apo.altimeter_setting_quality,
        apo.station_pressure_value, apo.station_pressure_quality,
      ]
    );
  }

  // Sky Condition Observation
  if (parsed.skyConditionObservation) {
    const sco = parsed.skyConditionObservation;
    await client.query(
      `INSERT INTO sky_condition_observations (
        observation_id,
        total_coverage_value, total_coverage_opaque, total_coverage_quality,
        lowest_cloud_coverage_value, lowest_cloud_coverage_quality,
        low_cloud_genus_value, low_cloud_genus_quality,
        lowest_cloud_base_height_value, lowest_cloud_base_height_quality,
        mid_cloud_genus_value, mid_cloud_genus_quality,
        high_cloud_genus_value, high_cloud_genus_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        observationId,
        sco.total_coverage_value, sco.total_coverage_opaque, sco.total_coverage_quality,
        sco.lowest_cloud_coverage_value, sco.lowest_cloud_coverage_quality,
        sco.low_cloud_genus_value, sco.low_cloud_genus_quality,
        sco.lowest_cloud_base_height_value, sco.lowest_cloud_base_height_quality,
        sco.mid_cloud_genus_value, sco.mid_cloud_genus_quality,
        sco.high_cloud_genus_value, sco.high_cloud_genus_quality,
      ]
    );
  }

  // Wave Measurement
  if (parsed.waveMeasurement) {
    const wm = parsed.waveMeasurement;
    await client.query(
      `INSERT INTO wave_measurements (
        observation_id, method, waves_period, waves_height, waves_quality,
        sea_state_code, sea_state_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        observationId, wm.method, wm.waves_period, wm.waves_height,
        wm.waves_quality, wm.sea_state_code, wm.sea_state_quality,
      ]
    );
  }

  // Past Weather Observations
  for (const pwo of parsed.pastWeatherObservations) {
    await client.query(
      `INSERT INTO past_weather_observations (
        observation_id, atmospheric_condition_value, atmospheric_condition_quality,
        period_value, period_quality
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        observationId, pwo.atmospheric_condition_value, pwo.atmospheric_condition_quality,
        pwo.period_value, pwo.period_quality,
      ]
    );
  }

  // Present Weather Observations
  for (const pwo of parsed.presentWeatherObservations) {
    await client.query(
      `INSERT INTO present_weather_observations (
        observation_id, condition, quality
      ) VALUES ($1, $2, $3)`,
      [observationId, pwo.condition, pwo.quality]
    );
  }

  // Sky Cover Layers
  for (const scl of parsed.skyCoverLayers) {
    await client.query(
      `INSERT INTO sky_cover_layers (
        observation_id, coverage_value, coverage_quality,
        base_height_value, base_height_quality,
        cloud_type_value, cloud_type_quality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        observationId, scl.coverage_value, scl.coverage_quality,
        scl.base_height_value, scl.base_height_quality,
        scl.cloud_type_value, scl.cloud_type_quality,
      ]
    );
  }

  // Sections
  for (const sectionCode of parsed.sections) {
    await client.query(
      'INSERT INTO observation_sections (observation_id, section_code) VALUES ($1, $2)',
      [observationId, sectionCode]
    );
  }

  // Extreme Air Temperatures
  for (const eat of parsed.extremeAirTemperatures) {
    await client.query(
      `INSERT INTO extreme_air_temperatures (
        observation_id, period, code, value, quantity
      ) VALUES ($1, $2, $3, $4, $5)`,
      [observationId, eat.period, eat.code, eat.value, eat.quantity]
    );
  }

  // Liquid Precipitations
  for (const lp of parsed.liquidPrecipitations) {
    await client.query(
      `INSERT INTO liquid_precipitations (
        observation_id, period, depth, condition, quality
      ) VALUES ($1, $2, $3, $4, $5)`,
      [observationId, lp.period, lp.depth, lp.condition, lp.quality]
    );
  }

  return observationId;
}

/**
 * Main migration function.
 * Reads the MongoDB JSON file line-by-line and inserts each document
 * into PostgreSQL tables using batched transactions.
 */
async function migrateData() {
  const dataPath = process.env.MONGO_DATA_PATH
    || path.join(__dirname, '../../MongoDB/mongo-sample-weather.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found: ${dataPath}`);
    console.error('Set MONGO_DATA_PATH environment variable to the correct path.');
    process.exit(1);
  }

  console.log(`Migrating data from: ${dataPath}`);
  console.log('Starting migration...\n');

  const BATCH_SIZE = 100;
  let totalProcessed = 0;
  let totalErrors = 0;
  let batch = [];
  const startTime = Date.now();

  const fileStream = fs.createReadStream(dataPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const doc = JSON.parse(line);
      const parsed = parseDocument(doc);
      batch.push(parsed);

      if (batch.length >= BATCH_SIZE) {
        await processBatch(batch);
        totalProcessed += batch.length;
        batch = [];

        if (totalProcessed % 1000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  Processed ${totalProcessed} documents (${elapsed}s elapsed)`);
        }
      }
    } catch (err) {
      totalErrors++;
      console.error(`Error processing document: ${err.message}`);
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    await processBatch(batch);
    totalProcessed += batch.length;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\nMigration complete!');
  console.log(`  Total documents migrated: ${totalProcessed}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`  Time elapsed: ${totalTime}s`);
  console.log(`  Rate: ${(totalProcessed / (parseFloat(totalTime) || 1)).toFixed(0)} docs/sec`);

  await close();
}

/**
 * Process a batch of parsed documents within a single transaction.
 */
async function processBatch(batch) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (const parsed of batch) {
      await insertDocument(client, parsed);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

migrateData().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
