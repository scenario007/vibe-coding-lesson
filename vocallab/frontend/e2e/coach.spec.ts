import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { test, expect } from '@playwright/test'

const fixtures = resolve(process.env.VOCALLAB_COACH_FIXTURES ?? '../.local/coach-fixtures')

test.beforeAll(() => {
  execFileSync(process.env.VOCALLAB_PYTHON ?? '../.venv/bin/python', ['../scripts/fixtures.py', fixtures])
})

test('maps acoustic measures, edits and plays a region, and invalidates old evidence after realignment', async ({ page }) => {
  test.setTimeout(150_000)
  await page.goto('/')
  if (process.env.VOCALLAB_TEST_COACH_PROVIDER) {
    await page.getByRole('button', { name: 'AI 服务设置' }).click()
    const settings = page.getByRole('dialog', { name: 'AI 服务设置' })
    const key = settings.getByLabel('API Key')
    await expect(key).toHaveAttribute('type', 'password')
    try {
      await key.fill('fixture-deepseek')
      await expect(settings.getByRole('button', { name: '测试连接' })).toBeDisabled()
      await settings.getByRole('button', { name: '保存密钥' }).click()
      await expect(settings.getByText('密钥已保存。')).toBeVisible()
      await expect(key).toHaveValue('')
      await settings.getByRole('button', { name: '测试连接' }).click()
      await expect(settings.getByText('文本模型 · 可用')).toBeVisible()
      await expect(settings.getByText('联网检索 · 可用')).toBeVisible()
    } finally {
      await settings.getByRole('button', { name: '恢复项目配置' }).click()
      await expect(settings.getByText('已移除此处设置，恢复项目配置。')).toBeVisible()
      await settings.getByRole('button', { name: '关闭' }).click()
    }
  }
  const reference = page.getByRole('region', { name: '原唱' })
  const cover = page.getByRole('region', { name: '我的演唱' })
  await reference.getByLabel('原唱文件').setInputFiles(resolve(fixtures, 'reference.mp3'))
  await cover.getByLabel('我的演唱文件').setInputFiles(resolve(fixtures, 'delayed.mov'))
  await reference.getByRole('checkbox', { name: /含伴奏/ }).uncheck()
  await reference.getByLabel('终点（秒）').fill('5.8')
  await cover.getByLabel('终点（秒）').fill('6.8')
  await page.getByRole('button', { name: '开始分析' }).click()
  await expect(page.getByRole('heading', { name: '演唱分析报告' })).toBeVisible({ timeout: 100_000 })
  const navigation = page.getByRole('navigation', { name: '报告导航' })
  await navigation.getByRole('link', { name: '声学证据' }).click()
  await expect(page).toHaveURL(/#report-evidence$/)
  await expect(page.getByRole('heading', { name: '声学观察与对齐' })).toBeInViewport()
  await navigation.getByRole('link', { name: 'AI 声乐教练' }).click()
  await expect(page).toHaveURL(/#report-coach$/)
  const coach = page.getByRole('region', { name: '声乐教练' })
  await coach.getByRole('button', { name: '本地专项分析' }).click()
  const map = coach.getByRole('region', { name: '歌曲难点地图' })
  const marks = map.getByRole('button', { name: /^定位 / })
  await expect(marks.first()).toBeVisible()
  await marks.first().click()
  await map.getByRole('button', { name: '复听原唱' }).click()
  await expect.poll(() => page.locator('audio').first().evaluate(el => el.paused)).toBe(false)
  await map.getByRole('button', { name: '编辑', exact: true }).click()
  await map.getByLabel('难点标题').fill('我想练这句')
  await map.getByRole('button', { name: '保存难点' }).click()
  await expect(map.getByRole('button', { name: /^定位 我想练这句/ })).toBeVisible()
  await page.getByLabel('手动偏移（秒）').fill('0.35')
  await page.getByRole('button', { name: '应用偏移' }).click()
  await expect(coach.getByText(/旧比较和 AI 结论已过期/)).toBeVisible()
  await coach.getByRole('button', { name: '更新声学证据' }).click()
  await expect(coach.getByText(/旧比较和 AI 结论已过期/)).toHaveCount(0)
  await expect(map.getByRole('button', { name: /^定位 我想练这句/ })).toBeVisible()
  await page.reload()
  await expect(map.getByRole('button', { name: /^定位 我想练这句/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: '波形对照' })).toHaveCount(0)
  await expect(page.getByText('音准分', { exact: true })).toHaveCount(0)

  if (process.env.VOCALLAB_TEST_COACH_PROVIDER) {
    await coach.getByLabel('歌名').fill(`高音显示测试 ${Date.now()}`)
    await expect(coach.getByRole('button', { name: '联网查歌曲资料' })).toHaveCount(0)
    const native = await coach.getByText('DeepSeek 联网已配置', { exact: false }).count() > 0
    await coach.getByRole('button', { name: '生成 AI 深度分析' }).click()
    await expect(coach.getByRole('region', { name: 'AI 声乐分析报告' })).toBeVisible()
    await coach.getByText('歌曲研究与分析计划', { exact: true }).click()
    await expect(coach.getByRole('link', { name: '本地测试来源' }).first()).toBeVisible()
    await coach.getByText('本报告 AI 估算费用 待估算', { exact: true }).click()
    await expect(coach.getByText(native ? /已记录 4 次文本调用 · 输入 74 · 输出 23 tokens/ :
      /已记录 3 次文本调用 · 输入 54 · 输出 18 tokens/)).toBeVisible()
    await map.getByRole('button', { name: /^定位 实测难点/ }).click()
    await coach.getByLabel('你的问题').fill('这段有周期性波动吗？')
    await coach.getByRole('button', { name: '发送问题' }).click()
    await expect(coach.getByText('已检查周期性证据，覆盖不足的地方保留不确定性。')).toBeVisible()
    await expect(coach.getByText(/补充测量 · 颤音候选/)).toBeVisible()
  }
})
