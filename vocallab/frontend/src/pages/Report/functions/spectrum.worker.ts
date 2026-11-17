const fftSize = 4096
const bins = fftSize / 2 + 1
const hann = Float64Array.from({ length: fftSize }, (_, i) =>
  .5 - .5 * Math.cos(2 * Math.PI * i / (fftSize - 1)))
const gain = 2 / hann.reduce((sum, value) => sum + value, 0)
const reverse = new Uint16Array(fftSize)
for (let i = 1; i < fftSize; i++)
  reverse[i] = (reverse[i >> 1] >> 1) | ((i & 1) * (fftSize >> 1))
const cos = Float64Array.from({ length: fftSize / 2 }, (_, i) => Math.cos(-2 * Math.PI * i / fftSize))
const sin = Float64Array.from({ length: fftSize / 2 }, (_, i) => Math.sin(-2 * Math.PI * i / fftSize))
const real = new Float64Array(fftSize)
const imag = new Float64Array(fftSize)

function accumulate(samples: Float32Array, center: number, power: Float32Array, offset: number) {
  const start = center - fftSize / 2
  for (let j = 0; j < fftSize; j++) {
    real[reverse[j]] = (samples[start + j] ?? 0) * hann[j]
    imag[reverse[j]] = 0
  }
  for (let size = 2; size <= fftSize; size *= 2) {
    const half = size / 2
    const step = fftSize / size
    for (let i = 0; i < fftSize; i += size) {
      for (let j = 0; j < half; j++) {
        const a = i + j
        const b = a + half
        const c = cos[j * step]
        const s = sin[j * step]
        const r = c * real[b] - s * imag[b]
        const q = s * real[b] + c * imag[b]
        real[b] = real[a] - r
        imag[b] = imag[a] - q
        real[a] += r
        imag[a] += q
      }
    }
  }
  for (let i = 0; i < bins; i++) {
    const scale = i === 0 || i === bins - 1 ? gain / 2 : gain
    power[offset + i] += (real[i] ** 2 + imag[i] ** 2) * scale ** 2
  }
}

type Input = { type: 'load'; channels: Float32Array[]; rate: number } |
  { type: 'scan'; start: number; end: number; id: number }
let channels: Float32Array[] = []
let rate = 44100

self.addEventListener('message', (event: MessageEvent<Input>) => {
  const input = event.data
  if (input.type === 'load') {
    channels = input.channels
    rate = input.rate
    return
  }
  // Adjacent Hann windows overlap even at the widest displayed time range.
  const columns = Math.max(2, Math.ceil((input.end - input.start) / .032) + 1)
  const values = new Float32Array(columns * bins)
  for (let x = 0; x < columns; x++) {
    const time = input.start + x * (input.end - input.start) / (columns - 1)
    for (const channel of channels) accumulate(channel, Math.round(time * rate), values, x * bins)
  }
  for (let i = 0; i < values.length; i++) values[i] = 10 * Math.log10(Math.max(1e-12, values[i] / channels.length))
  self.postMessage({ id: input.id, values, columns, bins, binHz: rate / fftSize }, { transfer: [values.buffer] })
})
