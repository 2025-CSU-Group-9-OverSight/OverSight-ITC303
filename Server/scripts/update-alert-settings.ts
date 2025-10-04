import { MongoClient } from 'mongodb';

async function updateAlertSettings() {
    const uri = process.env.MONGODB_URI || "mongodb://OverSight:ITC309@timmarkut.com:27017/?directConnection=true&authSource=admin";
    const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
    
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Database: ${database}`);
    
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(database);
    
    try {
        const settings = db.collection('settings');
        
        // Update existing alert settings to realistic thresholds
        const result = await settings.updateOne(
            { name: 'alerts' },
            { 
                $set: { 
                    cpu: 85,        // Keep CPU at 85% (already reasonable)
                    ram: 80,        // Fix RAM from 5% to 80%
                    disk: 95,       // Keep disk at 95% (already reasonable)
                    timeout: 30000  // Fix timeout from 1000ms to 30 seconds
                } 
            }
        );
        
        if (result.matchedCount > 0) {
            console.log('Updated existing alert settings to realistic thresholds');
        } else {
            // Create new settings if they don't exist
            await settings.insertOne({
                name: 'alerts',
                cpu: 85,
                ram: 80,
                disk: 95,
                timeout: 30000
            });
            console.log('Created new alert settings with realistic thresholds');
        }
        
        // Verify the update
        const updatedSettings = await settings.findOne({ name: 'alerts' });
        console.log('Current alert settings:', updatedSettings);
        
        console.log('Alert settings update completed successfully!');
        
    } catch (error) {
        console.error('Failed to update alert settings:', error);
    } finally {
        await client.close();
    }
}

updateAlertSettings().catch(console.error);
