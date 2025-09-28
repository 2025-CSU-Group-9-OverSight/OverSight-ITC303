import getDb from '@/lib/getDb';

interface PerformanceLog {                                      // Typescript interface
    timestamp: string;
    device: Record<string, any>;
    processes: Array<any>;
    services: Array<any>;
    disk: { io: Record<string, any>, partitions: Record<string, any>};
    cpu: Record<string, any>;
    ram: Record<string, any>;
}

type AlertSettings = {
    cpu: number;
    ram: number;
    disk: number;
    timeout: number;
};

declare global {                                                // Global variables for hot module reload during development
    var alertSettings: AlertSettings;
    var alertSettingsMonitorInt: boolean;
}

const alertTimeout = new Map<string, Record<string, number>>(); // Map for device specific alert timeouts
const deviceAlertStates = new Map<string, Record<string, 'normal' | 'alerting'>>(); // Track alert states for hysteresis

// Hysteresis percentages - prevents minor fluctuations from creating new alerts
const HYSTERESIS_PERCENTAGES = {
    cpu: { alert: 0, clear: -10 },    // Alert at threshold, clear 10% below threshold
    ram: { alert: 0, clear: -10 },    // Alert at threshold, clear 10% below threshold
    disk: { alert: 0, clear: -10 }    // Alert at threshold, clear 10% below threshold
};

// Alert timeout protection - prevents spam by limiting alert frequency
const ALERT_TIMEOUTS = {
    cpu: 30000,    // 30 seconds between CPU alerts
    ram: 30000,    // 30 seconds between RAM alerts
    disk: 30000    // 30 seconds between Disk alerts
};

/**
 * Send monitoring data to the database
 * @param data 
 */
export async function inputData(data: PerformanceLog) {
    try {
        let date = new Date(data.timestamp);                    // Convert the timestamp string to a date
        let db = await getDb();                                 // Get the database connection
        let performanceLog = db.collection('performanceLog');   // Get the performance log collection
        let processLog = db.collection('processLog');           // Get the process log collection
        let serviceLog = db.collection('serviceLog');           // Get the service log collection

        await performanceLog.insertOne({                        // Insert into the performance log collection
            timestamp: date,
            meta: {
                deviceName: data.device.deviceName
            },
            device: data.device,
            disk: data.disk,
            cpu: data.cpu,
            ram: data.ram
        });

        if(data.processes.length > 0) {                         // Insert process array into the process log collection
            await processLog.insertOne({
                timestamp: date,
                meta: {
                    deviceName: data.device.deviceName
                },
                processes: data.processes
            })
        }

        if(data.services.length > 0) {
            await serviceLog.insertOne({                        // Insert service array into the services log collection
                timestamp: date,
                meta: {
                    deviceName: data.device.deviceName
                },
                services: data.services
            })
        }

        console.log(`Data inserted: ${date}`);

        try {
            console.log(`🔍 Starting alert check for device: ${data.device.deviceName}`);
            
            let alertSettings = await getAlertSettings();           // Check data against alert settings and create alerts as required
            console.log(`📊 Alert settings loaded: CPU=${alertSettings.cpu}%, RAM=${alertSettings.ram}%, Disk=${alertSettings.disk}%`);
            
            let cpuPercent = getCpuPercent(data.cpu);
            
            // Debug logging
            console.log(`🔍 Alert Check - Device: ${data.device.deviceName}`);
            console.log(`   CPU: ${cpuPercent}% (threshold: ${alertSettings.cpu}%)`);
            console.log(`   RAM: ${data.ram.percentUsed}% (threshold: ${alertSettings.ram}%)`);
            console.log(`   Disk partitions: ${Object.keys(data.disk.partitions).length}`);
            
            // Use hysteresis logic for smart alert creation
            await checkAndCreateAlert(data.device.deviceName, 'cpu', cpuPercent, alertSettings.cpu, `${cpuPercent}% cpu utilisation on ${data.device.deviceName}`, date, alertSettings.timeout);
            await checkAndCreateAlert(data.device.deviceName, 'ram', data.ram.percentUsed, alertSettings.ram, `${data.ram.percentUsed}% memory utilisation on ${data.device.deviceName}`, date, alertSettings.timeout);
            
            for (const [partition,fields] of Object.entries(data.disk.partitions)) {
                console.log(`   Disk ${partition}: ${fields.percent}% (threshold: ${alertSettings.disk}%)`);
                await checkAndCreateAlert(data.device.deviceName, 'disk', fields.percent, alertSettings.disk, `Partition ${partition} ${fields.percent}% used on ${data.device.deviceName}`, date, alertSettings.timeout);
            }
            
            console.log(`✅ Alert check completed for ${data.device.deviceName}`);
        } catch (alertError) {
            console.error('❌ Error in alert generation:', alertError);
        }

    } catch (error) {
        console.error('Error inserting websocket data:', error);
    }
}

async function getAlertSettings() {
    // Clear cache to force fresh read from database
    globalThis.alertSettings = null;

    if(!globalThis.alertSettings) {                             // Initialise alert settings from database
        let db = await getDb();
        let settings = db.collection('settings');
        let alertSettings = await settings.findOne({ name: 'alerts' });

        if(alertSettings) {
            globalThis.alertSettings = {
                cpu: alertSettings.cpu,
                ram: alertSettings.ram,
                disk: alertSettings.disk,
                timeout: alertSettings.timeout
            }
        } else {
            await settings.insertOne({
                name: 'alerts',
                cpu: 85,
                ram: 80,
                disk: 95,
                timeout: 30000
            });
            globalThis.alertSettings = {
                cpu: 85,
                ram: 80,
                disk: 95,
                timeout: 30000
            }
            console.log('Alert settings initialised with realistic thresholds')
        }
    }

    if(!globalThis.alertSettingsMonitorInt) {                           // Initialise the alert settings monitor
        let db = await getDb();
        let settings = db.collection('settings');
        let changeStream = settings.watch([{$match: {'fullDocument.name': 'alerts', operationType: 'update'}}], {fullDocument: 'updateLookup'});

        changeStream.on('change', (next) =>{
            if (next.operationType != 'update') return;
            if (!next.updateDescription.updatedFields) return;
            if (next.updateDescription.updatedFields.cpu) globalThis.alertSettings.cpu = next.updateDescription.updatedFields.cpu;
            if (next.updateDescription.updatedFields.ram) globalThis.alertSettings.ram = next.updateDescription.updatedFields.ram;
            if (next.updateDescription.updatedFields.disk) globalThis.alertSettings.disk = next.updateDescription.updatedFields.disk;
            if (next.updateDescription.updatedFields.timeout) globalThis.alertSettings.timeout = next.updateDescription.updatedFields.timeout;
        })

        changeStream.on('error', (error) => {
            console.error('Alert settings monitor error:', error);
            globalThis.alertSettingsMonitorInt = false;                 // Allow reconnection after error
        })

        globalThis.alertSettingsMonitorInt = true;
    }

    return globalThis.alertSettings; 
}

/**
 * Calculate % of total cpu usage
 * @param data
 * @returns total cpu %
 */
function getCpuPercent(data: Record<string, any>) {
    let cores = data.percentUsed;
    if (!cores) return 0;
    
    let total = 0;

    cores.forEach((core: number) => {
        total += core;
    });

    let percentage = total/cores.length;
    return Number(percentage.toFixed(1));
}

/**
 * Smart alert creation with hysteresis logic to prevent minor fluctuation alerts
 * @param deviceName 
 * @param type 
 * @param reading 
 * @param threshold 
 * @param message 
 * @param date 
 * @param timeout 
 */
async function checkAndCreateAlert(deviceName: string, type: string, reading: number, threshold: number, message: string, date: Date, timeout: number) {
    // Get hysteresis percentages for this alert type
    const hysteresis = HYSTERESIS_PERCENTAGES[type as keyof typeof HYSTERESIS_PERCENTAGES];
    if (!hysteresis) {
        console.log(`⚠️  No hysteresis defined for ${type}, skipping`);
        return; // Skip if no hysteresis defined for this type
    }
    
    // Calculate actual hysteresis thresholds based on database threshold
    const alertThreshold = threshold + hysteresis.alert;  // threshold + 0 = threshold
    const clearThreshold = threshold + hysteresis.clear;  // threshold - 5 = 5% below threshold
    
    // Initialize device state if not exists
    if (!deviceAlertStates.has(deviceName)) {
        deviceAlertStates.set(deviceName, {});
    }
    
    const deviceState = deviceAlertStates.get(deviceName)!;
    const currentState = deviceState[type] || 'normal';
    
    console.log(`   ${type.toUpperCase()}: ${reading}% > ${alertThreshold}%? ${reading > alertThreshold}, State: ${currentState}, Clear: ${clearThreshold}%`);
    
    // Check if we should create an alert
    if (reading > alertThreshold && currentState === 'normal') {
        // Check if enough time has passed since last alert (timeout protection)
        const now = Date.now();
        const lastAlertTime = alertTimeout.get(deviceName)?.[type] || 0;
        const timeSinceLastAlert = now - lastAlertTime;
        const alertTimeoutMs = ALERT_TIMEOUTS[type as keyof typeof ALERT_TIMEOUTS];
        
        if (timeSinceLastAlert >= alertTimeoutMs) {
            // Transitioning from normal to alerting - create alert
            console.log(`🚨 CREATING ALERT for ${deviceName} ${type}: ${reading}% > ${alertThreshold}%`);
            await createAlert(deviceName, type, threshold, reading, message, date, timeout);
            deviceState[type] = 'alerting';
            deviceAlertStates.set(deviceName, deviceState);
            
            // Update last alert time
            if (!alertTimeout.has(deviceName)) {
                alertTimeout.set(deviceName, {});
            }
            alertTimeout.get(deviceName)![type] = now;
            
            console.log(`Alert state changed to alerting for ${deviceName} ${type}: ${reading}%`);
        } else {
            console.log(`   Alert suppressed for ${type}: ${Math.round((alertTimeoutMs - timeSinceLastAlert) / 1000)}s remaining`);
        }
    } else if (reading < clearThreshold && currentState === 'alerting') {
        // Transitioning from alerting to normal - reset state
        deviceState[type] = 'normal';
        deviceAlertStates.set(deviceName, deviceState);
        console.log(`Alert state reset to normal for ${deviceName} ${type}: ${reading}%`);
    } else {
        console.log(`   No alert for ${type}: reading=${reading}%, alert=${alertThreshold}%, clear=${clearThreshold}%, state=${currentState}`);
    }
    // If reading is between clear and alert thresholds, maintain current state
}

/**
 * Create an alert in the database
 * @param deviceName 
 * @param type cpu | ram | disk
 * @param threshold 0-100%
 * @param reading 0-100%
 * @param date 
 * @param timeout timeout between alerts of the same type (ms)
 * @returns 
 */
async function createAlert(deviceName: string, type: string, threshold: number, reading: number, message: string, date: Date, timeout: number) {
    
    if(!alertTimeout.has(deviceName)) {
        alertTimeout.set(deviceName, {});
    }

    let currentTime = date.getTime();
    let previousTime = alertTimeout.get(deviceName)![type];
    
    if (previousTime && (currentTime < previousTime)) return;                   // Skip, before timeout

    alertTimeout.get(deviceName)![type] = currentTime + timeout;                // Reset timeout

    let db = await getDb();
    let alertLog = db.collection('alertLog');
    await alertLog.insertOne({                                                  // Insert into the alert log collection
        timestamp: date,
        meta: {
            type: type,
            deviceName: deviceName,
            acknowledged: false,
            timestamp: date
        },
        threshold: threshold,
        reading: reading,
        message: message,
        acknowledgedAt: null
    });

    console.log(`Alert created: ${message} ${date}`)
}