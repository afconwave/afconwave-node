import { AfconWave } from './src/index';

try {
    const client = new AfconWave({ secretKey: 'afcw_sk_test_123' });
    console.log("Node.js SDK Instantiated Successfully!");
} catch (error) {
    console.error("Failed to instantiate Node.js SDK:", error);
    process.exit(1);
}
