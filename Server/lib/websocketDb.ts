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

    let processArray: Array<any> = [];
    data.processes.forEach(process => {                     // Reformat the process array
        processArray.push({
            timestamp: date,
            meta: {
                deviceName: data.device.deviceName,
                pid: process.pid,
            },
            name: process.name,
            cpu_percent: process.cpu_percent,
            memory_percent: process.memory_percent,
            io_counters: process.io_counters,
            status: process.status
        });

        /* TODO - Compare counters against alert threshold */

    });
    await processLog.insertMany(processArray);              // Insert process array into the process log collection

    let serviceArray: Array<any> = [];
    data.services.forEach(service => {                      // Reformat the service array
        serviceArray.push({
            timestamp: date,
            meta: {
                deviceName: data.device.deviceName,
                pid: service.pid,
            },
            name: service.name,
            display_name: service.display_name,
            cpu_percent: service.cpu_percent,
            memory_percent: service.memory_percent,
            io_counters: service.io_counters,
            start_type: service.start_type,
            status: service.status
        });

        /* TODO - Compare counters against alert threshold */

    });
    await serviceLog.insertMany(serviceArray);              // Insert service array into the services log collection

    /* TODO - Update alert log if necessary */

    console.log(`Data inserted: ${date}`);
}