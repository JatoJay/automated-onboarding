import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo data...\n');

  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      domain: 'acme.com',
      settings: {
        timezone: 'America/New_York',
        features: {
          aiChat: true,
          documentUpload: true,
          externalDocs: true,
        },
      },
    },
  });
  console.log('Created organization:', org.name);

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name_organizationId: { name: 'Engineering', organizationId: org.id } },
      update: {},
      create: { name: 'Engineering', organizationId: org.id, description: 'Software development and infrastructure' },
    }),
    prisma.department.upsert({
      where: { name_organizationId: { name: 'Human Resources', organizationId: org.id } },
      update: {},
      create: { name: 'Human Resources', organizationId: org.id, description: 'People operations and culture' },
    }),
    prisma.department.upsert({
      where: { name_organizationId: { name: 'Marketing', organizationId: org.id } },
      update: {},
      create: { name: 'Marketing', organizationId: org.id, description: 'Brand, growth, and communications' },
    }),
    prisma.department.upsert({
      where: { name_organizationId: { name: 'Sales', organizationId: org.id } },
      update: {},
      create: { name: 'Sales', organizationId: org.id, description: 'Revenue and customer acquisition' },
    }),
    prisma.department.upsert({
      where: { name_organizationId: { name: 'Product', organizationId: org.id } },
      update: {},
      create: { name: 'Product', organizationId: org.id, description: 'Product strategy and management' },
    }),
  ]);
  console.log('Created departments:', departments.map(d => d.name).join(', '));

  const [engineering, hr, marketing, sales, product] = departments;

  const password = await bcrypt.hash('demo1234', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@acme.com' },
      update: {},
      create: { email: 'admin@acme.com', passwordHash: password, firstName: 'Alex', lastName: 'Admin', role: 'ADMIN', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'hr@acme.com' },
      update: {},
      create: { email: 'hr@acme.com', passwordHash: password, firstName: 'Hannah', lastName: 'Roberts', role: 'HR', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'sarah.chen@acme.com' },
      update: {},
      create: { email: 'sarah.chen@acme.com', passwordHash: password, firstName: 'Sarah', lastName: 'Chen', role: 'MANAGER', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'mike.johnson@acme.com' },
      update: {},
      create: { email: 'mike.johnson@acme.com', passwordHash: password, firstName: 'Mike', lastName: 'Johnson', role: 'MANAGER', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'emily.davis@acme.com' },
      update: {},
      create: { email: 'emily.davis@acme.com', passwordHash: password, firstName: 'Emily', lastName: 'Davis', role: 'EMPLOYEE', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'james.wilson@acme.com' },
      update: {},
      create: { email: 'james.wilson@acme.com', passwordHash: password, firstName: 'James', lastName: 'Wilson', role: 'EMPLOYEE', organizationId: org.id },
    }),
    prisma.user.upsert({
      where: { email: 'lisa.martinez@acme.com' },
      update: {},
      create: { email: 'lisa.martinez@acme.com', passwordHash: password, firstName: 'Lisa', lastName: 'Martinez', role: 'EMPLOYEE', organizationId: org.id },
    }),
  ]);
  console.log('Created users:', users.length);

  const [admin, hrUser, sarahManager, mikeManager, emily, james, lisa] = users;

  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { userId: sarahManager.id },
      update: {},
      create: {
        userId: sarahManager.id,
        departmentId: engineering.id,
        jobTitle: 'Engineering Manager',
        startDate: new Date('2022-03-15'),
        onboardingStatus: 'COMPLETED',
      },
    }),
    prisma.employee.upsert({
      where: { userId: mikeManager.id },
      update: {},
      create: {
        userId: mikeManager.id,
        departmentId: marketing.id,
        jobTitle: 'Marketing Director',
        startDate: new Date('2021-08-01'),
        onboardingStatus: 'COMPLETED',
      },
    }),
    prisma.employee.upsert({
      where: { userId: emily.id },
      update: {},
      create: {
        userId: emily.id,
        departmentId: engineering.id,
        managerId: sarahManager.id,
        jobTitle: 'Software Engineer',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        onboardingStatus: 'IN_PROGRESS',
      },
    }),
    prisma.employee.upsert({
      where: { userId: james.id },
      update: {},
      create: {
        userId: james.id,
        departmentId: engineering.id,
        managerId: sarahManager.id,
        jobTitle: 'Senior Software Engineer',
        startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        onboardingStatus: 'IN_PROGRESS',
      },
    }),
    prisma.employee.upsert({
      where: { userId: lisa.id },
      update: {},
      create: {
        userId: lisa.id,
        departmentId: marketing.id,
        managerId: mikeManager.id,
        jobTitle: 'Marketing Specialist',
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        onboardingStatus: 'IN_PROGRESS',
      },
    }),
  ]);
  console.log('Created employees:', employees.length);

  const [sarahEmp, mikeEmp, emilyEmp, jamesEmp, lisaEmp] = employees;

  const taskTemplatesData = [
    { title: 'Complete HR onboarding paperwork', type: 'DOCUMENT', daysFromStart: 1, description: 'Fill out all required employment documents, tax forms, and benefits enrollment.' },
    { title: 'Set up workstation and accounts', type: 'DOCUMENT', daysFromStart: 1, description: 'Configure your laptop, email, Slack, and other essential tools.' },
    { title: 'Complete security awareness training', type: 'TRAINING', daysFromStart: 2, description: 'Learn about company security policies and best practices.' },
    { title: 'Meet with your manager', type: 'MEETING', daysFromStart: 2, description: 'Initial 1:1 to discuss role expectations and first week goals.' },
    { title: 'Review company policies and handbook', type: 'DOCUMENT', daysFromStart: 3, description: 'Read through the employee handbook and company policies.' },
    { title: 'Team introductions', type: 'MEETING', daysFromStart: 3, description: 'Meet your immediate team members and learn about their roles.' },
    { title: 'Set up development environment', type: 'DOCUMENT', daysFromStart: 5, description: 'Install required software, clone repositories, and verify access.' },
    { title: 'Review codebase documentation', type: 'DOCUMENT', daysFromStart: 7, description: 'Familiarize yourself with architecture docs and coding standards.' },
    { title: 'Complete first small task', type: 'APPROVAL', daysFromStart: 14, description: 'Pick up and complete your first ticket or project task.' },
    { title: 'First code review', type: 'APPROVAL', daysFromStart: 14, description: 'Submit your first pull request and participate in code review.' },
    { title: '30-day check-in with manager', type: 'MEETING', daysFromStart: 30, description: 'Review progress, discuss challenges, and set goals for month 2.' },
    { title: 'Present learnings to team', type: 'MEETING', daysFromStart: 45, description: 'Share what you\'ve learned and your observations with the team.' },
    { title: 'Complete department-specific training', type: 'TRAINING', daysFromStart: 60, description: 'Finish all required department training modules.' },
    { title: '60-day performance discussion', type: 'MEETING', daysFromStart: 60, description: 'Mid-point review of onboarding progress.' },
    { title: '90-day review and goal setting', type: 'MEETING', daysFromStart: 90, description: 'Final onboarding review and transition to regular performance cycle.' },
  ];

  const plan = await prisma.onboardingPlan.upsert({
    where: { id: 'standard-30-60-90-plan' },
    update: {},
    create: {
      id: 'standard-30-60-90-plan',
      name: 'Standard 30-60-90 Day Plan',
      description: 'Comprehensive onboarding plan for all new employees',
      isDefault: true,
    },
  });

  await prisma.taskTemplate.deleteMany({ where: { onboardingPlanId: plan.id } });
  for (let i = 0; i < taskTemplatesData.length; i++) {
    await prisma.taskTemplate.create({
      data: {
        onboardingPlanId: plan.id,
        title: taskTemplatesData[i].title,
        description: taskTemplatesData[i].description,
        type: taskTemplatesData[i].type as any,
        daysFromStart: taskTemplatesData[i].daysFromStart,
        order: i + 1,
        isRequired: true,
      },
    });
  }
  console.log('Created onboarding plan with', taskTemplatesData.length, 'task templates');

  const createTasksForEmployee = async (employee: any, completedCount: number) => {
    const startDate = new Date(employee.startDate);
    await prisma.task.deleteMany({ where: { employeeId: employee.id } });

    for (let i = 0; i < taskTemplatesData.length; i++) {
      const template = taskTemplatesData[i];
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + template.daysFromStart);

      const isCompleted = i < completedCount;
      await prisma.task.create({
        data: {
          employeeId: employee.id,
          title: template.title,
          description: template.description,
          type: template.type as any,
          status: isCompleted ? 'COMPLETED' : (i === completedCount ? 'IN_PROGRESS' : 'PENDING'),
          dueDate,
          completedAt: isCompleted ? new Date() : null,
        },
      });
    }
  };

  await createTasksForEmployee(emilyEmp, 4);
  await createTasksForEmployee(jamesEmp, 9);
  await createTasksForEmployee(lisaEmp, 11);
  console.log('Created tasks for employees');

  const knowledgeDocs = [
    {
      title: 'Company Holidays 2024',
      category: 'HR Policies',
      isOrgWide: true,
      content: `# Company Holidays 2024

Acme Corporation observes the following paid holidays:

## Fixed Holidays
- **New Year's Day** - January 1 (Monday)
- **Martin Luther King Jr. Day** - January 15 (Monday)
- **Presidents Day** - February 19 (Monday)
- **Memorial Day** - May 27 (Monday)
- **Independence Day** - July 4 (Thursday)
- **Labor Day** - September 2 (Monday)
- **Thanksgiving Day** - November 28 (Thursday)
- **Day after Thanksgiving** - November 29 (Friday)
- **Christmas Eve** - December 24 (Tuesday)
- **Christmas Day** - December 25 (Wednesday)
- **New Year's Eve** - December 31 (Tuesday)

## Floating Holidays
Each employee also receives 2 floating holidays per year that can be used at their discretion with manager approval.

## Holiday Pay
- Full-time employees receive regular pay for company holidays
- Part-time employees receive prorated holiday pay
- If a holiday falls on a weekend, it will be observed on the nearest weekday`,
    },
    {
      title: 'Employee Handbook Overview',
      category: 'HR Policies',
      isOrgWide: true,
      content: `# Employee Handbook Overview

Welcome to Acme Corporation! This handbook outlines our key policies and benefits.

## Core Values
1. **Innovation** - We embrace new ideas and continuous improvement
2. **Integrity** - We act honestly and ethically in all situations
3. **Collaboration** - We work together to achieve shared goals
4. **Excellence** - We strive for quality in everything we do

## Work Hours
- Standard hours: 9 AM - 5 PM local time
- Flexible scheduling available with manager approval
- Core collaboration hours: 10 AM - 3 PM

## Time Off
- **PTO**: 20 days per year (accrued monthly)
- **Sick Leave**: 10 days per year
- **Parental Leave**: 12 weeks paid
- **Bereavement**: 5 days for immediate family

## Benefits
- Health, dental, and vision insurance (company pays 80%)
- 401(k) with 4% company match
- $5,000 annual learning stipend
- Home office setup allowance

## Code of Conduct
All employees are expected to treat colleagues with respect, maintain confidentiality, and follow security protocols.`,
    },
    {
      title: 'Development Environment Setup Guide',
      category: 'Engineering',
      departmentId: 'engineering',
      content: `# Development Environment Setup

Welcome to the Engineering team! Follow these steps to set up your development environment.

## Prerequisites
1. MacOS or Linux (Windows with WSL2 also supported)
2. Admin access to your machine

## Step 1: Install Core Tools
\`\`\`bash
# Install Homebrew (macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install essential packages
brew install git node@20 docker docker-compose postgresql@15
\`\`\`

## Step 2: Configure Git
\`\`\`bash
git config --global user.name "Your Name"
git config --global user.email "your.email@acme.com"
\`\`\`

## Step 3: Clone Repositories
\`\`\`bash
git clone git@github.com:acme/main-app.git
git clone git@github.com:acme/shared-libs.git
git clone git@github.com:acme/infrastructure.git
\`\`\`

## Step 4: Install Dependencies
\`\`\`bash
cd main-app
npm install
cp .env.example .env.local
\`\`\`

## Step 5: Start Development Server
\`\`\`bash
npm run dev
# App will be available at http://localhost:3000
\`\`\`

## Getting Help
- Slack: #engineering-help
- Wiki: https://wiki.acme.com/engineering
- Contact: Sarah Chen (Engineering Manager)`,
    },
    {
      title: 'First Week Focus Guide',
      category: 'Onboarding',
      isOrgWide: true,
      content: `# What to Focus On in Your First Week

Your first week is about getting oriented and building relationships. Here's what to prioritize:

## Day 1: Setup & Orientation
- Complete HR paperwork and benefits enrollment
- Set up your workstation and accounts
- Review your welcome packet
- Have lunch with your manager

## Day 2-3: Learn the Basics
- Complete required training (security, compliance)
- Get access to all necessary tools and systems
- Start reading team documentation
- Schedule intro meetings with team members

## Day 4-5: Start Engaging
- Attend team meetings and standups
- Shadow a colleague on their work
- Ask lots of questions (there are no stupid questions!)
- Begin your first small task or project

## Tips for Success
1. **Take notes** - You'll receive a lot of information
2. **Ask questions** - Everyone expects you to ask
3. **Be patient** - It takes time to feel comfortable
4. **Meet people** - Building relationships is key
5. **Document learnings** - Write down what you discover

## Key People to Meet
- Your direct manager
- Your team members
- Your onboarding buddy
- HR contact for benefits questions
- IT support contact`,
    },
    {
      title: 'Key People and Team Structure',
      category: 'Company Info',
      isOrgWide: true,
      content: `# Key People to Know at Acme

## Executive Team
- **CEO**: John Smith - Sets company vision and strategy
- **CTO**: Maria Garcia - Leads technology and engineering
- **CFO**: David Lee - Manages finance and operations
- **CPO**: Jennifer Wong - Oversees product strategy
- **CHRO**: Robert Taylor - Heads people and culture

## Department Heads
- **Engineering**: Sarah Chen (VP Engineering)
- **Marketing**: Mike Johnson (VP Marketing)
- **Sales**: Amanda Brown (VP Sales)
- **Product**: Chris Miller (VP Product)
- **HR**: Hannah Roberts (HR Director)

## Your Key Contacts
- **IT Support**: it-help@acme.com or Slack #it-help
- **HR Questions**: hr@acme.com or Hannah Roberts
- **Facilities**: facilities@acme.com
- **Security**: security@acme.com

## How Teams Work Together
1. **Product & Engineering** - Collaborate on feature development
2. **Marketing & Sales** - Align on go-to-market strategies
3. **HR & All Teams** - Support hiring, culture, and people ops
4. **Engineering & IT** - Manage infrastructure and tools`,
    },
    {
      title: 'Important Company Policies',
      category: 'HR Policies',
      isOrgWide: true,
      content: `# Important Company Policies

## Remote Work Policy
- Hybrid work: 2 days in office minimum (Tues & Thurs)
- Full remote available for some roles with manager approval
- Core hours: 10 AM - 3 PM for team availability
- Home office stipend: $500 for setup

## Security Policy
- Use company-provided devices for work
- Enable 2FA on all accounts
- Never share passwords or credentials
- Report security incidents to security@acme.com
- Lock your computer when away from desk

## Expense Policy
- Submit expenses within 30 days
- Meals: $25 per person limit for team events
- Travel: Book through approved vendors
- All expenses over $500 require manager pre-approval

## Communication Guidelines
- Slack for quick questions and team chat
- Email for external communication and formal requests
- Video calls for meetings (cameras on preferred)
- Document decisions in Notion/Confluence

## Performance Reviews
- Quarterly check-ins with manager
- Annual formal performance review
- 360 feedback collected annually
- Goals set at start of each quarter`,
    },
    {
      title: 'Performance Review Process',
      category: 'HR Policies',
      isOrgWide: true,
      content: `# Performance Reviews at Acme

## Review Cycle
- **Quarterly Check-ins**: Informal progress discussions with your manager
- **Annual Review**: Comprehensive review in Q4
- **Compensation Review**: Annually in January

## What We Evaluate
1. **Goal Achievement** - Did you meet your quarterly objectives?
2. **Core Competencies** - Technical skills, collaboration, communication
3. **Values Alignment** - Living our company values
4. **Growth** - Professional development and learning

## The Process
1. **Self-Assessment** - Complete your self-review (2 weeks before)
2. **Manager Review** - Manager completes their assessment
3. **Calibration** - Leadership aligns ratings across teams
4. **1:1 Discussion** - Review feedback with your manager
5. **Goal Setting** - Set objectives for next period

## Rating Scale
- **Exceeds Expectations** - Consistently above targets
- **Meets Expectations** - Solid performance, meets goals
- **Developing** - Room for improvement, needs support
- **Below Expectations** - Significant gaps to address

## Tips for Success
- Track your wins throughout the quarter
- Request feedback regularly, not just at review time
- Be specific when writing your self-assessment
- Prepare questions for your review meeting`,
    },
    {
      title: 'Engineering Team Overview',
      category: 'Engineering',
      departmentId: 'engineering',
      content: `# Engineering Team at Acme

## Team Structure
The Engineering team is organized into squads:

### Platform Squad
- Focus: Infrastructure, DevOps, and shared services
- Tech: AWS, Kubernetes, Terraform, Go
- Lead: Alex Thompson

### Product Squad
- Focus: Core product features
- Tech: React, Node.js, PostgreSQL
- Lead: Sarah Chen

### Data Squad
- Focus: Analytics, ML, and data pipelines
- Tech: Python, Spark, Snowflake
- Lead: Priya Patel

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js/NestJS, Python/FastAPI
- **Database**: PostgreSQL, Redis, Elasticsearch
- **Infrastructure**: AWS, Kubernetes, Terraform
- **CI/CD**: GitHub Actions, ArgoCD

## Development Practices
- **Agile/Scrum**: 2-week sprints
- **Code Review**: All PRs require 2 approvals
- **Testing**: 80% coverage minimum
- **Documentation**: ADRs for major decisions

## Meetings
- Daily standup: 9:30 AM
- Sprint planning: Mondays
- Retrospective: Every 2 weeks
- Tech talks: Fridays 3 PM

## Getting Started
1. Join #engineering and #engineering-help on Slack
2. Get access to GitHub org
3. Review architecture docs in Notion
4. Pair with a buddy on your first PR`,
    },
    {
      title: 'How to Request Feedback',
      category: 'Professional Development',
      isOrgWide: true,
      content: `# Requesting Feedback from Your Manager

Regular feedback is essential for your growth. Here's how to get the most out of feedback conversations.

## When to Ask for Feedback
- After completing a major project
- During your regular 1:1s
- After presentations or demos
- When trying something new
- If you're unsure about your performance

## How to Ask
1. **Be specific**: "Can you give me feedback on my presentation style?" vs "How am I doing?"
2. **Be timely**: Ask soon after the relevant event
3. **Be open**: Show you genuinely want to improve

## Good Questions to Ask
- "What's one thing I could do better in [specific area]?"
- "What would help me get to the next level?"
- "How did that project go from your perspective?"
- "What skills should I focus on developing?"
- "Is there anything I should start/stop doing?"

## After Receiving Feedback
1. **Listen** without being defensive
2. **Thank** them for the feedback
3. **Clarify** anything you don't understand
4. **Reflect** on what you heard
5. **Act** on the feedback
6. **Follow up** to show progress

## Creating a Feedback Culture
- Give feedback to others too
- Make feedback a regular habit
- Celebrate improvements
- Be patient with yourself`,
    },
    {
      title: '90-Day Review Preparation Guide',
      category: 'Onboarding',
      isOrgWide: true,
      content: `# Preparing for Your 90-Day Review

Your 90-day review marks the end of your onboarding period. Here's how to prepare.

## What to Expect
- A formal conversation with your manager (30-60 minutes)
- Review of your onboarding progress
- Discussion of your performance so far
- Goal setting for the next quarter

## How to Prepare
### 1. Reflect on Your Accomplishments
- What tasks/projects did you complete?
- What did you learn?
- What challenges did you overcome?
- What feedback have you received?

### 2. Gather Evidence
- List of completed onboarding tasks
- Projects you contributed to
- Positive feedback from colleagues
- Metrics or results if applicable

### 3. Identify Growth Areas
- What skills do you want to develop?
- Where do you need more support?
- What resources would help you?

### 4. Prepare Questions
- What are the expectations for the next quarter?
- How can I increase my impact?
- What does success look like in 6 months?
- Are there growth opportunities I should pursue?

## During the Review
- Be honest about challenges you faced
- Ask for specific examples with feedback
- Take notes on action items
- Clarify expectations going forward

## After the Review
- Send a follow-up summary
- Create an action plan for feedback
- Schedule regular check-ins
- Celebrate completing onboarding!`,
    },
    {
      title: 'Career Development and Growth',
      category: 'Professional Development',
      isOrgWide: true,
      content: `# Career Development at Acme

We're committed to helping you grow your career. Here are the resources and opportunities available.

## Learning Resources
- **Learning Stipend**: $5,000/year for courses, books, conferences
- **LinkedIn Learning**: Free access for all employees
- **Internal Training**: Regular workshops and lunch-and-learns
- **Mentorship Program**: Formal mentor matching available

## Career Paths
### Individual Contributor Track
Junior → Mid → Senior → Staff → Principal → Fellow

### Management Track
Team Lead → Engineering Manager → Director → VP

### Specialist Tracks
Available in areas like Security, Data, DevOps, etc.

## How to Grow
1. **Set Goals**: Work with your manager on development objectives
2. **Seek Feedback**: Regular feedback accelerates growth
3. **Take on Challenges**: Stretch assignments build skills
4. **Build Network**: Connect with people across the company
5. **Share Knowledge**: Teaching others deepens expertise

## Promotion Process
- Nominations during annual review cycle
- Based on demonstrated impact at next level
- Requires manager sponsorship
- Calibrated across teams for fairness

## Getting Started
1. Discuss career goals with your manager
2. Identify skills to develop
3. Create a learning plan
4. Find a mentor if desired
5. Look for stretch opportunities`,
    },
    {
      title: 'Marketing Team Guide',
      category: 'Marketing',
      departmentId: 'marketing',
      content: `# Marketing Team at Acme

## Team Structure
- **Brand & Creative**: Visual identity, design, content
- **Growth Marketing**: Paid acquisition, SEO, analytics
- **Product Marketing**: Positioning, launches, sales enablement
- **Communications**: PR, internal comms, events

## Key Tools
- **HubSpot**: Marketing automation and CRM
- **Figma**: Design collaboration
- **Google Analytics**: Web analytics
- **Looker**: Business intelligence
- **Contentful**: Content management

## Weekly Rhythm
- Monday: Team standup and planning
- Tuesday: Creative review
- Wednesday: Campaign check-ins
- Thursday: Cross-functional syncs
- Friday: Metrics review

## Current Priorities
1. Brand awareness campaigns
2. Product launch support
3. Content marketing program
4. Lead generation optimization
5. Customer advocacy program

## Getting Started
1. Join #marketing and #marketing-creative Slack channels
2. Get access to HubSpot and analytics tools
3. Review brand guidelines in Figma
4. Meet with each team lead
5. Shadow a campaign launch`,
    },
  ];

  console.log('\nCreating knowledge documents...');

  for (const doc of knowledgeDocs) {
    const departmentId = doc.departmentId === 'engineering' ? engineering.id :
                         doc.departmentId === 'marketing' ? marketing.id : null;

    const existing = await prisma.knowledgeDocument.findFirst({
      where: { title: doc.title, organizationId: org.id },
    });

    if (!existing) {
      await prisma.knowledgeDocument.create({
        data: {
          organizationId: org.id,
          departmentId,
          title: doc.title,
          content: doc.content,
          category: doc.category,
          documentType: 'MD',
          status: 'PENDING',
          isOrgWide: doc.isOrgWide || false,
        },
      });
      console.log('  Created:', doc.title);
    } else {
      console.log('  Exists:', doc.title);
    }
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo Accounts (all use password: demo1234):');
  console.log('  Admin:     admin@acme.com');
  console.log('  HR:        hr@acme.com');
  console.log('  Manager:   sarah.chen@acme.com (Engineering)');
  console.log('  Manager:   mike.johnson@acme.com (Marketing)');
  console.log('  Employee:  emily.davis@acme.com (Day 5 - first week)');
  console.log('  Employee:  james.wilson@acme.com (Day 25 - first month)');
  console.log('  Employee:  lisa.martinez@acme.com (Day 45 - second month)');
  console.log('\n💡 Run the indexing endpoint to add documents to Qdrant for AI chat.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
