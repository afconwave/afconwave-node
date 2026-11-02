import { AfconWave } from './src/index';

try {
  const client = new AfconWave({ secretKey: 'afcw_test_smoke_only' });
  console.log('Node.js SDK Instantiated Successfully!');
  console.log('Resources:', Object.keys(client).filter((k) => typeof (client as any)[k] === 'object'));
} catch (error) {
  console.error('Failed to instantiate Node.js SDK:', error);
  process.exit(1);
}
