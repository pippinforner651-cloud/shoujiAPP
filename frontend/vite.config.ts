import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isPreview = process.env.VITE_BUILD_VARIANT === 'v2-preview' || mode === 'v2-preview'
  const appName = isPreview ? 'E23 V2预览测试版' : 'E23跑起来'
  const appTitle = isPreview
    ? 'E23 V2预览测试版 · 多人功能尚未上线'
    : 'E23跑起来 · 每一步，都在环游中国'
  const manifest = isPreview ? '/manifest.v2.json' : '/manifest.json'

  return {
    plugins: [
      react(),
      {
        name: 'e23-build-identity',
        transformIndexHtml(html: string) {
          return html
            .replaceAll('__E23_APP_NAME__', appName)
            .replaceAll('__E23_APP_TITLE__', appTitle)
            .replaceAll('__E23_MANIFEST__', manifest)
        },
      },
    ],
  }
})
