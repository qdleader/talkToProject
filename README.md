# AI Generator

通过对话，直接应用，并自动部署到vercel，提供给你一个可访问地址。

## Introduction

![Video Introduction 1](./demo.mov)

<video width="100%" controls>
  <source src="./demo.mov" type="video/quicktime">
  Your browser does not support the video tag.
</video>

![Video Introduction 2](./demo1.mov)

<video width="100%" controls>
  <source src="./demo1.mov" type="video/quicktime">
  Your browser does not support the video tag.
</video>

https://ai-app-mq855q1i-1773740644119-gi1wja2j5-qdleaders-projects.vercel.app/

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env.local` file. You can find a template in `.env.example`.

### ZHIPU_API_KEY
- **Source**: [智谱 AI 开放平台](https://open.bigmodel.cn)
- **Steps**: Login/Register -> API Keys -> Copy your API Key.

### VERCEL_TOKEN
- **Source**: [Vercel Account Settings](https://vercel.com/account/tokens)
- **Steps**: Create a new token with appropriate permissions.

### DATABASE_URL
- **Source**: [Neon Console](https://neon.tech)
- **Steps**: Create a new project -> Connection String -> Copy the PostgreSQL URL.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd ai-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file based on `.env.example` and fill in your keys.

4. **Run the development server**:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.




