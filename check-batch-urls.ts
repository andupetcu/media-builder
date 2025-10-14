import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBatchUrls() {
  const assets = await prisma.asset.findMany({
    where: {
      name: { contains: 'batch-row' },
    },
    select: {
      name: true,
      path: true,
      publicUrl: true,
    },
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('Recent batch assets:')
  assets.forEach(asset => {
    console.log(`\nName: ${asset.name}`)
    console.log(`Path: ${asset.path}`)
    console.log(`URL: ${asset.publicUrl}`)
  })

  await prisma.$disconnect()
}

checkBatchUrls().catch(console.error)
