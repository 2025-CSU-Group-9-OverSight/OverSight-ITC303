#!/usr/bin/env tsx

/**
 * Hysteresis Logic Test Script
 * 
 * This script tests the hysteresis logic by simulating different usage patterns
 * and verifying that alerts are generated/cleared according to hysteresis rules.
 * 
 * Usage:
 *   npx tsx scripts/test-hysteresis-logic.ts [test-type]
 * 
 * Test Types:
 *   cpu      - Test CPU hysteresis logic
 *   ram      - Test RAM hysteresis logic  
 *   disk     - Test Disk hysteresis logic
 *   all      - Test all types (default)
 *   help     - Show this help message
 */

import { MongoClient } from 'mongodb';
import getDb from '../lib/getDb';

interface HysteresisTest {
    type: 'cpu' | 'ram' | 'disk';
    alertThreshold: number;
    clearThreshold: number;
    testScenarios: TestScenario[];
}

interface TestScenario {
    name: string;
    description: string;
    usageValues: number[];
    expectedAlerts: number;
    expectedClears: number;
}

const HYSTERESIS_TESTS: HysteresisTest[] = [
    {
        type: 'cpu',
        alertThreshold: 80,
        clearThreshold: 75,
        testScenarios: [
            {
                name: 'Normal to Alert',
                description: 'Usage rises from normal to above alert threshold',
                usageValues: [70, 85, 90, 95],
                expectedAlerts: 1, // Should alert once at 85%
                expectedClears: 0
            },
            {
                name: 'Alert Spam Prevention',
                description: 'Usage stays above alert threshold - should not spam',
                usageValues: [85, 90, 95, 100],
                expectedAlerts: 1, // Should only alert once
                expectedClears: 0
            },
            {
                name: 'Alert to Clear',
                description: 'Usage drops below clear threshold - should clear',
                usageValues: [85, 90, 70, 65],
                expectedAlerts: 1, // Should alert once at 85%
                expectedClears: 1  // Should clear at 70%
            },
            {
                name: 'Clear to Alert Again',
                description: 'Usage rises again after clearing - should alert again',
                usageValues: [85, 90, 70, 65, 80, 85],
                expectedAlerts: 2, // Should alert at 85% and again at 85%
                expectedClears: 1  // Should clear at 70%
            }
        ]
    },
    {
        type: 'ram',
        alertThreshold: 80,
        clearThreshold: 75,
        testScenarios: [
            {
                name: 'Normal to Alert',
                description: 'Usage rises from normal to above alert threshold',
                usageValues: [70, 85, 90, 95],
                expectedAlerts: 1,
                expectedClears: 0
            },
            {
                name: 'Alert Spam Prevention',
                description: 'Usage stays above alert threshold - should not spam',
                usageValues: [85, 90, 95, 100],
                expectedAlerts: 1,
                expectedClears: 0
            },
            {
                name: 'Alert to Clear',
                description: 'Usage drops below clear threshold - should clear',
                usageValues: [85, 90, 70, 65],
                expectedAlerts: 1,
                expectedClears: 1
            },
            {
                name: 'Clear to Alert Again',
                description: 'Usage rises again after clearing - should alert again',
                usageValues: [85, 90, 70, 65, 80, 85],
                expectedAlerts: 2,
                expectedClears: 1
            }
        ]
    },
    {
        type: 'disk',
        alertThreshold: 85,
        clearThreshold: 80,
        testScenarios: [
            {
                name: 'Normal to Alert',
                description: 'Usage rises from normal to above alert threshold',
                usageValues: [75, 90, 95, 100],
                expectedAlerts: 1,
                expectedClears: 0
            },
            {
                name: 'Alert Spam Prevention',
                description: 'Usage stays above alert threshold - should not spam',
                usageValues: [90, 95, 100, 100],
                expectedAlerts: 1,
                expectedClears: 0
            },
            {
                name: 'Alert to Clear',
                description: 'Usage drops below clear threshold - should clear',
                usageValues: [90, 95, 75, 70],
                expectedAlerts: 1,
                expectedClears: 1
            },
            {
                name: 'Clear to Alert Again',
                description: 'Usage rises again after clearing - should alert again',
                usageValues: [90, 95, 75, 70, 85, 90],
                expectedAlerts: 2,
                expectedClears: 1
            }
        ]
    }
];

async function testHysteresisLogic(testType: string = 'all') {
    console.log('🧠 OverSight Hysteresis Logic Test');
    console.log('==================================\n');

    try {
        const db = await getDb();
        const alertLogCollection = db.collection('alertLog');
        const settingsCollection = db.collection('settings');

        // Get current alert settings
        const alertSettings = await settingsCollection.findOne({ name: 'alerts' });
        if (!alertSettings) {
            console.log('❌ No alert settings found. Please run the system first.');
            return;
        }

        console.log('📊 Current Alert Settings:');
        console.log(`   CPU: ${alertSettings.cpu}% (alert) / ${alertSettings.cpu - 5}% (clear)`);
        console.log(`   RAM: ${alertSettings.ram}% (alert) / ${alertSettings.ram - 5}% (clear)`);
        console.log(`   Disk: ${alertSettings.disk}% (alert) / ${alertSettings.disk - 5}% (clear)\n`);

        // Determine which tests to run
        const testsToRun = testType === 'all' 
            ? HYSTERESIS_TESTS 
            : HYSTERESIS_TESTS.filter(test => test.type === testType);

        if (testsToRun.length === 0) {
            console.log(`❌ Unknown test type: ${testType}`);
            console.log('   Available types: cpu, ram, disk, all');
            return;
        }

        // Run tests
        for (const test of testsToRun) {
            console.log(`🔍 Testing ${test.type.toUpperCase()} Hysteresis Logic`);
            console.log('=' .repeat(40));

            for (const scenario of test.testScenarios) {
                console.log(`\n📋 Scenario: ${scenario.name}`);
                console.log(`   Description: ${scenario.description}`);
                console.log(`   Usage Pattern: ${scenario.usageValues.join('%, ')}%`);

                // Simulate the usage pattern
                const results = await simulateUsagePattern(
                    test.type,
                    scenario.usageValues,
                    test.alertThreshold,
                    test.clearThreshold
                );

                // Verify results
                const alertCount = results.alerts.length;
                const clearCount = results.clears.length;

                console.log(`   Expected: ${scenario.expectedAlerts} alerts, ${scenario.expectedClears} clears`);
                console.log(`   Actual: ${alertCount} alerts, ${clearCount} clears`);

                // Check if results match expectations
                const alertsMatch = alertCount === scenario.expectedAlerts;
                const clearsMatch = clearCount === scenario.expectedClears;

                if (alertsMatch && clearsMatch) {
                    console.log('   ✅ PASS - Hysteresis logic working correctly');
                } else {
                    console.log('   ❌ FAIL - Hysteresis logic not working as expected');
                    if (!alertsMatch) {
                        console.log(`      Expected ${scenario.expectedAlerts} alerts, got ${alertCount}`);
                    }
                    if (!clearsMatch) {
                        console.log(`      Expected ${scenario.expectedClears} clears, got ${clearCount}`);
                    }
                }

                // Show detailed results
                if (results.alerts.length > 0) {
                    console.log('   📈 Alerts generated:');
                    results.alerts.forEach(alert => {
                        console.log(`      - ${alert.timestamp}: ${alert.reading}% (threshold: ${alert.threshold}%)`);
                    });
                }

                if (results.clears.length > 0) {
                    console.log('   📉 Clears generated:');
                    results.clears.forEach(clear => {
                        console.log(`      - ${clear.timestamp}: ${clear.reading}% (clear threshold: ${clear.clearThreshold}%)`);
                    });
                }
            }

            console.log(`\n✅ ${test.type.toUpperCase()} hysteresis test completed\n`);
        }

        console.log('🎉 All hysteresis tests completed!');
        console.log('\n💡 Note: This test simulates the logic in websocketDb.ts');
        console.log('   For real-world testing, use the generate-test-alerts.ts script');

    } catch (error) {
        console.error('❌ Error testing hysteresis logic:', error);
        process.exit(1);
    }
}

async function simulateUsagePattern(
    type: string,
    usageValues: number[],
    alertThreshold: number,
    clearThreshold: number
): Promise<{ alerts: any[], clears: any[] }> {
    // This simulates the hysteresis logic from websocketDb.ts
    const deviceAlertStates = new Map<string, Record<string, 'normal' | 'alerting'>>();
    const alerts: any[] = [];
    const clears: any[] = [];

    const deviceName = 'hysteresis-test-device';
    const deviceState = deviceAlertStates.get(deviceName) || {};

    for (let i = 0; i < usageValues.length; i++) {
        const reading = usageValues[i];
        const currentState = deviceState[type] || 'normal';

        if (reading > alertThreshold && currentState === 'normal') {
            // Should generate alert
            alerts.push({
                timestamp: new Date(),
                reading: reading,
                threshold: alertThreshold,
                type: type
            });
            deviceState[type] = 'alerting';
            console.log(`      → Alert generated: ${reading}% > ${alertThreshold}% (state: normal → alerting)`);
        } else if (reading < clearThreshold && currentState === 'alerting') {
            // Should clear alert
            clears.push({
                timestamp: new Date(),
                reading: reading,
                clearThreshold: clearThreshold,
                type: type
            });
            deviceState[type] = 'normal';
            console.log(`      → Alert cleared: ${reading}% < ${clearThreshold}% (state: alerting → normal)`);
        } else if (reading > alertThreshold && currentState === 'alerting') {
            // Should not generate new alert (spam prevention)
            console.log(`      → No alert: ${reading}% > ${alertThreshold}% but already alerting (spam prevention)`);
        } else {
            // Normal operation
            console.log(`      → Normal: ${reading}% (state: ${currentState})`);
        }
    }

    deviceAlertStates.set(deviceName, deviceState);
    return { alerts, clears };
}

function showHelp() {
    console.log('🧠 OverSight Hysteresis Logic Test Script');
    console.log('==========================================\n');
    console.log('This script tests the hysteresis logic by simulating different usage patterns');
    console.log('and verifying that alerts are generated/cleared according to hysteresis rules.\n');
    console.log('Usage:');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts [test-type]\n');
    console.log('Test Types:');
    console.log('  cpu      - Test CPU hysteresis logic');
    console.log('  ram      - Test RAM hysteresis logic');
    console.log('  disk     - Test Disk hysteresis logic');
    console.log('  all      - Test all types (default)');
    console.log('  help     - Show this help message\n');
    console.log('Examples:');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts cpu');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts ram');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts disk');
    console.log('  npx tsx scripts/test-hysteresis-logic.ts all\n');
    console.log('💡 This test simulates the logic in websocketDb.ts');
    console.log('   For real-world testing, use the generate-test-alerts.ts script');
}

// Main execution
const testType = process.argv[2] || 'all';

if (testType.toLowerCase() === 'help' || testType.toLowerCase() === '--help' || testType.toLowerCase() === '-h') {
    showHelp();
} else {
    testHysteresisLogic(testType);
}
