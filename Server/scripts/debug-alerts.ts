import { MongoClient } from 'mongodb';

async function debugAlerts() {
    const uri = process.env.MONGODB_URI || "mongodb://OverSight:ITC309@timmarkut.com:27017/?directConnection=true&authSource=admin";
    const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';
    
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Database: ${database}`);
    
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(database);
        
        // Check current alert settings
        const settingsCollection = db.collection('settings');
        const alertSettings = await settingsCollection.findOne({ name: 'alerts' });

        console.log('\n📊 Current Alert Settings:');
        if (alertSettings) {
            console.log(`   CPU Threshold: ${alertSettings.cpu}%`);
            console.log(`   RAM Threshold: ${alertSettings.ram}%`);
            console.log(`   Disk Threshold: ${alertSettings.disk}%`);
            console.log(`   Timeout: ${alertSettings.timeout}ms (${alertSettings.timeout / 1000} seconds)`);
        } else {
            console.log('   No alert settings found.');
        }

        // Check recent alerts
        const alertLogCollection = db.collection('alertLog');
        const recentAlerts = await alertLogCollection.find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();

        console.log('\n📈 Recent Alerts (Last 20):');
        if (recentAlerts.length > 0) {
            const alertCounts = recentAlerts.reduce((acc, alert) => {
                const type = alert.meta?.type || 'unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            console.log('   Alert counts by type:', alertCounts);
            
            // Show recent alerts with timestamps
            recentAlerts.slice(0, 5).forEach((alert, index) => {
                const timeAgo = new Date().getTime() - new Date(alert.timestamp).getTime();
                const minutesAgo = Math.round(timeAgo / (1000 * 60));
                console.log(`   ${index + 1}. ${alert.meta?.type} - ${alert.reading}% (${minutesAgo}min ago)`);
            });
        } else {
            console.log('   No recent alerts found.');
        }

        // Check for potential flooding patterns
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentAlertsCount = await alertLogCollection.countDocuments({
            timestamp: { $gte: oneHourAgo }
        });
        
        console.log(`\n🚨 Alerts in last hour: ${recentAlertsCount}`);
        
        if (recentAlertsCount > 50) {
            console.log('   ⚠️  HIGH ALERT COUNT - Possible flooding detected!');
        } else if (recentAlertsCount > 20) {
            console.log('   ⚠️  Moderate alert count - Monitor closely');
        } else {
            console.log('   ✅ Alert count looks normal');
        }

    } catch (error) {
        console.error('Error debugging alerts:', error);
    } finally {
        await client.close();
    }
}

debugAlerts();
