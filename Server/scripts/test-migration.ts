import { MongoClient } from 'mongodb';

async function testMigration() {
    const uri = process.env.MONGODB_URI || "mongodb://OverSight:ITC309@timmarkut.com:27017/?directConnection=true&authSource=admin";
    const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
    
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Database: ${database}`);
    
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(database);
    
    try {
        // Create a test collection to simulate the migration
        const testCollectionName = 'alertLog_test';
        
        console.log('Creating test time-series collection...');
        await db.createCollection(testCollectionName, {
            timeseries: {
                timeField: "timestamp",
                metaField: "meta"
            },
            expireAfterSeconds: 7889400
        });
        
        // Insert some test data
        const testAlerts = [
            {
                timestamp: new Date(),
                meta: {
                    type: 'cpu',
                    deviceName: 'Test-PC',
                    acknowledged: false
                },
                threshold: 80,
                reading: 85,
                message: 'Test CPU alert'
            },
            {
                timestamp: new Date(),
                meta: {
                    type: 'ram',
                    deviceName: 'Test-PC',
                    acknowledged: false
                },
                threshold: 80,
                reading: 90,
                message: 'Test RAM alert'
            }
        ];
        
        await db.collection(testCollectionName).insertMany(testAlerts);
        console.log('Inserted test alerts');
        
        // Try to update (this should fail with time-series)
        console.log('Testing update on time-series collection...');
        try {
            await db.collection(testCollectionName).updateOne(
                { 'meta.type': 'cpu' },
                { $set: { 'meta.acknowledged': true } }
            );
            console.log('❌ Update succeeded (unexpected for time-series)');
        } catch (error) {
            console.log('✅ Update failed as expected:', error instanceof Error ? error.message : String(error));
        }
        
        // Now migrate to regular collection
        console.log('Migrating to regular collection...');
        
        // Get existing data
        const existingAlerts = await db.collection(testCollectionName).find({}).toArray();
        console.log(`Found ${existingAlerts.length} test alerts`);
        
        // Drop time-series collection
        await db.collection(testCollectionName).drop();
        console.log('Dropped time-series collection');
        
        // Create regular collection
        await db.createCollection(testCollectionName);
        console.log('Created regular collection');
        
        // Add TTL index
        await db.collection(testCollectionName).createIndex(
            { "timestamp": 1 }, 
            { expireAfterSeconds: 7889400 }
        );
        console.log('Created TTL index');
        
        // Re-insert with new schema
        const updatedAlerts = existingAlerts.map(alert => ({
            ...alert,
            acknowledgedAt: null
        }));
        
        await db.collection(testCollectionName).insertMany(updatedAlerts);
        console.log('Re-inserted alerts with new schema');
        
        // Test update (this should work now)
        console.log('Testing update on regular collection...');
        try {
            const result = await db.collection(testCollectionName).updateOne(
                { 'meta.type': 'cpu' },
                { $set: { 'meta.acknowledged': true, acknowledgedAt: new Date() } }
            );
            console.log('✅ Update succeeded! Modified count:', result.modifiedCount);
        } catch (error) {
            console.log('❌ Update failed:', error instanceof Error ? error.message : String(error));
        }
        
        // Verify the update
        const updatedAlert = await db.collection(testCollectionName).findOne({ 'meta.type': 'cpu' });
        console.log('Updated alert:', {
            type: updatedAlert?.meta?.type,
            acknowledged: updatedAlert?.meta?.acknowledged,
            acknowledgedAt: updatedAlert?.acknowledgedAt
        });
        
        // Clean up test collection
        await db.collection(testCollectionName).drop();
        console.log('Cleaned up test collection');
        
        console.log('✅ Migration test completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration test failed:', error);
    } finally {
        await client.close();
    }
}

testMigration().catch(console.error);
