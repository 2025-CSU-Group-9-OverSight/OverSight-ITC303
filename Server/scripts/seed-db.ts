import getDb from "../lib/getDb";
import { TEMPLATE_USERS } from "../lib/auth";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

async function seedDatabase() {
    try {
        console.log("Starting database seeding...");
        
        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Clear existing users
        const deleteResult = await usersCollection.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing users`);
        
        // Hash passwords and prepare users for database
        const hashedUsers = await Promise.all(
            TEMPLATE_USERS.map(async (user) => ({
                _id: new ObjectId(), // Generate new ObjectId
                id: user.id, // Keep original template ID for reference
                name: user.name,
                email: user.email,
                password: await bcrypt.hash(user.password, 12),
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }))
        );
        
        // Insert users into database
        const result = await usersCollection.insertMany(hashedUsers);
        console.log(`Successfully seeded database with ${result.insertedCount} users:`);
        
        hashedUsers.forEach(user => {
            console.log(`- ${user.name} (${user.email}) - ${user.role}`);
        });
        
        console.log("Database seeding completed successfully!");
        
    } catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
}

seedDatabase();
