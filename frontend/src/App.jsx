import { useRef, useState } from 'react'
import axios from 'axios'
import Webcam from 'react-webcam'
import './App.css'

const paletteMap = {
  Warm: {
    label: 'Earth tones',
    colors: [
      { hex: '#A25B26', name: 'Terracotta' },
      { hex: '#D98F55', name: 'Golden Honey' },
      { hex: '#C2A97F', name: 'Sandstone' },
      { hex: '#8F5E3F', name: 'Chestnut' },
    ],
  },
  Cool: {
    label: 'Jewel tones',
    colors: [
      { hex: '#1D4E89', name: 'Deep Sapphire' },
      { hex: '#5E7CFA', name: 'Iced Lapis' },
      { hex: '#7B5FA1', name: 'Velvet Orchid' },
      { hex: '#00A8C6', name: 'Aqua Mist' },
    ],
  },
  Neutral: {
    label: 'Soft neutrals',
    colors: [
      { hex: '#C1B497', name: 'Ivory' },
      { hex: '#B4A090', name: 'Oat' },
      { hex: '#8C7F71', name: 'Driftwood' },
      { hex: '#D8CAB8', name: 'Creamed Almond' },
    ],
  },
}

function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [previewUrl, setPreviewUrl] = useState('')
  const [result, setResult] = useState(null)
  const [showPalette, setShowPalette] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const webcamRef = useRef(null)

  const apiUrl = `${import.meta.env.VITE_API_URL || ''}/analyze`

  const getUndertoneFromHex = (hex) => {
    const sanitized = hex?.replace('#', '').trim()
    if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) return 'Neutral'

    const r = parseInt(sanitized.slice(0, 2), 16)
    const g = parseInt(sanitized.slice(2, 4), 16)
    const b = parseInt(sanitized.slice(4, 6), 16)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    if (diff < 20) return 'Neutral'
    if (r > b && r > g) return 'Warm'
    if (b > r && b > g) return 'Cool'
    if (g > r && g > b) return 'Warm'
    return 'Neutral'
  }

  const getSkinToneName = (hex) => {
    const sanitized = hex?.replace('#', '').trim()
    if (!/^[0-9a-fA-F]{6}$/.test(sanitized)) return 'Soft Glow'

    const r = parseInt(sanitized.slice(0, 2), 16)
    const g = parseInt(sanitized.slice(2, 4), 16)
    const b = parseInt(sanitized.slice(4, 6), 16)
    const brightness = (r + g + b) / 3
    const warmth = r - b

    if (brightness > 220) return 'Ivory'
    if (brightness > 190 && warmth > 20) return 'Golden Honey'
    if (brightness > 170 && warmth > 0) return 'Sand'
    if (brightness > 140 && warmth > 10) return 'Chestnut'
    if (brightness < 80) return 'Rich Espresso'
    if (warmth < -20) return 'Moonstone'
    return 'Soft Linen'
  }

  const submitImage = async (file) => {
    setLoading(true)
    setError('')
    setResult(null)
    setShowPalette(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(apiUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

    // We grab the first color [0] from the list of dominant colors the backend found
      const skinTone = response?.data?.primary_hex_colors?.[0] || response?.data?.skinTone;
      if (!skinTone) {
        throw new Error('No skin tone was returned from the backend.')
      }

      const undertone = getUndertoneFromHex(skinTone)
      setResult({
        skinTone,
        toneName: getSkinToneName(skinTone),
        undertone,
        palette: paletteMap[undertone] || paletteMap.Neutral,
      })
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || 'Unable to analyze the image. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleUploadChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }

    setPreviewUrl(URL.createObjectURL(file))
    setShowPalette(false)
    await submitImage(file)
  }

  const capturePhoto = () => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (!screenshot) {
      setError('Unable to capture a camera image.')
      return
    }
    setPreviewUrl(screenshot)
    setShowPalette(false)
    // We do NOT auto-submit here anymore. We wait for the user to click Analyze.
  }

  // NEW FUNCTION: This handles the submission of the previewed image
  const analyzePreview = async () => {
      if (!previewUrl) return
      
      let fileToSubmit;
      
      // Check if the preview is a base64 webcam shot or an uploaded object URL
      if (previewUrl.startsWith('data:image')) {
          fileToSubmit = dataURLtoFile(previewUrl, 'camera-capture.jpeg')
      } else {
          // If it was a standard file upload, we need to grab the original file from state.
          // To keep it simple for now, we just rely on handleUploadChange handling uploads directly.
          return; 
      }
      
      await submitImage(fileToSubmit)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/40">
        <header className="mb-8 flex flex-col gap-3 text-center sm:text-left sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Human Skin Tone Analyzer</p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find your undertone + clothing palette</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Upload a natural light photo or use your live camera to analyze skin tone and get tailored clothing recommendations.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          {['upload', 'camera'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab)
                setError('')
                setResult(null)
                setPreviewUrl('')
                setShowPalette(false)
              }}
              className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'border border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              {tab === 'upload' ? 'Upload Natural Light Photo' : 'Use Live Camera'}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            {activeTab === 'upload' ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Select a natural light image of your skin for the most accurate analysis.</p>
                <label className="block w-full rounded-3xl border border-slate-700 bg-slate-900/90 p-4 text-center text-sm text-slate-300 transition hover:border-slate-500">
                  <span className="block text-base font-medium text-white">Choose an image</span>
                  <input type="file" accept="image/*" onChange={handleUploadChange} className="mt-4 hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Allow camera access and capture a frame with visible skin under natural lighting.</p>
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-3">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user' }}
                    className="h-[320px] w-full overflow-hidden rounded-3xl object-cover"
                  />
                </div>
                
                {/* Updated Button Flow */}
                <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-600"
                    >
                      Capture frame
                    </button>
                    
                    {previewUrl && previewUrl.startsWith('data:image') && (
                        <button
                          type="button"
                          onClick={analyzePreview}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          Analyze Skin Tone
                        </button>
                    )}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                <div>
                  <p className="text-sm font-semibold text-white">Analyzing photo...</p>
                  <p className="text-sm text-slate-400">This may take a few seconds.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                {error}
              </div>
            )}

            {previewUrl && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-300">Preview</p>
                <img src={previewUrl} alt="Preview" className="w-full rounded-3xl object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300/80">Results</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Your skin tone assessment</h2>
            </div>

            {result ? (
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6">
                  <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-5 sm:flex-row sm:items-center">
                    <div className="h-24 w-24 rounded-3xl border border-slate-700 shadow-inner" style={{ backgroundColor: result.skinTone }} />
                    <div className="space-y-2">
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Skin tone</p>
                      <p className="text-2xl font-semibold text-white">{result.toneName}</p>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Undertone</p>
                      <p className="text-xl font-semibold text-white">{result.undertone}</p>
                    </div>
                  </div>
                </div>

                {!showPalette ? (
                  <button
                    type="button"
                    onClick={() => setShowPalette(true)}
                    className="w-full rounded-3xl bg-cyan-500 px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Suit me up!
                  </button>
                ) : null}

                {showPalette && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5">
                    <div className="mb-4">
                      <p className="text-sm text-slate-400">Recommended Clothing Palette</p>
                      <p className="mt-1 text-base font-semibold text-white">{result.palette.label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {result.palette.colors.map((color) => (
                        <div key={color.hex} className="rounded-3xl border border-slate-700 bg-slate-950/60 p-4 text-center">
                          <div className="mx-auto mb-3 h-16 w-16 rounded-2xl shadow-inner" style={{ backgroundColor: color.hex }} />
                          <p className="text-xs font-semibold text-slate-200">{color.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/90 p-6 text-sm text-slate-400">
                Upload or capture a photo to view your skin tone result and palette recommendations.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type:mime});
}

export default App
