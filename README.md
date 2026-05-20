# LexiBook

英语学习阅读网站 MVP，基于技术文档实现：

- 前端：Next.js App Router + TypeScript + Tailwind + Zustand
- 后端：NestJS + Prisma（当前先提供可运行 mock 服务）

## 目录

```txt
apps/
  web/  # 阅读器前端
  api/  # NestJS 风格 API
```

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 启动后端（默认 4000）

```bash
npm run dev:api
```

3. 启动前端（默认 3000）

```bash
npm run dev:web
```

4. 打开

- http://localhost:3000/books/demo-book/chapters/ch1

## 已实现 MVP

- 双栏沉浸式阅读（左英右中）
- hover 英文句子时同步高亮中文
- 单词虚线下划线 + 点击弹词义
- 句子朗读（Web Speech）
- 阅读进度保存（localStorage + 后端接口）
- 后端章节阅读数据接口 / 单词接口 / 进度接口
