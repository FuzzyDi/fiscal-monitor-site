const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fiscal_monitor'
});

async function testDB() {
  try {
    // Check registrations
    const registrations = await pool.query('SELECT shop_inn, title FROM registrations LIMIT 5');
    console.log('\n=== Registrations ===');
    console.log(registrations.rows);

    // Check tokens
    const tokens = await pool.query('SELECT token, shop_inn, label FROM access_tokens LIMIT 5');
    console.log('\n=== Tokens ===');
    console.log(tokens.rows);

    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\n=== Tables ===');
    console.log(tables.rows.map(r => r.table_name));

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDB();
