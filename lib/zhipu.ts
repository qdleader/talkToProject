// lib/zhipu.ts

/**
 * 智谱 GLM API 客户端
 * GLM-5 兼容 OpenAI 接口格式，直接使用 openai SDK 调用
 */
import OpenAI from "openai"
import { parseGeneratedProject, GeneratedProject } from "./parser"
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts"

export const zhipuClient = new OpenAI({
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
})

// 使用的模型
export const GLM_MODEL = "glm-4-plus" // 免费模型，适合开发阶段
// 如需更强代码能力，可换为 "glm-4" 或 "glm-4-plus"

/**
 * 带自动重试的代码生成函数
 * GLM 偶尔输出格式不规范，最多重试 3 次
 */
export async function generateWithRetry(
  prompt: string,
  maxRetries = 3
): Promise<GeneratedProject> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[GLM] 第 ${attempt}/${maxRetries} 次尝试生成...`)

      const response = await zhipuClient.chat.completions.create({
        model: GLM_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              attempt === 1
                ? buildUserPrompt(prompt)
                : // 重试时加强 JSON 格式要求
                  `${buildUserPrompt(prompt)}\n\n【重要】上次输出格式有误，这次必须只输出纯 JSON，不含任何其他文字。`,
          },
        ],
        temperature: attempt === 1 ? 0.3 : 0.1, // 重试时降低 temperature
        max_tokens: 8192,
      })

      const rawContent = response.choices[0]?.message?.content
      if (!rawContent) throw new Error("GLM 返回内容为空")

      const project = parseGeneratedProject(rawContent)

      // 基础校验：至少需要 page.tsx 文件
      const hasPageFile = project.files.some(
        (f) => f.path.includes("page.tsx") || f.path.includes("page.jsx")
      )
      if (!hasPageFile) throw new Error("生成结果缺少 page.tsx 主页面文件")

      console.log(`[GLM] 第 ${attempt} 次生成成功，共 ${project.files.length} 个文件`)
      return project
    } catch (err) {
      lastError = err as Error
      console.warn(`[GLM] 第 ${attempt} 次失败: ${lastError.message}`)
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt)) // 递增延迟
      }
    }
  }

  throw new Error(`经过 ${maxRetries} 次重试仍失败，最后一次错误：${lastError?.message}`)
}
