// app/api/deploy/route.ts

import { NextRequest, NextResponse } from "next/server"
import { deployToVercel } from "@/lib/vercel"
import { db } from "@/lib/db"
import { fixGeneratedCode } from "@/lib/fixer"

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const { generationId } = await req.json()

  if (!generationId) {
    return NextResponse.json({ error: "缺少 generationId 参数" }, { status: 400 })
  }

  // 1. 查询数据库，获取生成的文件
  const generation = await db.generation.findUnique({
    where: { id: generationId },
  })

  if (!generation) {
    return NextResponse.json({ error: "未找到对应的生成记录" }, { status: 404 })
  }

  if (!generation.files) {
    return NextResponse.json({ error: "该记录没有可部署的文件，请先生成代码" }, { status: 400 })
  }

  try {
    let files = generation.files as { path: string; content: string }[]
    console.log(`[Deploy] 开始部署 ${generationId}，共 ${files.length} 个文件`)

    // 1.5. 自动修复代码中的常见错误
    console.log(`[Deploy] 应用代码自动修复...`)
    files = fixGeneratedCode(files)

    // 打印修复后的代码（用于调试）
    console.log(`[Deploy] 修复后的文件:`)
    files.forEach(f => {
      console.log(`[Deploy]   - ${f.path}`)
      console.log(`[Deploy]     内容预览: ${f.content.slice(0, 200)}...`)
    })

    // 2. 调用 Vercel 部署
    const { deploymentId, url } = await deployToVercel(files, generationId.slice(-8))

    // 3. 更新数据库
    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "DONE",
        deployUrl: url,
        vercelId: deploymentId,
      },
    })

    console.log(`[Deploy] 部署成功: ${url}`)
    return NextResponse.json({ url, deploymentId })
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error(`[Deploy] 部署失败:`, errorMsg)

    await db.generation.update({
      where: { id: generationId },
      data: { status: "ERROR", errorMsg },
    })

    return NextResponse.json({ error: `部署失败：${errorMsg}` }, { status: 500 })
  }
}
