import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Debugging subscription data...\n");
  
  // Get all users
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log("Users:", users);

  // Check each user's subscription
  for (const user of users) {
    console.log(`\n=== User: ${user.email} (${user.id}) ===`);
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    
    console.log("Subscription from DB:", JSON.stringify(subscription, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
