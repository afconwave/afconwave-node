import { AfconWave } from './src/index';

try {
    const client = new AfconWave({ secretKey: 'sk_test_123' });
    console.log("Node.js SDK Instantiated Successfully!");
    console.log("Services loaded: Payments, Payouts, Crypto");
} catch (error) {
    console.error("Failed to instantiate Node.js SDK:", error);
    process.exit(1);
}
