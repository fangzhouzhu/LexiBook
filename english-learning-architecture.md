# 英语学习 Web 网站技术架构方案

## 一、项目定位

打造一个沉浸式英语学习网站。

核心体验：

- 左侧英文原文
- 右侧中文翻译
- 仿生真实书本阅读体验
- 单词点击查词
- 句子同步高亮
- 英文朗读
- 跟读评分（后续）
- AI 长难句分析
- 生词本与学习进度

---

# 二、推荐技术栈

## 前端

```txt
Next.js App Router
TypeScript
Tailwind CSS
Zustand
TanStack Query
Framer Motion
```

## 后端

```txt
NestJS
Prisma
PostgreSQL
Redis
```

## AI 与语音

```txt
OpenAI API
Web Speech API
Azure Speech（后期）
```

## 部署

```txt
Vercel（前端）
Railway / 腾讯云（后端）
Docker
Nginx
```

---

# 三、整体架构

```txt
Browser
   |
   |-- Next.js Frontend
   |      |
   |      |-- Reader UI
   |      |-- Word Popover
   |      |-- Audio Player
   |      |-- Speaking Recorder
   |      |-- Progress Store
   |
   |-- NestJS API
          |
          |-- Auth Module
          |-- Book Module
          |-- Chapter Module
          |-- Word Module
          |-- Translation Module
          |-- Speech Module
          |-- AI Module
          |-- Progress Module
          |
          |-- PostgreSQL
          |-- Redis
          |-- OSS / S3
          |-- OpenAI API
```

---

# 四、核心功能设计

## 1. 双栏阅读器

页面：

```txt
/books/:bookId/chapters/:chapterId
```

布局：

```txt
左侧：英文
右侧：中文
底部：播放器
顶部：设置栏
```

功能：

- 英文单词下划线
- 点击单词查看释义
- hover 英文句子同步高亮中文
- 点击句子朗读
- 自动逐句播放
- 字体大小调节
- 暗黑模式

---

## 2. 单词弹窗

展示：

```txt
单词
音标
发音按钮
中文释义
英文释义
例句
词性
常用搭配
```

---

## 3. AI 长难句分析

功能：

- 语法结构拆解
- 时态分析
- 从句分析
- 句子意译
- 使用场景

---

## 4. 生词本

用户可以：

- 收藏单词
- 标记熟悉程度
- 自动复习
- AI 生成测试题

---

## 5. 跟读评分（后续）

功能：

- 用户录音
- AI 发音评分
- 单词级纠错
- 流利度评分
- 发音热力图

---

# 五、数据结构设计

推荐不要存大块 HTML。

应拆分为：

```txt
Book
  └── Chapter
        └── Paragraph
              └── Sentence
                    └── Word
```

---

# 六、数据库设计（Prisma）

```prisma
model Book {
  id          String   @id @default(uuid())
  title       String
  coverUrl    String?
  level       String?
  chapters    Chapter[]
  createdAt   DateTime @default(now())
}

model Chapter {
  id          String      @id @default(uuid())
  bookId      String
  title       String
  order       Int

  book        Book        @relation(fields: [bookId], references: [id])
  sentences   Sentence[]
}

model Sentence {
  id          String      @id @default(uuid())
  chapterId   String
  order       Int

  english     String
  chinese     String

  chapter     Chapter     @relation(fields: [chapterId], references: [id])
}
```

---

# 七、前端目录结构

```txt
app/
  books/[bookId]/chapters/[chapterId]/page.tsx

components/
  reader/
    BookReader.tsx
    BookPageLayout.tsx
    EnglishPage.tsx
    ChinesePage.tsx
    SentencePair.tsx
    WordToken.tsx
    WordPopover.tsx
    AudioControlBar.tsx

stores/
  readerStore.ts
  audioStore.ts

services/
  bookApi.ts
  wordApi.ts
  speechApi.ts
```

---

# 八、后端模块结构

```txt
src/
  modules/
    auth/
    users/
    books/
    chapters/
    sentences/
    words/
    progress/
    speech/
    ai/
```

---

# 九、API 设计

## 阅读接口

```txt
GET /books
GET /books/:id
GET /chapters/:id
GET /chapters/:id/reader-data
```

## 单词接口

```txt
GET /words/:word
POST /words/:word/explain
```

## 学习进度

```txt
POST /progress/reading
GET /progress/reading/:chapterId
```

---

# 十、开发阶段规划

## 第一阶段（MVP）

- 双栏阅读器
- 单词查词
- hover 高亮
- 英文朗读
- 阅读进度

## 第二阶段

- 生词本
- AI 长难句分析
- AI 例句
- 收藏句子

## 第三阶段

- 跟读录音
- 发音评分
- 流利度分析
- AI 口语建议

---

# 十一、Codex Prompt

```txt
我要开发一个英语学习 Web 网站。

技术栈：

- Next.js App Router
- TypeScript
- Tailwind CSS
- NestJS
- Prisma
- PostgreSQL

请帮我实现 MVP：

1. 创建阅读器页面
2. 左侧英文右侧中文
3. 模拟真实书本布局
4. 英文句子 hover 时中文同步高亮
5. 英文单词带虚线下划线
6. 点击单词弹出释义浮层
7. 支持句子朗读
8. 保存阅读进度
9. 后端提供章节阅读接口
10. UI 风格高级、简洁、沉浸式
```

---

# 十二、最终目标

让用户产生：

> “这比传统背单词爽太多了”
