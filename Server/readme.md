This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Environment Setup

First, create a `.env.local` file in the root directory with the following content:

```env
# MongoDB
MONGODB_URI=mongodb://user:password@localhost:27017

# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

#### Generate a Secure Secret Key

Use OpenSSL to generate a secure secret key:

```bash
openssl rand -base64 32
```

Copy the generated key and replace `your-secret-key-here` in the `.env.local` file.

#### MongoDB

For developemnt you can either setup a local server by following the [MongoDB setup guide](../Database/readme.md) or use the server posted in the project discord.

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed the Database

Before running the application, you need to seed the database with template users and mock data:

```bash
# Option 1: Using the API endpoint (recommended)
curl -X POST http://localhost:3000/api/seed

# Option 2: Using the standalone script
npx tsx scripts/seed-db.ts
```

**Note**: The seed endpoint clears all existing users and populates the database with template users. Make sure your MongoDB connection is working before seeding.

#### Verify Seeding

You can check if the database was seeded successfully:

```bash
# Check current users in database
curl http://localhost:3000/api/seed
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Authentication

This project uses NextAuth.js for authentication with template users:

- **Admin User**: admin@gmail.com / admin123
- **Standard User**: standard@gmail.com / standard123

Users are automatically redirected to role-specific dashboards:
- Admin users → `/dashboard/admin`
- Standard users → `/dashboard/standard`

## UI Library
We use shadcn/ui for UI components, view and install from here: https://ui.shadcn.com/docs/

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.