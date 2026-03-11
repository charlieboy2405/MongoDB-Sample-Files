const queries = require('./queries');
const { close } = require('./db');

/**
 * Demonstrates all CRUD query operations against the migrated PostgreSQL database.
 * This script serves as a usage guide showing how to replace MongoDB queries
 * with their PostgreSQL equivalents.
 */
async function demo() {
  console.log('=== PostgreSQL Query Demos ===\n');

  // ---- READ Operations ----
  console.log('--- READ Operations ---\n');

  // 1. Find by MongoDB ObjectId
  console.log('1. Find by original MongoDB ObjectId:');
  const byMongoId = await queries.findByMongoId('5553a998e4b02cf7151190b8');
  if (byMongoId) {
    console.log(`   Found: station=${byMongoId.st}, temp=${byMongoId.air_temp_value}, letters=${byMongoId.call_letters}`);
  }

  // 2. Find by call letters
  console.log('\n2. Find by call letters (PLAT):');
  const byLetters = await queries.findByCallLetters('PLAT', 3);
  console.log(`   Found ${byLetters.length} observations`);
  byLetters.forEach((r) => {
    console.log(`   - ts=${r.ts}, temp=${r.air_temp_value}, pressure=${r.pressure_value}`);
  });

  // 3. Find by time range
  console.log('\n3. Find by time range:');
  const byTime = await queries.findByTimeRange(
    new Date('1984-03-05T00:00:00Z'),
    new Date('1984-03-06T00:00:00Z'),
    5
  );
  console.log(`   Found ${byTime.length} observations in range`);
  byTime.forEach((r) => {
    console.log(`   - ts=${r.ts}, station=${r.st}, temp=${r.air_temp_value}`);
  });

  // 4. Find by temperature range
  console.log('\n4. Find observations with extreme cold (< -30C):');
  const coldObs = await queries.findByTemperatureRange(-100, -30, 5);
  console.log(`   Found ${coldObs.length} observations`);
  coldObs.forEach((r) => {
    console.log(`   - station=${r.st}, temp=${r.air_temp_value}, letters=${r.call_letters}`);
  });

  // 5. Find by geographic bounding box
  console.log('\n5. Find by geographic bounding box (North Atlantic):');
  const geoObs = await queries.findByBoundingBox(-60, 40, -10, 70, 5);
  console.log(`   Found ${geoObs.length} observations`);
  geoObs.forEach((r) => {
    console.log(`   - lon=${r.longitude}, lat=${r.latitude}, temp=${r.air_temp_value}`);
  });

  // 6. Full observation with all joins
  console.log('\n6. Full observation with all related data (ID=1):');
  const full = await queries.findFullObservation(1);
  if (full) {
    console.log(`   Station: ${full.st}`);
    console.log(`   Sections: [${full.sections.join(', ')}]`);
    console.log(`   Has pressure change: ${full.atmosphericPressureChange ? 'yes' : 'no'}`);
    console.log(`   Has wave measurement: ${full.waveMeasurement ? 'yes' : 'no'}`);
    console.log(`   Sky cover layers: ${full.skyCoverLayers.length}`);
  }

  // 7. Aggregations
  console.log('\n7. Average temperature by station (top 5):');
  const avgTemps = await queries.avgTemperatureByStation(5);
  avgTemps.forEach((r) => {
    console.log(`   - ${r.st}: avg=${parseFloat(r.avg_temp).toFixed(2)}C (${r.observation_count} obs)`);
  });

  console.log('\n8. Count by type:');
  const typeCounts = await queries.countByType();
  typeCounts.forEach((r) => {
    console.log(`   - ${r.type}: ${r.count}`);
  });

  console.log('\n9. Wind speed stats by call letters (top 5):');
  const windStats = await queries.windSpeedStatsByCallLetters(5);
  windStats.forEach((r) => {
    console.log(`   - ${r.call_letters}: avg=${parseFloat(r.avg_speed).toFixed(1)}, max=${parseFloat(r.max_speed).toFixed(1)} (${r.observation_count} obs)`);
  });

  console.log('\n10. Observations with wave data (top 3 by height):');
  const waveObs = await queries.findObservationsWithWaves(3);
  waveObs.forEach((r) => {
    console.log(`   - station=${r.st}, wave_height=${r.waves_height}, method=${r.method}`);
  });

  console.log('\n11. Monthly observation counts (first 3):');
  const monthly = await queries.monthlyObservationCounts();
  monthly.slice(0, 3).forEach((r) => {
    console.log(`   - ${r.month}: ${r.observation_count} obs, avg_temp=${parseFloat(r.avg_temp).toFixed(2)}C`);
  });

  // ---- UPDATE Operations ----
  console.log('\n--- UPDATE Operations ---\n');

  console.log('12. Update air temperature for observation 1:');
  const updated = await queries.updateAirTemperature(1, -5.5, '1');
  console.log(`   Updated: ${updated}`);
  const afterUpdate = await queries.findById(1);
  console.log(`   New temp: ${afterUpdate.air_temp_value}`);

  // Restore original value
  await queries.updateAirTemperature(1, -3.1, '1');
  console.log('   (Restored original value)');

  // ---- CREATE Operations ----
  console.log('\n--- CREATE Operations ---\n');

  console.log('13. Create a new observation:');
  const newId = await queries.createObservation({
    mongo_id: 'demo_test_000000000001',
    st: 'x+00000+000000',
    ts: new Date('2024-01-01T00:00:00Z'),
    call_letters: 'DEMO',
    quality_control_process: 'V020',
    data_source: '4',
    type: 'FM-13',
    longitude: 0.0,
    latitude: 0.0,
    elevation: 100,
    air_temp_value: 20.0,
    air_temp_quality: '1',
    dew_point_value: 15.0,
    dew_point_quality: '1',
    pressure_value: 1013.25,
    pressure_quality: '1',
    wind_direction_angle: 180,
    wind_direction_quality: '1',
    wind_type: 'N',
    wind_speed_rate: 5.0,
    wind_speed_quality: '1',
    visibility_distance_value: 10000,
    visibility_distance_quality: '1',
    visibility_variability_value: 'N',
    visibility_variability_quality: '1',
    sky_condition_ceiling_height_value: 5000,
    sky_condition_ceiling_height_quality: '1',
    sky_condition_ceiling_height_determination: 'C',
    sky_condition_cavok: 'Y',
    precip_est_discrepancy: '0',
    precip_est_water_depth: 0,
    sea_surface_temp_value: null,
    sea_surface_temp_quality: null,
  });
  console.log(`   Created observation with ID: ${newId}`);

  await queries.addSections(newId, ['AG1', 'MD1']);
  console.log('   Added 2 sections');

  // ---- DELETE Operations ----
  console.log('\n--- DELETE Operations ---\n');

  console.log('14. Delete the demo observation:');
  const deleted = await queries.deleteObservation(newId);
  console.log(`   Deleted: ${deleted}`);

  console.log('\n=== Demo Complete ===');
  await close();
}

demo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
