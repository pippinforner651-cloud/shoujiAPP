// 后端无 CSS 构建。空配置用于隔离仓库根目录 postcss.config.js（tailwind 等前端链路），
// 防止在 backend/ 下运行工具时误加载前端 PostCSS 配置。
module.exports = { plugins: {} };
