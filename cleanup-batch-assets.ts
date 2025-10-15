import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  try {
    // Delete all assets with batch/row in the name
    const result = await prisma.asset.deleteMany({
      where: {
        OR: [
          { name: { contains: 'batch' } },
          { name: { contains: 'row' } },
          { slug: { contains: 'batch' } },
          { slug: { contains: 'row' } },
        ],
      },
    })

    console.log(`Deleted ${result.count} batch export assets from database`)
  } catch (error) {
    console.error('Error cleaning up assets:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
