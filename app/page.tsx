// app/page.tsx
"use client"

import { useState } from "react"

// ---- 类型定义 ----
type Status = "idle" | "generating" | "deploying" | "done" | "error"

interface GeneratedFile {
  path: string
  content: string
}

interface Result {
  url: string
  description: string
  files: GeneratedFile[]
}

// ---- 主组件 ----
export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [description, setDescription] = useState<string>("")
  const [currentPrompt, setCurrentPrompt] = useState<string>("") // 当前正在处理的输入

  // 重置状态
  const reset = () => {
    setStatus("idle")
    setResult(null)
    setError(null)
    setSelectedFile(null)
    setGenerationId(null)
    setDescription("")
    setCurrentPrompt("")
  }

  // 核心执行流程：生成 → 部署
  const handleGenerate = async () => {
    if (!prompt.trim() || status !== "idle") return

    const currentPromptValue = prompt.trim()
    setCurrentPrompt(currentPromptValue) // 保存当前输入
    setStatus("generating")
    setError(null)
    setResult(null)
    setPrompt("") // 清空输入框，避免混淆

    try {
      console.log('=== 开始生成 ===')
      console.log('用户输入:', currentPromptValue)

      // Step 1: 调用 GLM 生成代码
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPromptValue }),
      })

      const genData = await genRes.json()

      if (!genRes.ok) {
        throw new Error(genData.error || "代码生成失败")
      }

      setGenerationId(genData.generationId)
      setDescription(genData.description)
      setSelectedFile(genData.files?.[0] || null)

      // 调试日志
      console.log('=== 生成结果 ===')
      console.log('描述:', genData.description)
      console.log('文件数:', genData.fileCount)
      console.log('文件列表:', genData.files?.map(f => f.path))

      // Step 2: 自动触发部署
      setStatus("deploying")

      const deployRes = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: genData.generationId }),
      })

      const deployData = await deployRes.json()

      if (!deployRes.ok) {
        throw new Error(deployData.error || "部署失败")
      }

      setResult({
        url: deployData.url,
        description: genData.description,
        files: genData.files,
      })
      setStatus("done")
    } catch (err) {
      setError((err as Error).message)
      setStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* 顶部导航栏 */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-theme-500 rounded-lg flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <span className="font-semibold text-lg">AI</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* 标题区 */}
        {status === "idle" && !result && (
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-theme-400 to-theme-600 bg-clip-text text-transparent">
              描述你的应用想法
            </h1>
            <p className="text-gray-400 text-lg">
              用自然语言描述需求，AI 自动生成并部署应用
            </p>
          </div>
        )}

        {/* 输入区 */}
        {(status === "idle" || status === "error") && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 focus-within:border-theme-500 transition-colors">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：帮我做一个任务管理应用，支持添加、删除、标记完成，数据保存在本地..."
                className="w-full bg-transparent resize-none text-white placeholder-gray-500 outline-none text-base leading-relaxed min-h-[100px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleGenerate()
                  }
                }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-600">Ctrl+Enter 快速生成</span>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="bg-theme-500 hover:bg-theme-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium text-sm transition-colors"
                >
                  开始生成 →
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mt-4 p-4 bg-red-950 border border-red-800 rounded-xl text-red-400 text-sm">
                <span className="font-medium">出错了：</span>{error}
              </div>
            )}

            {/* 示例提示词 */}
            {status === "idle" && (
              <div className="mt-6">
                <p className="text-xs text-gray-600 mb-3 text-center">快速开始</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setPrompt(ex)}
                      className="text-xs text-gray-400 bg-gray-900 border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-full transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 生成/部署中状态 */}
        {(status === "generating" || status === "deploying") && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 border-2 border-theme-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {status === "generating" ? "正在生成代码..." : "正在部署到 Vercel..."}
              </h3>

              {/* 显示当前处理的输入 */}
              {currentPrompt && (
                <div className="mt-3 mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">正在生成：</p>
                  <p className="text-sm text-gray-300">"{currentPrompt}"</p>
                </div>
              )}

              <p className="text-gray-500 text-sm">
                {status === "generating"
                  ? "GLM-5 正在根据你的需求生成完整的 Next.js 应用代码"
                  : "代码已生成，正在自动部署，通常需要 30~60 秒"}
              </p>
              {description && status === "deploying" && (
                <div className="mt-4 text-xs text-gray-600 bg-gray-800 rounded-lg px-4 py-2">
                  {description}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 完成状态 */}
        {status === "done" && result && (
          <div className="space-y-6">
            {/* 成功提示 */}
            <div className="bg-green-950 border border-green-800 rounded-2xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-green-400 mb-1">部署成功！</h3>
                <p className="text-gray-400 text-sm mb-3">{result.description}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-theme-500 hover:bg-theme-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    打开应用 ↗
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.url)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={reset}
                    className="text-gray-500 hover:text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    重新生成
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2 font-mono break-all">{result.url}</p>
              </div>
            </div>

            {/* 代码查看器 */}
            <div className="grid grid-cols-4 gap-4 h-[500px]">
              {/* 文件列表 */}
              <div className="col-span-1 bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
                <div className="p-3 border-b border-gray-800 text-xs text-gray-500 font-medium">
                  生成的文件 ({result.files.length})
                </div>
                {result.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
                      selectedFile?.path === file.path
                        ? "bg-theme-950 text-theme-300"
                        : "text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {/* 代码内容 */}
              <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
                {selectedFile ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500 font-mono flex items-center justify-between">
                      <span>{selectedFile.path}</span>
                      <span>{selectedFile.content.split("\n").length} 行</span>
                    </div>
                    <pre className="p-4 text-xs text-gray-300 font-mono leading-relaxed overflow-auto whitespace-pre-wrap">
                      {selectedFile.content}
                    </pre>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                    点击左侧文件查看代码
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 示例提示词
const EXAMPLE_PROMPTS = [
  "待办事项应用，支持增删改查",
  "个人记账本，收支统计图表",
  "番茄工作法计时器",
  "简单的猜数字游戏",
  "Markdown 笔记本",
]
