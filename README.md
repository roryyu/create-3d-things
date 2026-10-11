# Create 3D Things · 文字建模

用自然语言（或一张参考图）生成可交互预览、可导出 DXF 的 3D CAD 模型。

大模型只输出一棵**受约束的 CSG 建模树 JSON**（`CadModel`），服务端用 zod 校验，
浏览器端用 Three.js + three-bvh-csg 求值渲染。把「让模型执行任意代码」降级为
「受限解释器」，既安全又便于把校验错误回灌重试。

---

## 功能

| 能力 | 说明 |
| --- | --- |
| 文字建模 | 输入形状、尺寸、材质描述，生成 CSG 建模树并在右侧实时渲染 |
| 图片建模 | 上传参考图（jpeg/png/webp/gif，≤ 约 15MB），由视觉模型提取形状与材质 |
| 仅改材质 | 生成后切到「仅改材质」模式，用自然语言改整体或局部材质，几何与尺寸不变 |
| 交互预览 | 轨道旋转、滚轮缩放，按包围盒自动取景，改材质时保持当前视角 |
| DXF 导出 | 浏览器内直接生成 R2000 三维 DXF（3DFACE 三角网格），无需服务端转换 |
| 账号体系 | 邮箱密码注册登录、JWT 会话、密码找回 |

支持的图元：`box` / `cylinder` / `sphere` / `cone` / `torus`；
布尔运算：`union` / `subtract` / `intersect`；
材质类型：`default` / `wood` / `metal` / `glass` / `plastic` / `ceramic` / `stone` / `rubber`。

---

## 技术栈

- **框架**：Nuxt 4（`app/` 为 srcDir）+ Vue 3 + Element Plus
- **3D**：Three.js + three-bvh-csg（CSG 求值）+ 程序化材质（GLSL，无外部贴图）
- **模型服务**：阿里云百炼 DashScope（OpenAI 兼容模式），`openai` SDK 调用
- **数据库**：PostgreSQL + Prisma 7（driver adapter）
- **鉴权**：`@sidebase/nuxt-auth`（local provider，JWT Cookie）+ bcryptjs
- **校验**：zod

---

## 目录结构

```
.
├── app/                          # 前端（Nuxt srcDir）
│   ├── assets/css/main.css       # 设计令牌 + Element Plus 暗色覆盖
│   ├── components/cad/
│   │   └── Viewer3D.client.vue   # 3D 预览 + DXF 导出（客户端 only）
│   ├── layouts/default.vue       # 登录/注册等页面使用的通用布局
│   ├── middleware/auth.ts        # 未登录跳 /login
│   ├── pages/
│   │   ├── index.vue             # / 直接重定向到 /cad
│   │   ├── cad.vue               # 文字/图片建模主页面（唯一业务页）
│   │   ├── login.vue  register.vue  forgot-password.vue  reset-password.vue
│   │   └── ...
│   ├── plugins/theme.client.ts   # Element Plus 霓虹青主题覆盖
│   ├── utils/cad-renderer.ts     # CSG 求值 + 程序化材质
│   └── app.vue
├── server/
│   ├── api/
│   │   ├── cad/generate.post.ts  # 建模唯一入口
│   │   └── auth/*.ts             # login / logout / register / me / forgot / reset
│   └── utils/
│       ├── auth.ts               # 密码哈希、JWT、请求身份解析
│       ├── prisma.ts             # PrismaClient 单例
│       ├── qwen.ts               # DashScope 客户端 + JSON 容错解析
│       └── cad/                  # schema.ts（zod 契约）prompts.ts（提示词）
├── shared/
│   ├── types/cad.ts              # CadModel DSL 类型契约（前后端共用）
│   └── utils/cad-export.ts       # 三角网格 -> DXF
├── prisma/                       # schema / migrations / seed
└── tests/                        # node:test 单元测试 + 隔离预览 harness
```

`shared/` 放前后端共用的类型与纯函数，通过相对路径导入（不用 `#shared` 别名）。

---

## 快速开始

要求：Node.js ≥ 24（测试使用 Node 内置 TS 类型剥离）、PostgreSQL。

```bash
# 1. 安装依赖（同时执行 nuxt prepare）
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env：DASHSCOPE_API_KEY、AUTH_SECRET、DATABASE_URL 必填

# 3. 初始化数据库
npx prisma migrate dev

# 4. 可选：创建初始管理员账号 admin@admin.com / admin123
npx prisma db seed   # 首次执行会经 npx 拉取 tsx

# 5. 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

访问 `/` 会自动跳转到 `/cad`（需先登录）。

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | — | PostgreSQL 连接串，可用 `?schema=xxx` 指定非 public schema |
| `AUTH_SECRET` | 是 | — | JWT 签名密钥，缺失时服务启动即报错 |
| `AUTH_ORIGIN` | 否 | — | `@sidebase/nuxt-auth` 的 baseURL |
| `DASHSCOPE_API_KEY` | 是 | — | 阿里云百炼 API Key |
| `DASHSCOPE_BASE_URL` | 否 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容端点 |
| `QWEN_MODEL` | 否 | `qwen-vl-max` | 图片输入使用的视觉模型 |
| `QWEN_DOC_MODEL` | 否 | `qwen3-max` | 长文字描述使用的文档模型 |
| `QWEN_FLASH_MODEL` | 否 | `qwen-flash` | 短提示词（< 200 字符）自动使用 |

---

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/login` | 邮箱密码登录，返回 `{ token, user }` |
| `POST` | `/api/auth/register` | 注册并直接登录 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `GET` | `/api/auth/me` | 当前会话用户 |
| `POST` | `/api/auth/forgot-password` | 生成密码重置令牌（有效期 1 小时） |
| `POST` | `/api/auth/reset-password` | 用令牌重置密码 |
| `POST` | `/api/cad/generate` | 文字/图片 → CadModel（需登录） |

### `POST /api/cad/generate`

```jsonc
{
  "text": "一块 60×40×8 的拉丝铝板，四角各钻一个 φ6 通孔", // ≤ 500 字
  "mode": "generate",        // generate | material
  "imageBase64": "...",      // 可选，不含 data: 前缀的纯 base64
  "mediaType": "image/jpeg", // 可选
  "currentModel": { ... }    // mode=material 时必填
}
```

返回 `{ success: true, model, title, summary }`。

- 文字输入走文档模型（短提示词自动切轻量模型），图片输入走视觉模型。
- `mode: 'material'` 只允许修改材质，服务端拒绝任何几何字段变更。
- 错误码：`400` 参数非法、`401` 未登录、`422` 建模结构校验失败、`502` 模型返回无法解析。

---

## 数据模型

只有账号相关两张表（`prisma/schema.prisma`）：

- **User** — 邮箱/手机号唯一、bcrypt 密码、`role` 字段保留
- **PasswordReset** — 重置令牌、过期时间、是否已使用

**模型本身不落库**：`CadModel` JSON 由大模型实时生成，仅存在于前端会话内存中，
刷新页面即丢失。

---

## 测试

```bash
npm test
```

- `tests/cad-export.test.mjs` — 三角网格提取与 DXF 生成的边界与往返测试
- `tests/cad-materials.test.mjs` — zod 契约、CSG 求值、材质分组、资源释放、提示词契约

两个文件都直接导入 `.ts` 源文件，依赖 Node 内置类型剥离，无需测试框架。

### 材质回归预览（可选）

想不连数据库、不调用模型服务就肉眼回归建模页时使用，需要额外安装 `vite` 与
`@vitejs/plugin-vue`：

```bash
npm i -D vite @vitejs/plugin-vue
npm run preview:cad     # 打开 http://127.0.0.1:4178
```

harness 只 mock Nuxt 会话与 `$fetch`，页面里除 `/api/cad/generate` 以外的任何请求都会抛错。

---

## 已知限制

- DXF 导出是**三角网格**，不是 B-Rep 实体；上限 10 万三角面，超出会提示简化。
- 文字描述上限 500 字，超出返回 400。
- `forgot-password` 尚未接入邮件服务：开发环境把重置链接打印在服务端日志里，
  **生产环境不打印令牌，必须先补齐发信，否则重置流程不可用**。
- `main.css` 里的 Google Fonts 走外网 CDN，内网离线部署时页面会回退到系统字体。