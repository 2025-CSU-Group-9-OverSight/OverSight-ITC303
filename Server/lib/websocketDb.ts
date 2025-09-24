import getDb from '@/lib/getDb';

interface PerformanceLog {                                  // Typescript interface
    timestamp: string;
    device: Record<string, any>;
    processes: Array<any>;
    services: Array<any>;
    disk: Record<string, any>;
    cpu: Record<string, any>;
    ram: Record<string, any>;
}

/**
 * Send monitoring data to the database
 * @param data 
 */
export async function inputData(data: PerformanceLog) {

    let date = new Date(data.timestamp);                    // Convert the timestamp string to a date
    let db = await getDb();                                 // Get the database connection
    let performanceLog = db.collection('performanceLog');   // Get the performance log collection
    let processLog = db.collection('processLog');           // Get the process log collection
    let serviceLog = db.collection('serviceLog');           // Get the service log collection

    /* TODO - Retrieve alert threshold settings */

    /* TODO - Compare counters against alert threshold */
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
        /* TODO - Compare counters against alert threshold */
    }

    if(data.services.length > 0) {
        await serviceLog.insertOne({                        // Insert service array into the services log collection
            timestamp: date,
            meta: {
                deviceName: data.device.deviceName
            },
            services: data.services
        })
        /* TODO - Compare counters against alert threshold */
    }

    /* TODO - Update alert log if necessary */

    console.log(`Data inserted: ${date}`);
}