# CLAUDE.md · Create 3D Things

给在本仓库工作的 Agent 的速查说明。人类文档见 `README.md`。

## 范围

单功能应用：**文字/图片 → 3D CAD 模型**。没有工作台、任务队列、图片识别、对象存储、
管理后台。引入新能力前先确认它属于建模主链路。

## 路由与鉴权

- 文件式路由，`app/pages/` 下：`index.vue`（重定向 `/cad`）、`cad.vue`、
  `login/register/forgot-password/reset-password.vue`。
- `app/middleware/auth.ts`：`useAuth().status !== 'authenticated'` 时跳 `/login`。
  `cad.vue` 声明 `middleware: 'auth'`；`forgot-password` / `reset-password` 用 nuxt-auth
  内置的 `auth: { unauthenticatedOnly: true }`；`login` / `register` 都不声明，靠页面内的
  `watch(status)` 或 `signIn/signUp` 的回调跳转。
- `cad.vue` 用 `layout: false` 自绘头部（不依赖 `layouts/default.vue`）；
  四个账号页用 `layout: 'default'`。

## 数据流

```
cad.vue ──$fetch POST /api/cad/generate──▶ server/api/cad/generate.post.ts
                                                  │ getUserFromToken → 401
                                                  │ requestSchema.safeParse → 400
                                                  │ server/utils/cad/prompts.ts 组提示词
                                                  │ server/utils/qwen.ts 调 DashScope
                                                  │ server/utils/cad/schema.ts zod 校验 → 422
                                                  ▼
                       { success, model, title, summary }
                                                  │
cad.vue currentModel ──▶ app/components/cad/Viewer3D.client.vue
                                                  │ app/utils/cad-renderer.ts (three-bvh-csg)
                                                  ▼
                                    Three.js 渲染 + shared/utils/cad-export.ts 导出 DXF
```

## 不可破坏的约定

1. **DSL 单一事实源**：`shared/types/cad.ts` 是类型契约，`server/utils/cad/schema.ts`
   是运行时校验，`app/utils/cad-renderer.ts` 是求值实现。三处必须同步修改，
   提示词（`server/utils/cad/prompts.ts`）也必须与它们一致。
2. **受限解释器**：大模型只输出 JSON，永远不在服务端执行模型产出的代码。
   新增图元或布尔运算时，schema、renderer、prompt、测试四处一起改。
3. **规模预检**：`cadModelSchema` 先迭代节点/深度上限再递归解析；材质编辑的
   `currentModel` 在校验前先按 JSON 长度判断，超限直接 400 拒绝（不截断）。
   不要用 `JSON.parse` 直接展开模型。
4. **材质编辑不碰几何**：`cadMaterialEditSchema` 是 `.strict()`，且
   `applyCadMaterialEdit` 会拒绝给 `subtract`/`intersect` 的工具体赋材质。
5. **CSG 材质分组**：renderer 必须保留 `evaluator.useGroups`，切面沿用第一实体材质；
   更换材质后几何不能变（有测试锁定）。
6. **不要记录内容**：`generate.post.ts` 的日志只允许阶段名与长度等元数据，
   禁止输出提示词、模型原文、图片或凭证。

## 资源释放

`buildCadMesh` 用 try/finally 释放所有中间 Brush 与未使用材质；
`disposeCadMesh` 用于最终网格。改渲染流程时不要绕过这两处，否则会泄漏 GPU 资源
（`cad-materials.test.mjs` 里有释放计数断言）。

## 测试

```bash
npm test        # node:test，无框架依赖，直接导入 .ts
```

新增几何/材质能力时，先在 `tests/` 里写断言，再改实现。需要肉眼回归页面时用
`npm run preview:cad`（需先 `npm i -D vite @vitejs/plugin-vue`）。

## 环境变量

`DATABASE_URL`、`AUTH_SECRET`（缺失直接抛错）、`DASHSCOPE_API_KEY`、
可选 `AUTH_ORIGIN` / `DASHSCOPE_BASE_URL` / `QWEN_MODEL` / `QWEN_DOC_MODEL` /
`QWEN_FLASH_MODEL`。完整说明见 `.env.example` 与 `README.md`。

## Prisma

- generator 输出到 `app/generated/prisma`，`server/utils/prisma.ts` 用 `@/generated/prisma` 导入；
  该目录已 gitignore，改完 schema 要跑 `npx prisma migrate dev`。
- `DATABASE_URL` 上的 `?schema=` 会透传给 `PrismaPg`，支持非 public schema。