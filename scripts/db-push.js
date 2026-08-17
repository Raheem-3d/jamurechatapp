const { execSync } = require('child_process');
try {
  console.log("Running prisma db push...");
  const out = execSync('npx prisma db push --accept-data-loss', { encoding: 'utf8' });
  console.log(out);
  console.log("Running prisma generate...");
  const gen = execSync('npx prisma generate', { encoding: 'utf8' });
  console.log(gen);
} catch (e) {
  console.error("Error:", e.stdout || e.stderr || e.message);
}
