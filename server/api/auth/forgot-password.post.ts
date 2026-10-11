import { z } from 'zod'
import crypto from 'node:crypto'
import { prisma } from '../../utils/prisma'

const forgotPasswordSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, forgotPasswordSchema.parse)

  const user = await prisma.user.findUnique({
    where: { email: body.email },
  })

  // 无论邮箱是否存在都返回同一句话，避免泄露账号注册情况。
  if (!user) {
    return { message: '如果该邮箱已注册，您将收到重置密码邮件' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordReset.create({
    data: {
      email: body.email,
      token,
      expiresAt,
    },
  })

  // TODO: 接入邮件服务，向用户下发 ${AUTH_ORIGIN}/reset-password?token=…。
  // 开发环境没有邮件服务，只能把链接打到日志里；生产环境绝不打印令牌。
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[auth/forgot-password] 已为 ${body.email} 生成重置令牌，但未接入邮件服务，该用户的密码重置将无法完成`)
  }
  else {
    console.log(`[auth/forgot-password] 重置链接：${process.env.AUTH_ORIGIN || 'http://localhost:3000'}/reset-password?token=${token}`)
  }

  return { message: '如果该邮箱已注册，您将收到重置密码邮件' }
})