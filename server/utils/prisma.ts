import { PrismaClient } from "@/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

/** DATABASE_URL 上的 ?schema= 指定非 public schema，PrismaPg 连接需要显式传入。 */
function getSchemaFromUrl(url: string | undefined): string {
  if (!url) return 'public'
  const match = url.match(/[?&]schema=([^&]+)/)
  return match ? match[1] : 'public'
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!, { schema: getSchemaFromUrl(process.env.DATABASE_URL) }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

// 开发环境热重载时复用单例，避免连接数膨胀。
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma