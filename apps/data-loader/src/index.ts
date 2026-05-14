import 'dotenv/config';

async function main() {
  console.log('[data-loader] starting — no data sources configured yet (Step 8)');
  process.exit(0);
}

main().catch((err) => {
  console.error('[data-loader] fatal:', err);
  process.exit(1);
});
