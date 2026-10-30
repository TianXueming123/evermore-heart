import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const outputDir = fileURLToPath(new URL('../validation/', import.meta.url))
await mkdir(outputDir, { recursive: true })

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '7101', '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)

let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:7101/evermore-heart/')
      if (response.ok) {
        ready = true
        break
      }
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error(`Preview server did not start.\n${serverLog}`)

  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-dev-shm-usage'],
  })

  const errors = []
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('http://127.0.0.1:7101/evermore-heart/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3600)
  await page.screenshot({ path: `${outputDir}/desktop.png`, fullPage: true })

  const desktop = await page.evaluate(() => ({
    title: document.title,
    canvasWidth: document.querySelector('canvas')?.width ?? 0,
    canvasHeight: document.querySelector('canvas')?.height ?? 0,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  }))
  if (!desktop.canvasWidth || !desktop.canvasHeight) throw new Error('Heart canvas did not render.')
  if (desktop.horizontalOverflow) throw new Error('Desktop layout has horizontal overflow.')

  const animation = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return { changed: false, frames: 0 }
    const initialFrame = canvas.toDataURL()
    let frames = 0
    await new Promise((resolve) => {
      const started = performance.now()
      const measure = () => {
        frames += 1
        if (performance.now() - started >= 650) resolve(undefined)
        else requestAnimationFrame(measure)
      }
      requestAnimationFrame(measure)
    })
    return { changed: initialFrame !== canvas.toDataURL(), frames }
  })
  if (!animation.changed) throw new Error('Heart animation is not advancing.')

  await page.getByRole('button', { name: '轻触爱心，让浪漫绽放' }).click()
  await page.waitForTimeout(500)
  await page.getByText('遇见你，是我宇宙里最温柔的幸运').waitFor({ state: 'visible' })
  await page.screenshot({ path: `${outputDir}/desktop-bloom.png`, fullPage: true })

  await page.getByRole('button', { name: '写下心意' }).click()
  await page.getByPlaceholder('对方的名字或昵称').fill('小星星')
  await page.getByPlaceholder('爱你的人').fill('永远偏爱你的人')
  await page.getByRole('button', { name: '保存这份心意' }).click()
  await page.getByText('TO：小星星').waitFor({ state: 'visible' })
  await page.getByText('—— 永远偏爱你的人').waitFor({ state: 'visible' })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  mobile.on('pageerror', (error) => errors.push(error.message))
  await mobile.goto('http://127.0.0.1:7101/evermore-heart/', { waitUntil: 'networkidle' })
  await mobile.waitForTimeout(3600)
  await mobile.screenshot({ path: `${outputDir}/mobile.png`, fullPage: true })
  const mobileLayout = await mobile.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    canvasWidth: document.querySelector('canvas')?.width ?? 0,
  }))
  if (mobileLayout.horizontalOverflow) throw new Error('Mobile layout has horizontal overflow.')
  if (!mobileLayout.canvasWidth) throw new Error('Mobile heart canvas did not render.')
  if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`)

  console.log(JSON.stringify({ ok: true, desktop, mobile: mobileLayout, interactions: ['bloom', 'edit-letter'], errors }, null, 2))
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ])
}
