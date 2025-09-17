import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/";


declare global {                                        // Global variables for hot module reload during development
    var mongoClient: MongoClient;
    var mongoDb: Db;
}

export default async function getDb(): Promise<Db> {
        
    if (globalThis.mongoDb) return globalThis.mongoDb;  // Return the db instance if already exists

    if (!globalThis.mongoClient) {                      // Create a client if it does not exist
        globalThis.mongoClient = new MongoClient(uri);
        await globalThis.mongoClient.connect();         // Connect the client to the database
    }

    globalThis.mongoDb = globalThis.mongoClient.db();   // Create the db instance
    
    return globalThis.mongoDb;
}