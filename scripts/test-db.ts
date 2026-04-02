import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Checking database state...");
  
  const users = await prisma.user.count();
  console.log("📊 Users:", users);
  
  const subscriptions = await prisma.subscription.findMany();
  console.log("📊 Subscriptions:", subscriptions);
  
  const projects = await prisma.project.count();
  console.log("📊 Projects:", projects);
  
  await prisma.$disconnect();
}

main().catch(console.error);
