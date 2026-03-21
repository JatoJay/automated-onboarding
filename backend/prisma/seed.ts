import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const org = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      settings: {
        timezone: 'UTC',
        features: {
          aiChat: true,
          documentUpload: true,
          externalDocs: true,
        },
      },
    },
  });

  console.log('Created organization:', org.name);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  console.log('Created admin user:', admin.email);

  const hrPassword = await bcrypt.hash('hr123456', 10);
  const hr = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {},
    create: {
      email: 'hr@company.com',
      passwordHash: hrPassword,
      firstName: 'HR',
      lastName: 'Manager',
      role: 'HR',
      organizationId: org.id,
    },
  });

  console.log('Created HR user:', hr.email);

  const dept = await prisma.department.upsert({
    where: {
      name_organizationId: {
        name: 'Engineering',
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      name: 'Engineering',
      organizationId: org.id,
    },
  });

  console.log('Created department:', dept.name);

  const plan = await prisma.onboardingPlan.upsert({
    where: { id: 'default-engineering-plan' },
    update: {},
    create: {
      id: 'default-engineering-plan',
      name: 'Engineering Onboarding',
      description: 'Standard onboarding plan for engineering team members',
      departmentId: dept.id,
      isDefault: true,
    },
  });

  console.log('Created onboarding plan:', plan.name);

  const taskTemplates = [
    { title: 'Complete HR paperwork', type: 'DOCUMENT', daysFromStart: 0, order: 1 },
    { title: 'Set up development environment', type: 'DOCUMENT', daysFromStart: 1, order: 2 },
    { title: 'Review company policies', type: 'DOCUMENT', daysFromStart: 1, order: 3 },
    { title: 'Meet with your manager', type: 'MEETING', daysFromStart: 1, order: 4 },
    { title: 'Complete security training', type: 'TRAINING', daysFromStart: 2, order: 5 },
    { title: 'Set up access to tools (GitHub, Slack, etc.)', type: 'DOCUMENT', daysFromStart: 2, order: 6 },
    { title: 'Review codebase documentation', type: 'DOCUMENT', daysFromStart: 3, order: 7 },
    { title: 'First code review participation', type: 'APPROVAL', daysFromStart: 5, order: 8 },
  ];

  for (const template of taskTemplates) {
    await prisma.taskTemplate.create({
      data: {
        onboardingPlanId: plan.id,
        title: template.title,
        type: template.type as any,
        daysFromStart: template.daysFromStart,
        order: template.order,
        isRequired: true,
      },
    });
  }

  console.log('Created task templates');

  console.log('\n✅ Database seeded successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin: admin@company.com / admin123');
  console.log('  HR: hr@company.com / hr123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
