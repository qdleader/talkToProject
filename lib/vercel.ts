// lib/vercel.ts

export interface DeployFile {
  path: string
  content: string
}

export interface DeployResult {
  deploymentId: string
  url: string
}

/**
 * 调用 Vercel Deploy API 部署 Next.js 应用
 * 文档：https://vercel.com/docs/rest-api/endpoints/deployments
 */
export async function deployToVercel(
  files: DeployFile[],
  projectName: string
): Promise<DeployResult> {
  const token = process.env.VERCEL_TOKEN
  if (!token) throw new Error("缺少 VERCEL_TOKEN 环境变量")

  // 1. 在生成的文件基础上，补充 Vercel 部署所需的配置文件
  const allFiles = [...files, ...getVercelConfigFiles()]

  // 2. 发起部署请求
  const deployRes = await fetch("https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `ai-app-${projectName}-${Date.now()}`,
      files: allFiles.map(({ path, content }) => ({
        file: path,
        data: content,
        encoding: "utf-8",
      })),
      projectSettings: {
        framework: "nextjs",
        buildCommand: "next build",
        outputDirectory: ".next",
        installCommand: "npm install",
      },
      // 部署为生产环境
      target: "production",
    }),
  })

  if (!deployRes.ok) {
    const errorData = await deployRes.json()
    throw new Error(
      `Vercel API 返回错误 ${deployRes.status}: ${JSON.stringify(errorData.error || errorData)}`
    )
  }

  const deployment = await deployRes.json()
  const deploymentId = deployment.id

  if (!deploymentId) {
    throw new Error("Vercel 未返回 deploymentId")
  }

  // 3. 轮询部署状态，等待完成（最多等 90 秒）
  const url = await pollDeploymentStatus(deploymentId, token)

  return { deploymentId, url }
}

/**
 * 轮询 Vercel 部署状态，直到 READY 或超时
 */
async function pollDeploymentStatus(
  deploymentId: string,
  token: string,
  maxRetries = 30,
  intervalMs = 3000
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, intervalMs))

    const statusRes = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!statusRes.ok) continue

    const data = await statusRes.json()
    const state = data.readyState || data.status

    console.log(`[Vercel] 部署状态: ${state} (${i + 1}/${maxRetries})`)

    if (state === "READY") {
      return `https://${data.url}`
    }

    if (state === "ERROR" || state === "CANCELED") {
      // 输出更详细的错误信息
      console.error(`[Vercel] 部署失败详情:`, JSON.stringify(data, null, 2))
      const errInfo = data.errorCode || data.errorMessage || "未知错误"
      throw new Error(`Vercel 部署失败，状态: ${state}，原因: ${errInfo}`)
    }
  }

  throw new Error(`Vercel 部署超时（等待超过 ${(maxRetries * intervalMs) / 1000} 秒）`)
}

/**
 * 补充 Vercel 部署所需的配置文件
 * AI 生成的代码可能不包含这些，需要我们补全
 */
function getVercelConfigFiles(): DeployFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "ai-generated-app",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
            lint: "next lint",
          },
          dependencies: {
            next: "14.2.5",
            react: "^18",
            "react-dom": "^18",
          },
          devDependencies: {
            typescript: "^5",
            "@types/node": "^20",
            "@types/react": "^18",
            "@types/react-dom": "^18",
            tailwindcss: "^3.4.1",
            postcss: "^8",
            autoprefixer: "^10.0.1",
          },
        },
        null,
        2
      ),
    },
    {
      path: "next.config.js",
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在生产构建时禁用 ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生产构建时禁用类型检查
    ignoreBuildErrors: true,
  },
}
module.exports = nextConfig`,
    },
    {
      path: "postcss.config.js",
      content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "es5",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: false, // 关闭严格模式，避免类型错误导致部署失败
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2
      ),
    },
    {
      path: "next-env.d.ts",
      content: `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`,
    },
  ]
}
