#!/usr/bin/env tsx

/**
 * Test Alert Generation Script
 * 
 * This script temporarily lowers alert thresholds to generate test alerts
 * for QA testing purposes. It includes automatic cleanup functionality.
 * 
 * Usage:
 *   npx tsx scripts/generate-test-alerts.ts [action]
 * 
 * Actions:
 *   generate  - Lower thresholds and generate test alerts (default)
 *   cleanup   - Restore original thresholds and clean up test alerts
 *   status    - Check current threshold status
 *   help      - Show this help message
 */

import { MongoClient } from 'mongodb';
import getDb from '../lib/getDb';

interface AlertSettings {
    cpu: number;
    ram: number;
    disk: number;
    timeout: number;
}

interface TestAlertConfig {
    originalThresholds: AlertSettings | null;
    testThresholds: AlertSettings;
    testDeviceName: string;
    isTestMode: boolean;
}

const TEST_THRESHOLDS: AlertSettings = {
    cpu: 5,      // Very low to ensure alerts are generated
    ram: 5,      // Very low to ensure alerts are generated
    disk: 5,     // Very low to ensure alerts are generated
    timeout: 5000 // 5 seconds for faster testing
};

const TEST_DEVICE_NAME = 'qa-test-device';

async function generateTestAlerts() {
    console.log('🧪 OverSight Test Alert Generation');
    console.log('==================================\n');

    try {
        const db = await getDb();
        const settingsCollection = db.collection('settings');
        const alertLogCollection = db.collection('alertLog');

        // 1. Check if we're already in test mode
        const currentSettings = await settingsCollection.findOne({ name: 'alerts' });
        if (currentSettings?.isTestMode) {
            console.log('⚠️  System is already in test mode!');
            console.log('   Current test thresholds:');
            console.log(`   CPU: ${currentSettings.cpu}%, RAM: ${currentSettings.ram}%, Disk: ${currentSettings.disk}%`);
            console.log('\n   To exit test mode, run: npx tsx scripts/generate-test-alerts.ts cleanup');
            return;
        }

        // 2. Backup original thresholds
        const originalThresholds = {
            cpu: currentSettings?.cpu || 85,
            ram: currentSettings?.ram || 80,
            disk: currentSettings?.disk || 95,
            timeout: currentSettings?.timeout || 30000
        };

        console.log('📋 Current Alert Thresholds:');
        console.log(`   CPU: ${originalThresholds.cpu}%`);
        console.log(`   RAM: ${originalThresholds.ram}%`);
        console.log(`   Disk: ${originalThresholds.disk}%`);
        console.log(`   Timeout: ${originalThresholds.timeout}ms\n`);

        // 3. Set test thresholds
        console.log('🔧 Setting test thresholds...');
        await settingsCollection.updateOne(
            { name: 'alerts' },
            { 
                $set: {
                    ...TEST_THRESHOLDS,
                    isTestMode: true,
                    originalThresholds: originalThresholds,
                    testStartTime: new Date(),
                    testDeviceName: TEST_DEVICE_NAME
                }
            },
            { upsert: true }
        );

        console.log('✅ Test thresholds set:');
        console.log(`   CPU: ${TEST_THRESHOLDS.cpu}%`);
        console.log(`   RAM: ${TEST_THRESHOLDS.ram}%`);
        console.log(`   Disk: ${TEST_THRESHOLDS.disk}%`);
        console.log(`   Timeout: ${TEST_THRESHOLDS.timeout}ms\n`);

        // 4. Wait for alerts to be generated
        console.log('⏳ Waiting for test alerts to be generated...');
        console.log('   (This may take 1-3 minutes depending on system load)\n');

        let alertCount = 0;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max wait

        while (alertCount === 0 && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            
            const testAlerts = await alertLogCollection.find({
                'meta.deviceName': TEST_DEVICE_NAME,
                timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
            }).toArray();

            alertCount = testAlerts.length;
            attempts++;

            if (alertCount > 0) {
                console.log(`✅ Found ${alertCount} test alerts!`);
                break;
            } else {
                console.log(`   Attempt ${attempts}/${maxAttempts}: No alerts yet, waiting...`);
            }
        }

        if (alertCount === 0) {
            console.log('⚠️  No test alerts were generated within 5 minutes.');
            console.log('   This might mean:');
            console.log('   - System usage is very low');
            console.log('   - Monitoring script is not running');
            console.log('   - WebSocket connection issues\n');
            
            console.log('💡 You can still proceed with testing by:');
            console.log('   1. Manually creating alerts in the database, or');
            console.log('   2. Running some CPU/memory intensive tasks, or');
            console.log('   3. Checking the monitoring script status\n');
        } else {
            console.log('🎉 Test alerts generated successfully!');
            console.log('   You can now run your QA tests.\n');
        }

        // 5. Show cleanup instructions
        console.log('📝 Next Steps:');
        console.log('   1. Run your QA tests (Test Case ALERT-002)');
        console.log('   2. When done, run cleanup: npx tsx scripts/generate-test-alerts.ts cleanup\n');

        console.log('⚠️  Important: Remember to run cleanup when testing is complete!');

    } catch (error) {
        console.error('❌ Error generating test alerts:', error);
        process.exit(1);
    }
}

async function cleanupTestAlerts() {
    console.log('🧹 OverSight Test Alert Cleanup');
    console.log('===============================\n');

    try {
        const db = await getDb();
        const settingsCollection = db.collection('settings');
        const alertLogCollection = db.collection('alertLog');

        // 1. Check if we're in test mode
        const currentSettings = await settingsCollection.findOne({ name: 'alerts' });
        if (!currentSettings?.isTestMode) {
            console.log('ℹ️  System is not in test mode. No cleanup needed.');
            return;
        }

        console.log('📋 Current test mode detected:');
        console.log(`   Test thresholds: CPU ${currentSettings.cpu}%, RAM ${currentSettings.ram}%, Disk ${currentSettings.disk}%`);
        console.log(`   Test started: ${currentSettings.testStartTime}\n`);

        // 2. Restore original thresholds
        if (currentSettings.originalThresholds) {
            console.log('🔧 Restoring original thresholds...');
            await settingsCollection.updateOne(
                { name: 'alerts' },
                { 
                    $set: {
                        ...currentSettings.originalThresholds,
                        isTestMode: false
                    },
                    $unset: {
                        originalThresholds: "",
                        testStartTime: "",
                        testDeviceName: ""
                    }
                }
            );

            console.log('✅ Original thresholds restored:');
            console.log(`   CPU: ${currentSettings.originalThresholds.cpu}%`);
            console.log(`   RAM: ${currentSettings.originalThresholds.ram}%`);
            console.log(`   Disk: ${currentSettings.originalThresholds.disk}%`);
            console.log(`   Timeout: ${currentSettings.originalThresholds.timeout}ms\n`);
        }

        // 3. Clean up test alerts
        console.log('🗑️  Cleaning up test alerts...');
        const testDeviceName = currentSettings.testDeviceName || TEST_DEVICE_NAME;
        
        const deleteResult = await alertLogCollection.deleteMany({
            'meta.deviceName': testDeviceName
        });

        console.log(`✅ Cleaned up ${deleteResult.deletedCount} test alerts\n`);

        console.log('🎉 Cleanup completed successfully!');
        console.log('   System is now back to normal operation mode.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

async function checkStatus() {
    console.log('📊 OverSight Test Alert Status');
    console.log('==============================\n');

    try {
        const db = await getDb();
        const settingsCollection = db.collection('settings');
        const alertLogCollection = db.collection('alertLog');

        // Check current settings
        const currentSettings = await settingsCollection.findOne({ name: 'alerts' });
        
        if (currentSettings?.isTestMode) {
            console.log('🧪 System is in TEST MODE');
            console.log(`   Test thresholds: CPU ${currentSettings.cpu}%, RAM ${currentSettings.ram}%, Disk ${currentSettings.disk}%`);
            console.log(`   Test started: ${currentSettings.testStartTime}`);
            console.log(`   Test device: ${currentSettings.testDeviceName || TEST_DEVICE_NAME}\n`);

            // Count test alerts
            const testDeviceName = currentSettings.testDeviceName || TEST_DEVICE_NAME;
            const testAlertCount = await alertLogCollection.countDocuments({
                'meta.deviceName': testDeviceName
            });

            console.log(`📈 Test alerts generated: ${testAlertCount}`);
            
            if (testAlertCount > 0) {
                console.log('\n💡 Ready for QA testing!');
                console.log('   Run your tests, then cleanup when done.');
            } else {
                console.log('\n⚠️  No test alerts found. You may need to wait longer or check monitoring script.');
            }
        } else {
            console.log('✅ System is in NORMAL MODE');
            console.log(`   Current thresholds: CPU ${currentSettings?.cpu || 85}%, RAM ${currentSettings?.ram || 80}%, Disk ${currentSettings?.disk || 95}%`);
            console.log('\n💡 To start test mode, run: npx tsx scripts/generate-test-alerts.ts generate');
        }

    } catch (error) {
        console.error('❌ Error checking status:', error);
        process.exit(1);
    }
}

function showHelp() {
    console.log('🧪 OverSight Test Alert Generation Script');
    console.log('==========================================\n');
    console.log('This script helps generate test alerts for QA testing by temporarily');
    console.log('lowering alert thresholds, then providing cleanup functionality.\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/generate-test-alerts.ts [action]\n');
    console.log('Actions:');
    console.log('  generate  - Lower thresholds and generate test alerts (default)');
    console.log('  cleanup   - Restore original thresholds and clean up test alerts');
    console.log('  status    - Check current threshold status');
    console.log('  help      - Show this help message\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/generate-test-alerts.ts');
    console.log('  npx tsx scripts/generate-test-alerts.ts generate');
    console.log('  npx tsx scripts/generate-test-alerts.ts cleanup');
    console.log('  npx tsx scripts/generate-test-alerts.ts status\n');
    console.log('⚠️  Important: Always run cleanup when testing is complete!');
}

// Main execution
const action = process.argv[2] || 'generate';

switch (action.toLowerCase()) {
    case 'generate':
    case 'gen':
    case 'start':
        generateTestAlerts();
        break;
    case 'cleanup':
    case 'clean':
    case 'stop':
        cleanupTestAlerts();
        break;
    case 'status':
    case 'check':
        checkStatus();
        break;
    case 'help':
    case '--help':
    case '-h':
        showHelp();
        break;
    default:
        console.log(`❌ Unknown action: ${action}\n`);
        showHelp();
        process.exit(1);
}
