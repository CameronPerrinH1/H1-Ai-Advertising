'use client'
/*
 * The black-out editor for screenshots (D73). The spa drags boxes over names,
 * numbers, addresses, or anything private; saving burns the boxes into a new
 * image and the original is dropped, so nothing under a box can be recovered.
 * Re-drawing through a canvas also strips the photo's hidden data (location,
 * device). Everything happens in the browser.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn } from './ui'

type Box = { x: number; y: number; w: number; h: number }

export function Redactor({ src, label, onSave, onClose }: {
  src: string
  /** e.g. "Screenshot 2 of 3" */
  label: string
  onSave: (url: string) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [drag, setDrag] = useState<Box | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => { dialog.current?.showModal() }, [])

  const draw = useCallback(() => {
    const c = canvas.current, i = img.current
    if (!c || !i) return
    const g = c.getContext('2d')!
    g.drawImage(i, 0, 0)
    g.fillStyle = '#000'
    for (const b of drag ? [...boxes, drag] : boxes) g.fillRect(b.x, b.y, b.w, b.h)
  }, [boxes, drag])

  useEffect(() => {
    setBoxes([])
    const i = new Image()
    i.onload = () => {
      img.current = i
      const c = canvas.current
      if (!c) return
      c.width = i.naturalWidth
      c.height = i.naturalHeight
      draw()
    }
    i.src = src
    // Only a new image reloads; the boxes redraw through the effect below.
  }, [src])
  useEffect(draw, [draw])

  /** A pointer position in the image's own pixels. */
  const at = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    const s = canvas.current!.width / r.width
    return { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s }
  }
  const boxFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Box =>
    ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) })

  const undo = () => setBoxes((all) => all.slice(0, -1))

  const save = () => {
    const c = canvas.current
    if (!c || !boxes.length) return onClose()
    c.toBlob((blob) => { if (blob) onSave(URL.createObjectURL(blob)) }, 'image/png')
  }

  return (
    <dialog ref={dialog} className="redact" aria-labelledby="redact-title" onCancel={(e) => { e.preventDefault(); onClose() }}
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo() } }}>
      <div className="mbox">
        <div>
          <p className="eyebrow">{label}</p>
          <h2 id="redact-title" className="redact__title">Black out anything private</h2>
          <p className="note" style={{ marginTop: 6 }}>
            Drag over names, phone numbers, addresses, faces, or anything else you’d rather we not see.
            The black boxes are permanent once you save. We only keep the blacked-out copy.
          </p>
        </div>
        <div className="cv">
          <canvas ref={canvas} aria-label="Screenshot. Drag to draw a black box."
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start.current = at(e) }}
            onPointerMove={(e) => { if (start.current) setDrag(boxFrom(start.current, at(e))) }}
            onPointerUp={(e) => {
              const b = start.current && boxFrom(start.current, at(e))
              start.current = null
              setDrag(null)
              if (b && b.w > 4 && b.h > 4) setBoxes((all) => [...all, b])
            }}
            onPointerCancel={() => { start.current = null; setDrag(null) }} />
        </div>
        <div className="row redact__bar">
          <Btn variant="outline" small onClick={undo} disabled={!boxes.length}>Undo</Btn>
          <Btn variant="outline" small onClick={() => setBoxes([])} disabled={!boxes.length}>Start over</Btn>
          <span className="redact__gap" />
          <Btn variant="outline" small onClick={onClose}>Cancel</Btn>
          <Btn small onClick={save}>{boxes.length ? 'Save' : 'Nothing to hide'}</Btn>
        </div>
      </div>
    </dialog>
  )
}
