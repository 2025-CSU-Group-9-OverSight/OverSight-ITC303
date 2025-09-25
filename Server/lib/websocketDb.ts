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

        let alertSettings = await getAlertSettings();           // Check data against alert settings and create alerts as required
        let cpuPercent = getCpuPercent(data.cpu);
        if (cpuPercent > alertSettings.cpu) createAlert( data.device.deviceName, 'cpu', alertSettings.cpu, cpuPercent, `${cpuPercent}% cpu utilisation on ${data.device.deviceName}`, date, alertSettings.timeout);
        if (data.ram.percentUsed > alertSettings.ram) createAlert(data.device.deviceName, 'ram', alertSettings.ram, data.ram.percentUsed, `${data.ram.percentUsed}% memory utilisation on ${data.device.deviceName}`, date, alertSettings.timeout);
        for (const [partition,fields] of Object.entries(data.disk.partitions)) {
            if (fields.percent > alertSettings.disk) createAlert(data.device.deviceName, 'disk', alertSettings.disk, fields.percent, `Partition ${partition} ${fields.percent}% used on ${data.device.deviceName}`, date, alertSettings.timeout);
        }

    } catch (error) {
        console.error('Error inserting websocket data:', error);
    }
}

async function getAlertSettings() {

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
                cpu: 80,
                ram: 80,
                disk: 80,
                timeout: 300000
            });
            globalThis.alertSettings = {
                cpu: 80,
                ram: 80,
                disk: 80,
                timeout: 300000
            }
            console.log('Alert settings initialised')
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
        message: message
    });

    console.log(`Alert created: ${message} ${date}`)
}