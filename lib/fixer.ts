// lib/fixer.ts

import { ProjectFile } from "./parser"

/**
 * 自动修复 AI 生成代码中的常见错误
 * 针对 ESLint、TypeScript 和 Vercel 部署要求进行修复
 */
export function fixGeneratedCode(files: ProjectFile[]): ProjectFile[] {
  return files.map((file) => ({
    ...file,
    content: fixFileContent(file.path, file.content),
  }))
}

/**
 * 根据文件类型应用不同的修复策略
 */
function fixFileContent(path: string, content: string): string {
  if (path.includes("page.tsx") || path.includes("page.jsx")) {
    return fixPageFile(content)
  }
  if (path.includes("layout.tsx") || path.includes("layout.jsx")) {
    return fixLayoutFile(content)
  }
  if (path.includes("tailwind.config")) {
    return fixTailwindConfig(content)
  }
  return content
}

/**
 * 修复 page.tsx 文件
 */
function fixPageFile(content: string): string {
  let fixed = content

  // 1. 确保 "use client" 在最顶部
  fixed = fixed.replace(/\/\*\s*@\s*use\s+client\s*\*\/\s*/g, "")
  fixed = fixed.replace(/\/\/\s*@\s*use\s+client\s*/g, "")

  if (!fixed.trim().startsWith('"use client"') && !fixed.trim().startsWith("'use client'")) {
    if (fixed.includes("useState") || fixed.includes("useEffect") || fixed.includes("useRef")) {
      fixed = '"use client"\n\n' + fixed
    }
  }

  // 2. 移除重复的 CSS import
  const cssImports = Array.from(fixed.matchAll(/import\s+['"]\.\/globals\.css['"]/g))
  if (cssImports.length > 1) {
    const firstImport = cssImports[0]
    const remaining = fixed.slice(firstImport.index! + firstImport[0].length)
    const toRemove = remaining.match(/import\s+['"]\.\/globals\.css['"]\s*/)
    if (toRemove) {
      fixed = fixed.replace(toRemove[0], "\n")
    }
  }

  // 3. 移除 page.tsx 中的 CSS import（应该在 layout.tsx 中）
  if (fixed.includes("import './globals.css'") || fixed.includes('import "./globals.css"')) {
    fixed = fixed.replace(/import\s+['"]\.\/globals\.css['"]\s*\n?/g, "")
  }

  // 4. 修复类型问题 - 为没有类型的 useState 添加类型
  // 修复 useState(0) → useState<number>(0)
  fixed = fixed.replace(
    /useState\((\d+)\)/g,
    'useState<number>($1)'
  )
  fixed = fixed.replace(
    /useState\('([^']*)'\)/g,
    'useState<string>(\'$1\')'
  )

  // 修复 useState(null) → useState<string | null>(null)
  fixed = fixed.replace(
    /useState\((null)\)(?!\s*<)/g,
    'useState<string | null>($1)'
  )

  // 修复 useState(false) → useState<boolean>(false)
  fixed = fixed.replace(
    /useState\((false)\)(?!\s*<)/g,
    'useState<boolean>($1)'
  )

  // 修复 useState(true) → useState<boolean>(true)
  fixed = fixed.replace(
    /useState\((true)\)(?!\s*<)/g,
    'useState<boolean>($1)'
  )

  // 修复 useState([]) → useState<any[]>([])
  fixed = fixed.replace(
    /useState\(\[\]\)(?!\s*<)/g,
    'useState<any[]>([])'
  )

  // 修复 useState({}) → useState<Record<string, any>>({})
  fixed = fixed.replace(
    /useState\(\{\}\)(?!\s*<)/g,
    'useState<Record<string, any>>({})'
  )

  // 5. 修复错误处理 - 确保错误类型正确
  fixed = fixed.replace(
    /const\s+\[error,\s*setError\]\s*=\s*useState\((null)\)(?!\s*<)/g,
    'const [error, setError] = useState<string | null>($1)'
  )

  // 6. 修复错误类型判断
  fixed = fixed.replace(
    /setError\(err\.message\)/g,
    'setError(err instanceof Error ? err.message : "Unknown error")'
  )

  // 7. 修复 error 类型的使用
  fixed = fixed.replace(
    /\{error\.message\}/g,
    '{error}'
  )

  // 8. 移除错误的 React 导入
  fixed = fixed.replace(/import\s+{\s*useClient\s*}\s+from\s+['"]react['"]\s*/g, "")
  fixed = fixed.replace(/import\s+useClient\s+from\s+['"]react['"]\s*/g, "")

  return fixed
}

/**
 * 修复 layout.tsx 文件
 */
function fixLayoutFile(content: string): string {
  let fixed = content

  // 确保 CSS import 存在
  if (!fixed.includes('import "./globals.css"') && !fixed.includes("import './globals.css'")) {
    const firstImportMatch = fixed.match(/import\s+.*from\s+['"].*['"]/)
    if (firstImportMatch) {
      const insertIndex = fixed.indexOf(firstImportMatch[0]) + firstImportMatch[0].length
      fixed = fixed.slice(0, insertIndex) + '\nimport "./globals.css"' + fixed.slice(insertIndex)
    } else {
      // 如果没有其他 import，在文件开头添加
      fixed = 'import "./globals.css"\n\n' + fixed
    }
  }

  // 修复组件名称
  fixed = fixed.replace(
    /export\s+default\s+function\s+Layout\s*\(/,
    'export default function RootLayout('
  )

  return fixed
}

/**
 * 修复 tailwind.config.ts 文件
 */
function fixTailwindConfig(content: string): string {
  let fixed = content

  // 确保 content 数组正确配置
  if (fixed.includes('content: []') || fixed.includes('content:[]')) {
    fixed = fixed.replace(
      /content:\s*\[\]/,
      'content: [\n    "./app/**/*.{js,ts,jsx,tsx,mdx}",\n  ]'
    )
  }

  // 添加类型导入
  if (!fixed.includes('import type { Config }')) {
    fixed = 'import type { Config } from "tailwindcss"\n\n' + fixed
  }

  // 添加 satisfies Config
  if (fixed.includes('export default {') && !fixed.includes('satisfies Config')) {
    fixed = fixed.replace(/(export default \{[\s\S]*\})/, '$1 satisfies Config')
  }

  return fixed
}
