import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT,
    },
  },
});

async function main() {
  console.log("🔧 Creating work_purchases table...");

  try {
    // Create work_purchases table without cuid()
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "work_purchases" (
        id TEXT PRIMARY KEY DEFAULT (replace(gen_random_uuid()::text, '-', '')),
        user_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price_paid INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "work_purchases_user_id_idx" ON "work_purchases"("user_id")`;
    console.log("✅ Created work_purchases table");

    // Verify final state
    const subscriptions = await prisma.$queryRaw`SELECT id, plan, works_per_month, works_used FROM subscriptions`;
    console.log("\n📊 Current subscriptions:", subscriptions);

    console.log("\n🎉 Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
