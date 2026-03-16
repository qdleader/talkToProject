// lib/parser.ts

export interface ProjectFile {
  path: string
  content: string
}

export interface GeneratedProject {
  description: string
  files: ProjectFile[]
}

/**
 * 解析 GLM 返回的 JSON 字符串，提取文件树
 * 包含多种容错处理，应对 AI 输出不规范的情况
 */
export function parseGeneratedProject(raw: string): GeneratedProject {
  // 1. 清理 markdown 代码块标记（AI 有时会加上）
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "")
  cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/, "")

  // 2. 尝试直接解析
  try {
    const parsed = JSON.parse(cleaned)
    return validateAndNormalize(parsed)
  } catch (e) {
    // 3. 尝试提取 JSON 片段（AI 可能在 JSON 前后加了说明文字）
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return validateAndNormalize(parsed)
      } catch (e2) {
        throw new Error(`GLM 返回内容无法解析为 JSON。原始内容前100字符：${cleaned.slice(0, 100)}`)
      }
    }
    throw new Error(`GLM 返回内容格式错误：${(e as Error).message}`)
  }
}

function validateAndNormalize(parsed: any): GeneratedProject {
  if (!parsed.files || !Array.isArray(parsed.files)) {
    throw new Error("解析结果缺少 files 字段")
  }
  return {
    description: parsed.description || "AI 生成的应用",
    files: parsed.files.map((f: any) => ({
      path: f.path || f.filename || "unknown.ts",
      content: f.content || f.code || "",
    })),
  }
}
