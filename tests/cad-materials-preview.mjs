import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// 隔离预览真实建模页与 Viewer：仅替换 Nuxt 会话与 AI 返回，绝不访问账号、数据库或模型服务。
// 需要 vite 与 @vitejs/plugin-vue（见 README 的「材质回归预览」一节）。
// 运行：node tests/cad-materials-preview.mjs，然后在浏览器打开打印的地址。
const mocks = `
import { ref } from 'vue';
import { cadModelSchema, cadMaterialEditSchema, applyCadMaterialEdit } from '/server/utils/cad/schema.ts';
export const definePageMeta = () => {};
export const useAuth = () => ({ data: ref({ user: { name: '材质回归测试' } }), signOut: async () => {} });
export const useRouter = () => ({ push: async (path) => { window.__cadTest.navigations.push(path); } });
const fixture = { units: 'mm', title: '木纹 · 金属 · 玻璃', summary: '木质底板、黄铜支架与透明玻璃球', model: {
  kind: 'union', children: [
    { kind: 'subtract', material: { type: 'wood', color: '#b88752', grainAxis: 'x' }, children: [
      { kind: 'box', size: { w: 100, h: 8, d: 60 }, transform: { translate: [0, -15, 0] } },
      { kind: 'cylinder', size: { radius: 5, height: 14 }, transform: { translate: [-35, -15, 18] } }
    ] },
    { kind: 'cylinder', size: { radius: 8, height: 25 }, transform: { translate: [20, 0, 0] }, material: { type: 'metal', color: '#bd914c', finish: 'polished' } },
    { kind: 'sphere', size: { radius: 18 }, transform: { translate: [20, 28, 0] }, material: { type: 'glass', thickness: 6 } }
  ]
}};
window.__cadTest = { requests: [], navigations: [], nextResponse: null, nextError: null, delay: 200 };
export async function $fetch(url, options) {
  const state = window.__cadTest;
  if (url !== '/api/cad/generate') throw new Error('隔离预览禁止访问其他接口：' + url);
  const body = structuredClone(JSON.parse(JSON.stringify(options.body)));
  state.requests.push(body);
  let model = state.nextResponse;
  const error = state.nextError;
  state.nextResponse = null;
  state.nextError = null;
  await new Promise(resolve => setTimeout(resolve, state.delay));
  if (error) throw new Error(error);
  if (!model && body.mode === 'material') {
    const text = body.text;
    let material = text.includes('玻璃') ? { type: 'glass', roughness: text.includes('磨砂') ? 0.4 : 0.06 }
      : text.includes('金属') || text.includes('不锈钢') ? { type: 'metal', finish: 'brushed' }
      : text.includes('石') ? { type: 'stone' }
      : { type: 'wood', color: '#68432b', grainAxis: 'x' };
    model = applyCadMaterialEdit(cadModelSchema.parse(body.currentModel), cadMaterialEditSchema.parse({ summary: '测试材质：' + material.type, changes: [{ path: [], material }] }));
  }
  model = cadModelSchema.parse(model || fixture);
  return { success: true, model, title: model.title, summary: model.summary };
}
`
const entry = `
import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import Page from '/app/pages/cad.vue';
import Viewer from '/app/components/cad/Viewer3D.client.vue';
const app = createApp(Page);
app.use(ElementPlus);
app.component('CadViewer3D', Viewer);
app.component('NuxtLink', { props: ['to'], template: '<a :href="to"><slot /></a>' });
app.mount('#app');
`
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>CAD 材质回归预览</title><style>body{margin:0;font-family:system-ui}</style></head><body><div id="app"></div><script type="module" src="/@cad-entry"></script></body></html>'
const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  configFile: false,
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
  plugins: [
    {
      name: 'cad-isolated-preview',
      enforce: 'pre',
      resolveId(id) { if (['/@cad-entry', '/@cad-mocks'].includes(id)) return id },
      load(id) {
        if (id === '/@cad-entry') return entry
        if (id === '/@cad-mocks') return mocks
      },
      transform(source, id) {
        if (id.endsWith('/app/pages/cad.vue')) {
          return source.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { ref, computed, watch } from "vue";\nimport { ElMessage } from "element-plus";\nimport { definePageMeta, useAuth, useRouter, $fetch } from "/@cad-mocks";')
        }
        if (id.endsWith('/app/components/cad/Viewer3D.client.vue')) {
          return source.replace('<script setup lang="ts">', '<script setup lang="ts">\nimport { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";')
        }
      },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== '/') return next()
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(await server.transformIndexHtml('/', html))
        })
      },
    },
    vue(),
  ],
})
await server.listen()
server.printUrls()