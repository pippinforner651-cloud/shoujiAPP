import { build } from 'vite';

try {
  const result = await build({ logLevel: 'info' });
  console.log('\nBuild completed successfully');
} catch (err) {
  console.error('\nBuild failed:', err.message);
  process.exit(1);
}
