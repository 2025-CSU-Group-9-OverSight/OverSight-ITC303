import { MongoClient } from 'mongodb';

async function migrateAlertLog() {
    const uri = process.env.MONGODB_URI || "mongodb://OverSight:ITC309@timmarkut.com:27017/?directConnection=true&authSource=admin";
    const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
    
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Database: ${database}`);
    
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(database);
    
    try {
        // Check if alertLog exists and what type it is
        const collections = await db.listCollections().toArray();
        const alertLogCollection = collections.find(col => col.name === 'alertLog');
        
        let existingAlerts: any[] = [];
        
        if (alertLogCollection) {
            console.log('Current alertLog collection info:', alertLogCollection);
            
            // Get all existing alerts
            existingAlerts = await db.collection('alertLog').find({}).toArray();
            console.log(`Found ${existingAlerts.length} existing alerts`);
            
            // Drop the existing collection
            await db.collection('alertLog').drop();
            console.log('Dropped existing alertLog collection');
        }
        
        // Create new regular collection
        await db.createCollection('alertLog');
        console.log('Created new regular alertLog collection');
        
        // Add TTL index for data expiration (3 months)
        await db.collection('alertLog').createIndex(
            { "timestamp": 1 }, 
            { expireAfterSeconds: 7889400 }
        );
        console.log('Created TTL index for alertLog');
        
        // Re-insert existing alerts if any
        if (existingAlerts && existingAlerts.length > 0) {
            // Add the new fields to existing alerts
                const updatedAlerts = existingAlerts.map(alert => ({
                    ...alert,
                    acknowledgedAt: null
                }));
            
            await db.collection('alertLog').insertMany(updatedAlerts);
            console.log(`Re-inserted ${updatedAlerts.length} alerts with new schema`);
        } else {
            console.log('No existing alerts to migrate');
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
    }
}

migrateAlertLog().catch(console.error);
