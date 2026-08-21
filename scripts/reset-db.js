const { execSync } = require('child_process');

function truncateTables(dbName, excludedTables = []) {
  const exclusions = [...excludedTables, 'typeorm_metadata', 'migrations']
    .map((t) => `'${t}'`)
    .join(', ');

  // استعلام SQL يجمع أسماء كل الجداول وينفذ TRUNCATE cascade في سطر واحد
  const sqlCommand = `
    SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(tablename), ', ') || ' RESTART IDENTITY CASCADE;' 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename NOT IN (${exclusions});
  `
    .replace(/\s+/g, ' ')
    .trim();

  try {
    console.log(`🧹 Truncating tables in [${dbName}]...`);

    // 1. استخراج أمر التصفير المولد
    const truncateSql = execSync(
      `docker exec -i postgres psql -U postgres -d "${dbName}" -t -A -c "${sqlCommand}"`,
      { encoding: 'utf8' },
    ).trim();

    if (truncateSql && truncateSql.startsWith('TRUNCATE TABLE')) {
      // 2. تنفيذ التصفير الفعلي
      execSync(
        `docker exec -i postgres psql -U postgres -d "${dbName}" -c "${truncateSql}"`,
        {
          stdio: 'inherit',
        },
      );
      console.log(`✅ [${dbName}] tables emptied successfully!`);
    } else {
      console.log(`ℹ️ [${dbName}] No tables found to truncate.`);
    }
  } catch (error) {
    console.error(`❌ Failed to reset [${dbName}]:`, error.message);
  }
}

truncateTables('Booking-Catalog', ['genres']);
truncateTables('Booking-Users');
truncateTables('Booking-Notifications');
