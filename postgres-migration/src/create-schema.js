const fs = require('fs');
const path = require('path');
const { query, close } = require('./db');

/**
 * Creates all PostgreSQL tables by executing schema.sql.
 * This script drops existing tables and recreates them.
 */
async function createSchema() {
  console.log('Creating PostgreSQL schema...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await query(schemaSql);
    console.log('Schema created successfully.');

    // Verify tables were created
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\nCreated ${result.rows.length} tables:`);
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (err) {
    console.error('Failed to create schema:', err.message);
    process.exit(1);
  } finally {
    await close();
  }
}

createSchema();
