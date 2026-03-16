// app/api/generate/route.ts

import { NextRequest, NextResponse } from "next/server"
import { generateWithRetry } from "@/lib/zhipu"
import { db } from "@/lib/db"

export const maxDuration = 120 // 最大执行时间 120 秒

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return NextResponse.json({ error: "请输入有效的需求描述（至少5个字符）" }, { status: 400 })
  }

  // 1. 在数据库中创建任务记录
  const generation = await db.generation.create({
    data: {
      prompt: prompt.trim(),
      status: "GENERATING",
    },
  })

  try {
    // 2. 调用智谱 GLM API（带重试机制）
    console.log(`[${generation.id}] 开始调用 GLM，prompt: ${prompt.slice(0, 50)}...`)

    const project = await generateWithRetry(prompt.trim())

    console.log(`[${generation.id}] 解析成功，共 ${project.files.length} 个文件`)

    // 3. 更新数据库：保存生成的文件
    await db.generation.update({
      where: { id: generation.id },
      data: {
        status: "DEPLOYING",
        files: project.files as any,
      },
    })

    return NextResponse.json({
      generationId: generation.id,
      description: project.description,
      files: project.files,
      fileCount: project.files.length,
    })
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error(`[${generation.id}] 生成失败:`, errorMsg)

    await db.generation.update({
      where: { id: generation.id },
      data: { status: "ERROR", errorMsg },
    })

    return NextResponse.json(
      { error: `代码生成失败：${errorMsg}`, generationId: generation.id },
      { status: 500 }
    )
  }
}
