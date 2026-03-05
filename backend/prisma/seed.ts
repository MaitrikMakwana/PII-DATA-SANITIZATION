import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...');

  const adminPass = await bcrypt.hash('Admin@123', 12);
  const userPass  = await bcrypt.hash('User@123',  12);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@pill.com' },
    update: {},
    create: {
      name:     'Super Admin',
      email:    'admin@pill.com',
      password: adminPass,
      role:     'ADMIN',
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where:  { email: 'user@pill.com' },
    update: {},
    create: {
      name:     'Test User',
      email:    'user@pill.com',
      password: userPass,
      role:     'USER',
      isActive: true,
    },
  });

  console.log(`✅  Admin  → ${admin.email}  (password: Admin@123)`);
  console.log(`✅  User   → ${user.email}   (password: User@123)`);
  console.log('🌱  Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
