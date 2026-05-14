import 'dotenv/config';

async function main() {
  console.log('[seed-dev] placeholder — will seed admin user + sample data in Step 6');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-dev] fatal:', err);
  process.exit(1);
});
