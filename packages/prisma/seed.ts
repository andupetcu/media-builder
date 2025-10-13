import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'demo@mediabuilder.com' },
    update: {},
    create: {
      email: 'demo@mediabuilder.com',
      passwordHash,
      name: 'Demo User',
    },
  })

  console.log('Created user:', user.email)

  // Create demo org
  const org = await prisma.org.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  })

  console.log('Created organization:', org.name)

  // Add user to org as owner
  const orgMember = await prisma.orgMember.upsert({
    where: {
      orgId_userId: {
        orgId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      orgId: org.id,
      userId: user.id,
      role: Role.OWNER,
    },
  })

  console.log('Created org membership')

  // Create demo team
  const team = await prisma.team.upsert({
    where: {
      orgId_slug: {
        orgId: org.id,
        slug: 'marketing',
      },
    },
    update: {},
    create: {
      orgId: org.id,
      name: 'Marketing Team',
      slug: 'marketing',
    },
  })

  console.log('Created team:', team.name)

  // Add user to team
  await prisma.teamMember.upsert({
    where: {
      teamId_orgMemberId: {
        teamId: team.id,
        orgMemberId: orgMember.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      orgMemberId: orgMember.id,
      role: Role.OWNER,
    },
  })

  console.log('Created team membership')

  // Create a sample design
  const design = await prisma.design.create({
    data: {
      teamId: team.id,
      createdBy: user.id,
      name: 'Welcome Banner',
      slug: 'welcome-banner',
      doc: {
        pages: [
          {
            id: 'page1',
            children: [
              {
                type: 'text',
                x: 100,
                y: 100,
                text: 'Welcome to Media Builder',
                fontSize: 48,
                fontFamily: 'Arial',
              },
            ],
          },
        ],
      },
      width: 1920,
      height: 1080,
    },
  })

  console.log('Created design:', design.name)

  // Create feature flags
  const flags = [
    { key: 'FF_RVM', enabled: false },
    { key: 'FF_VIDEO_4K', enabled: false },
  ]

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { enabled: flag.enabled },
      create: flag,
    })
  }

  console.log('Created feature flags')

  console.log('Seed completed successfully!')
}

main()
  .catch(e => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
