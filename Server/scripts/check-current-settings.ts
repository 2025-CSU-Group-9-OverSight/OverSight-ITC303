import { MongoClient } from 'mongodb';

async function checkCurrentSettings() {
    const uri = process.env.MONGODB_URI || "mongodb://OverSight:ITC309@timmarkut.com:27017/?directConnection=true&authSource=admin";
    const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
    
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Database: ${database}`);
    
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(database);
    
    try {
        const settings = db.collection('settings');
        const alertSettings = await settings.findOne({ name: 'alerts' });
        
        if (alertSettings) {
            console.log('Current Alert Settings:');
            console.log(`   CPU Threshold: ${alertSettings.cpu}%`);
            console.log(`   RAM Threshold: ${alertSettings.ram}%`);
            console.log(`   Disk Threshold: ${alertSettings.disk}%`);
            console.log(`   Timeout: ${alertSettings.timeout}ms (${alertSettings.timeout / 1000 / 60} minutes)`);
        } else {
            console.log('No alert settings found in database');
        }
        
        // Also check recent alerts to see what thresholds are actually being used
        const alertLog = db.collection('alertLog');
        const recentAlerts = await alertLog.find({}).sort({ timestamp: -1 }).limit(10).toArray();
        
        console.log('\nRecent Alert Thresholds:');
        const thresholds = new Set();
        recentAlerts.forEach(alert => {
            thresholds.add(`${alert.meta?.type}: ${alert.threshold}%`);
        });
        
        Array.from(thresholds).forEach(threshold => {
            console.log(`   ${threshold}`);
        });
        
    } catch (error) {
        console.error('Error checking settings:', error);
    } finally {
        await client.close();
    }
}

checkCurrentSettings().catch(console.error);
