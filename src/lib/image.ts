export function fitWithin(w: number, h: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Resizes a camera photo for mobile display (≈1600 px, JPEG ~0.82), honouring EXIF orientation. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ base64: string; contentType: 'image/jpeg'; filename: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality))
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return { base64: await blobToBase64(blob), contentType: 'image/jpeg', filename: `loodi-mate-${stamp}.jpg` }
}
