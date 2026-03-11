const { query, close } = require('./db');

/**
 * End-to-end verification script.
 * Validates that the migration was successful by checking:
 * 1. Row counts across all tables
 * 2. Data integrity (foreign key consistency)
 * 3. Sample data spot checks
 * 4. Aggregation query correctness
 */
async function verify() {
  console.log('=== PostgreSQL Migration Verification ===\n');

  let allPassed = true;

  // ---- 1. Row count verification ----
  console.log('1. Table Row Counts:');
  const tables = [
    { name: 'weather_observations', expectedMin: 10000 },
    { name: 'atmospheric_pressure_changes', expectedMin: 8000 },
    { name: 'atmospheric_pressure_observations', expectedMin: 50 },
    { name: 'sky_condition_observations', expectedMin: 9000 },
    { name: 'wave_measurements', expectedMin: 7000 },
    { name: 'past_weather_observations', expectedMin: 9000 },
    { name: 'present_weather_observations', expectedMin: 9000 },
    { name: 'sky_cover_layers', expectedMin: 700 },
    { name: 'observation_sections', expectedMin: 10000 },
    { name: 'extreme_air_temperatures', expectedMin: 5 },
    { name: 'liquid_precipitations', expectedMin: 100 },
  ];

  for (const table of tables) {
    const result = await query(`SELECT COUNT(*) AS count FROM ${table.name}`);
    const count = parseInt(result.rows[0].count, 10);
    const passed = count >= table.expectedMin;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`   ${status}: ${table.name} = ${count} rows (expected >= ${table.expectedMin})`);
    if (!passed) allPassed = false;
  }

  // ---- 2. Foreign key integrity ----
  console.log('\n2. Foreign Key Integrity:');
  const fkChecks = [
    {
      name: 'atmospheric_pressure_changes -> weather_observations',
      sql: `SELECT COUNT(*) AS orphans FROM atmospheric_pressure_changes apc
            LEFT JOIN weather_observations wo ON apc.observation_id = wo.id
            WHERE wo.id IS NULL`,
    },
    {
      name: 'sky_condition_observations -> weather_observations',
      sql: `SELECT COUNT(*) AS orphans FROM sky_condition_observations sco
            LEFT JOIN weather_observations wo ON sco.observation_id = wo.id
            WHERE wo.id IS NULL`,
    },
    {
      name: 'wave_measurements -> weather_observations',
      sql: `SELECT COUNT(*) AS orphans FROM wave_measurements wm
            LEFT JOIN weather_observations wo ON wm.observation_id = wo.id
            WHERE wo.id IS NULL`,
    },
    {
      name: 'observation_sections -> weather_observations',
      sql: `SELECT COUNT(*) AS orphans FROM observation_sections os
            LEFT JOIN weather_observations wo ON os.observation_id = wo.id
            WHERE wo.id IS NULL`,
    },
    {
      name: 'past_weather_observations -> weather_observations',
      sql: `SELECT COUNT(*) AS orphans FROM past_weather_observations pwo
            LEFT JOIN weather_observations wo ON pwo.observation_id = wo.id
            WHERE wo.id IS NULL`,
    },
  ];

  for (const check of fkChecks) {
    const result = await query(check.sql);
    const orphans = parseInt(result.rows[0].orphans, 10);
    const passed = orphans === 0;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`   ${status}: ${check.name} (${orphans} orphaned rows)`);
    if (!passed) allPassed = false;
  }

  // ---- 3. Data spot checks ----
  console.log('\n3. Data Spot Checks:');

  // Check first document
  const firstDoc = await query(
    "SELECT * FROM weather_observations WHERE mongo_id = '5553a998e4b02cf7151190b8'"
  );
  if (firstDoc.rows.length === 1) {
    const row = firstDoc.rows[0];
    const checks = [
      { field: 'call_letters', expected: 'VCSZ', actual: row.call_letters },
      { field: 'air_temp_value', expected: -3.1, actual: parseFloat(row.air_temp_value) },
      { field: 'pressure_value', expected: 1015.3, actual: parseFloat(row.pressure_value) },
      { field: 'elevation', expected: 9999, actual: row.elevation },
      { field: 'type', expected: 'FM-13', actual: row.type },
    ];

    for (const check of checks) {
      const passed = check.expected === check.actual;
      const status = passed ? 'PASS' : 'FAIL';
      console.log(`   ${status}: First doc ${check.field} = ${check.actual} (expected ${check.expected})`);
      if (!passed) allPassed = false;
    }
  } else {
    console.log('   FAIL: Could not find first document by mongo_id');
    allPassed = false;
  }

  // Check uniqueness of mongo_ids
  const duplicates = await query(
    `SELECT mongo_id, COUNT(*) AS cnt FROM weather_observations
     GROUP BY mongo_id HAVING COUNT(*) > 1`
  );
  const dupPassed = duplicates.rows.length === 0;
  console.log(`   ${dupPassed ? 'PASS' : 'FAIL'}: No duplicate mongo_ids (${duplicates.rows.length} duplicates found)`);
  if (!dupPassed) allPassed = false;

  // ---- 4. Aggregation verification ----
  console.log('\n4. Aggregation Checks:');

  const typeCount = await query(
    'SELECT type, COUNT(*) AS count FROM weather_observations GROUP BY type ORDER BY count DESC'
  );
  console.log('   Observation types:');
  typeCount.rows.forEach((row) => {
    console.log(`     ${row.type}: ${row.count}`);
  });

  const tempStats = await query(
    `SELECT MIN(air_temp_value) AS min_temp, MAX(air_temp_value) AS max_temp,
            AVG(air_temp_value) AS avg_temp
     FROM weather_observations`
  );
  const stats = tempStats.rows[0];
  console.log(`   Temperature range: ${parseFloat(stats.min_temp).toFixed(1)} to ${parseFloat(stats.max_temp).toFixed(1)}`);
  console.log(`   Average temperature: ${parseFloat(stats.avg_temp).toFixed(2)}`);

  const stationCount = await query(
    'SELECT COUNT(DISTINCT st) AS count FROM weather_observations'
  );
  console.log(`   Distinct stations: ${stationCount.rows[0].count}`);

  const dateRange = await query(
    'SELECT MIN(ts) AS earliest, MAX(ts) AS latest FROM weather_observations'
  );
  console.log(`   Date range: ${dateRange.rows[0].earliest} to ${dateRange.rows[0].latest}`);

  // ---- 5. Join query verification ----
  console.log('\n5. Join Query Verification:');

  const joinCount = await query(
    `SELECT COUNT(*) AS count FROM weather_observations wo
     INNER JOIN wave_measurements wm ON wo.id = wm.observation_id`
  );
  console.log(`   Observations with wave measurements: ${joinCount.rows[0].count}`);

  const sectionStats = await query(
    `SELECT section_code, COUNT(*) AS count FROM observation_sections
     GROUP BY section_code ORDER BY count DESC LIMIT 5`
  );
  console.log('   Top 5 sections:');
  sectionStats.rows.forEach((row) => {
    console.log(`     ${row.section_code}: ${row.count}`);
  });

  // ---- Final Summary ----
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('ALL VERIFICATION CHECKS PASSED');
  } else {
    console.log('SOME VERIFICATION CHECKS FAILED');
    process.exitCode = 1;
  }
  console.log('='.repeat(50));

  await close();
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
