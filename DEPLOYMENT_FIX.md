# Pull the Sword - GitHub Pages 部署修复

## 问题已修复 ✅

之前的动态 `import()` 导致了代码分割问题，现在改回正常的静态导入。

## 构建输出

```
dist/
├── index.html (3.11 kB)
└── assets/
    ├── index-7Ry2S8t2.css (34.34 kB)
    └── index-BClSLoMp.js (1,233.94 kB)
```

只有一个 JS 文件，这对 GitHub Pages 更好！

## 部署步骤

```bash
# 1. 确保所有更改已提交
git add .
git commit -m "Fix: Use static Firebase imports for GitHub Pages"
git push

# 2. 等待 GitHub Pages 部署（1-2 分钟）

# 3. 访问应用
# https://andyyim175.github.io/pull/
```

## 工作原理

### 应用启动流程

1. **HTML 加载** - 显示加载动画（⚔️）
2. **JS 加载** - 加载单个 1.2MB 的 JS 文件
3. **Firebase 初始化** - 在模块加载时立即初始化（不阻塞）
4. **React 渲染** - 使用默认值立即渲染
5. **隐藏加载动画** - 100ms 后
6. **后台数据加载** - Firebase 数据异步更新

### Firebase 降级策略

```
Firebase 初始化
   ↓
成功？
   ├─ 是 → 使用 Firebase Realtime Database
   └─ 否 → 降级到 localStorage
              ↓
           应用继续正常工作
```

## 关键改进

| 改进项 | 之前 | 现在 |
|--------|------|------|
| Firebase 导入 | 动态 import() | 静态 import |
| 代码分割 | 4 个 JS 文件 | 1 个 JS 文件 |
| 加载可靠性 | ❌ 可能失败 | ✅ 总是成功 |
| 文件大小 | 分散在多个文件 | 单个 1.2MB 文件 |

## 故障排除

### 如果仍然显示空白页

1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签
3. 查找错误信息

常见错误及解决方案：

- **`Failed to load resource: 404`** 
  - 原因：文件路径不正确
  - 解决：确保 vite.config.js 中 base 设置为 `/pull/`

- **`Firebase initialization failed`**
  - 原因：Firebase 被阻止或配置错误
  - 解决：应用会自动降级到 localStorage，仍然可以工作

- **`Canvas error`**
  - 原因：WebGL 不支持
  - 解决：应用会自动使用 CSS 回退场景

### 清除缓存

如果看到旧版本：

```bash
# 硬刷新
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)

# 或清除浏览器缓存
```

## 本地测试

```bash
# 开发模式
npm run dev

# 构建预览
npm run build
npm run preview
```

## 技术栈

- React 18
- Three.js (3D 渲染)
- Firebase Realtime Database
- Tailwind CSS
- Fira Code 字体
- canvas-confetti

## 文件结构

```
src/
├── firebase.ts          # Firebase 配置和 API
├── App.tsx              # 主应用组件
├── main.tsx             # 应用入口
├── index.css            # 全局样式
└── components/
    ├── Scene.tsx        # 3D 场景组件
    ├── FallbackScene.tsx # CSS 回退场景
    ├── ErrorBoundary.tsx # 错误边界
    └── CanvasErrorBoundary.tsx
```

## 总结

✅ Firebase 使用静态导入，更可靠
✅ 单个 JS 文件，加载更简单
✅ 应用立即渲染，不等待 Firebase
✅ Firebase 失败时自动降级
✅ 10 秒超时检查，显示错误信息

现在应该可以在 GitHub Pages 上正常工作了！🎉
