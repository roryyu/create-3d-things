import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcryptjs from 'bcryptjs'

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') })

/** DATABASE_URL 上的 ?schema= 指定非 public schema，PrismaPg 连接需要显式传入。 */
function getSchemaFromUrl(url: string | undefined): string {
  if (!url) return 'public'
  const match = url.match(/[?&]schema=([^&]+)/)
  return match ? match[1] : 'public'
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!, { schema: getSchemaFromUrl(process.env.DATABASE_URL) }),
})

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'admin123'

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existing) {
    console.log(`管理员账号已存在：${ADMIN_EMAIL}`)
    return
  }

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email: ADMIN_EMAIL,
      password: await bcryptjs.hash(ADMIN_PASSWORD, 12),
      name: 'Admin',
      role: 'ADMIN',
    },
  })
  console.log(`管理员账号创建成功：${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })