import { MongoClient, Db } from "mongodb";
import dotenv from 'dotenv';

dotenv.config({ path: ['.env', '.env.local'], quiet: true });                   // Import environment variables

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/";
const database = process.env.NODE_ENV !== 'production' ? 'test' : 'oversight';  // Use the test database during development

declare global {                                                                // Global variables for hot module reload during development
    var mongoClient: MongoClient;
    var mongoDb: Db;
}

export default async function getDb(): Promise<Db> {
        
    if (globalThis.mongoDb) return globalThis.mongoDb;                          // Return the db instance if already exists

    if (!globalThis.mongoClient) {                                              // Create a client if it does not exist
        console.log(`🔗 MongoDB URI: ${uri}`);
        console.log(`📊 Database: ${database}`);
        let client = new MongoClient(uri);
        try {
            await client.connect();                                             // Connect the client to the database
        } catch (error) {
            console.log(`❌ MongoDB failed to connect`);
            throw(error)
        }
        globalThis.mongoClient = client;
        console.log(`✅ MongoDB connected successfully`);
    }

    globalThis.mongoDb = globalThis.mongoClient.db(database);                   // Create the db instance
    
    let collections = await globalThis.mongoDb.listCollections({},{nameOnly: true}).toArray();  // Get a list of collections present in the database

    if(!collections.find(collection=> collection.name === "performanceLog")) {  // Create the performance log collection if it does not exist
        await globalThis.mongoDb.createCollection(
            "performanceLog",
            {
                timeseries: {
                    timeField: "timestamp",
                    metaField: "meta"
                },
                expireAfterSeconds: 7889400 // Expire after 3 months
            }
        )
        console.log("MongoDB: Created performanceLog")
    }

    if(!collections.find(collection=> collection.name === "processLog")) {      // Create the process log collection if it does not exist
        await globalThis.mongoDb.createCollection(
            "processLog",
            {
                timeseries: {
                    timeField: "timestamp",
                    metaField: "meta"
                },
                expireAfterSeconds: 7889400 // Expire after 3 months
            }
        )
        console.log("MongoDB: Created processLog")
    }

    if(!collections.find(collection=> collection.name === "serviceLog")) {      // Create the service log collection if it does not exist
        await globalThis.mongoDb.createCollection(
            "serviceLog",
            {
                timeseries: {
                    timeField: "timestamp",
                    metaField: "meta"
                },
                expireAfterSeconds: 7889400 // Expire after 3 months
            }
        )
        console.log("MongoDB: Created serviceLog")
    }

        if(!collections.find(collection=> collection.name === "alertLog")) {        // Create the alert log collection if it does not exist
            await globalThis.mongoDb.createCollection("alertLog")
            console.log("MongoDB: Created alertLog")
            
            // Add TTL index for data expiration (3 months)
            await globalThis.mongoDb.collection("alertLog").createIndex(
                { "timestamp": 1 }, 
                { expireAfterSeconds: 7889400 }
            )
            console.log("MongoDB: Created TTL index for alertLog")
        }

    // Note: Users are now seeded manually via /api/seed endpoint

    return globalThis.mongoDb;
}