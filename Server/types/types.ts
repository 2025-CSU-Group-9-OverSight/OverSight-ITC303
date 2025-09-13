export type User = {
    id: string;
    name?: string;
    email: string;
    password: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export enum UserRole {
    ADMIN = "admin",
    STANDARD = "standard"
}
