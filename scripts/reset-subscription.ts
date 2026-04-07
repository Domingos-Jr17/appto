import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT,
    },
  },
});

async function main() {
  console.log("🔧 Resetting subscription worksUsed...\n");

  try {
    // Show current state
    const subs = await prisma.subscription.findMany({
      select: { id: true, userId: true, package: true, status: true, worksPerMonth: true, worksUsed: true },
    });
    console.log("📊 Current subscriptions:", JSON.stringify(subs, null, 2));

    // Reset all subscriptions to 0
    const updated = await prisma.subscription.updateMany({
      where: { status: 'ACTIVE' },
      data: { worksUsed: 0 },
    });
    console.log(`\n✅ Reset worksUsed for ${updated.count} active subscriptions`);

    // Verify
    const afterReset = await prisma.subscription.findMany({
      select: { id: true, userId: true, package: true, status: true, worksPerMonth: true, worksUsed: true },
    });
    console.log("\n📊 After reset:", JSON.stringify(afterReset, null, 2));

  } catch (error) {
    console.error("❌ Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
