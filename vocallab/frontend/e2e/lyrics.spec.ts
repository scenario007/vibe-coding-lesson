import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const fixtures = resolve(process.env.VOCALLAB_BROWSER_FIXTURES ?? '../.local/browser-fixtures')
const version = { id: 101, trackName: '测试曲', artistName: '测试歌手', albumName: '录音室', duration: 6.35, hasSyncedLyrics: true }

test('looks up a version before analysis and follows the aligned audio in the report', async ({ page }) => {
  execFileSync(process.env.VOCALLAB_PYTHON ?? '../.venv/bin/python', ['../scripts/fixtures.py', fixtures])
  await page.route('**/api/searchlyricsapi', async route => {
    expect(route.request().postDataJSON()).toEqual({ title: '测试曲', artist: '测试歌手' })
    await route.fulfill({ json: [{ ...version, id: 102, albumName: '现场版', duration: 99 }, version] })
  })
  await page.route('**/api/getlyricsapi', async route => {
    expect(route.request().postDataJSON()).toEqual({ id: 101 })
    await route.fulfill({ json: { id: 101, syncedLyrics: '[al:录音室]\n[00:00.200]第一句\n[00:02.50][00:05.00]第二句\n[00:04.00]\n' } })
  })

  await page.goto('/')
  await page.getByLabel('原唱文件').setInputFiles(resolve(fixtures, 'reference.mp3'))
  await page.getByLabel('我的演唱文件').setInputFiles(resolve(fixtures, 'delayed.mov'))
  const original = page.getByRole('region', { name: '原唱', exact: true })
  const performance = page.getByRole('region', { name: '我的演唱' })
  await original.getByRole('checkbox', { name: /含伴奏/ }).uncheck()
  await original.getByLabel('起点（秒）').fill('0.6')
  await original.getByLabel('终点（秒）').fill('5.8')
  await performance.getByLabel('起点（秒）').fill('0.6')
  await performance.getByLabel('终点（秒）').fill('6.8')
  await page.getByText('查询同步歌词（选填）', { exact: true }).click()
  await page.getByLabel('歌名', { exact: true }).fill('测试曲')
  await page.getByLabel('歌手（选填）').fill('测试歌手')
  await page.getByRole('button', { name: '查询歌词', exact: true }).click()
  const candidates = page.getByRole('list', { name: '同步歌词版本' })
  await expect(candidates.getByRole('listitem').first()).toContainText('录音室')
  await candidates.getByRole('button', { name: '选用' }).first().click()
  await expect(page.getByText('已选 测试曲', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '开始分析' }).click()
  const lines = page.getByLabel('歌词时间轴')
  await expect(lines).toBeVisible({ timeout: 125_000 })
  const second = lines.getByRole('button', { name: '第二句' }).first()
  await second.click()
  const reference = page.getByTestId('pitch-audio-reference')
  const cover = page.getByTestId('pitch-audio-user')
  await expect.poll(() => reference.evaluate(element => element.currentTime)).toBeCloseTo(1.9, 1)
  await expect.poll(() => cover.evaluate(element => element.currentTime)).toBeCloseTo(2.9, 0)
  await expect(second).toHaveAttribute('aria-current', 'true')
  const before = await second.getAttribute('style')
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await expect(second).not.toHaveAttribute('style', before!)
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await page.getByLabel('歌词偏移（秒）').fill('1')
  await expect(second).not.toHaveAttribute('aria-current', 'true')
  await page.reload()
  await expect(page.getByLabel('歌词偏移（秒）')).toHaveValue('1')

})

test('empty lyrics results leave the completed report available', async ({ page }) => {
  const report = process.env.VOCALLAB_EXISTING_REPORT
  test.skip(!report, 'Provide an existing completed report to test a lyrics-only failure.')
  await page.route('**/api/searchlyricsapi', route => route.fulfill({ json: [] }))
  await page.goto(`/analysis/${report}`)
  await page.getByText('按歌名查询歌词', { exact: true }).click()
  await page.getByLabel('歌名', { exact: true }).fill('不存在的歌曲')
  await page.getByRole('button', { name: '查询歌词', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '没有找到带时间轴的歌词' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '演唱分析报告' })).toBeVisible()
})
