import { User, UserRole } from "@/types/types";

// Template users for development
export const TEMPLATE_USERS: User[] = [
  {
    id: "1",
    email: "admin@gmail.com",
    password: "admin123", // In production, this would be hashed
    role: UserRole.ADMIN,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    email: "standard@gmail.com",
    password: "standard123", // In production, this would be hashed
    role: UserRole.STANDARD,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];
