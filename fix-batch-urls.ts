import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixBatchUrls() {
  console.log('Fixing batch asset URLs...')

  const result = await prisma.$executeRaw`
    UPDATE assets
    SET public_url = REPLACE(public_url, '/assets/public/', '/')
    WHERE public_url LIKE '%/assets/public/%'
  `

  console.log(`Updated ${result} asset URLs`)

  // Show some examples
  const samples = await prisma.asset.findMany({
    where: {
      OR: [{ name: { contains: 'Batch_row' } }, { name: { contains: 'batch-row' } }],
    },
    select: {
      id: true,
      name: true,
      publicUrl: true,
    },
    take: 5,
  })

  console.log('\nSample updated assets:')
  samples.forEach(asset => {
    console.log(`- ${asset.name}: ${asset.publicUrl}`)
  })

  await prisma.$disconnect()
}

fixBatchUrls().catch(console.error)
