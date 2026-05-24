"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Printer, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getFileViewUrl } from "@/lib/storage"

interface FileViewerModalProps {
  fileId: string | null
  label?: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

const LENS_SIZE = 180
const ZOOM = 2.8

function isPdf(fileId: string) {
  return fileId.toLowerCase().endsWith(".pdf")
}

export function FileViewerModal({ fileId, label, open, onOpenChange }: FileViewerModalProps) {
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number; nw: number; nh: number } | null>(null)
  const [pressing, setPressing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const url = fileId ? getFileViewUrl(fileId) : ""
  const pdf = fileId ? isPdf(fileId) : false

  function handleImgLoad() {
    const img = imgRef.current
    if (!img) return
    setImgSize({ w: img.clientWidth, h: img.clientHeight, nw: img.naturalWidth, nh: img.naturalHeight })
  }

  const updateLens = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img) return
    const rect = img.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null)
      return
    }
    setLens({ x, y })
  }, [])

  const bgSize = imgSize ? `${imgSize.nw * ZOOM}px ${imgSize.nh * ZOOM}px` : "auto"
  const bgPos = lens && imgSize
    ? (() => {
        const scaleX = imgSize.nw / imgSize.w
        const scaleY = imgSize.nh / imgSize.h
        const bx = -(lens.x * scaleX * ZOOM - LENS_SIZE / 2)
        const by = -(lens.y * scaleY * ZOOM - LENS_SIZE / 2)
        return `${bx}px ${by}px`
      })()
    : "0 0"

  if (!fileId) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setLens(null); setPressing(false) } }}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>{label ?? "File Preview"}</DialogTitle>
        </DialogHeader>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
          <span className="text-sm font-medium text-muted-foreground">{label ?? "File Preview"}</span>
          <div className="flex items-center gap-1">
            {pdf && (
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs"
                onClick={() => (document.querySelector("iframe#file-preview") as HTMLIFrameElement)?.contentWindow?.print()}>
                <Printer className="w-3.5 h-3.5" />Print
              </Button>
            )}
            {!pdf && (
              <span className="text-xs text-muted-foreground mr-2">Hold to magnify</span>
            )}
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => window.open(url, "_blank")}>
              <ExternalLink className="w-3.5 h-3.5" />Open
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/30 p-4">
          {pdf ? (
            <iframe id="file-preview" src={url} className="w-full h-full border-0 rounded" title={label ?? "File Preview"} />
          ) : (
            <div
              ref={containerRef}
              className="relative inline-block select-none"
              style={{ cursor: pressing ? "none" : "default" }}
              onMouseDown={(e) => { if (e.button === 0) { setPressing(true); updateLens(e) } }}
              onMouseMove={(e) => { if (pressing) updateLens(e) }}
              onMouseUp={() => { setPressing(false); setLens(null) }}
              onMouseLeave={() => { setPressing(false); setLens(null) }}
            >
              <Image
                ref={imgRef}
                src={url}
                alt={label ?? "Preview"}
                width={1200}
                height={900}
                className="max-w-full max-h-[calc(90vh-100px)] rounded shadow-md object-contain"
                draggable={false}
                unoptimized
                onLoad={handleImgLoad}
              />
              {/* Magnifier lens */}
              {pressing && lens && imgSize && (
                <div
                  className="pointer-events-none absolute rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_8px_32px_rgba(0,0,0,0.35)]"
                  style={{
                    width: LENS_SIZE,
                    height: LENS_SIZE,
                    left: lens.x - LENS_SIZE / 2,
                    top: lens.y - LENS_SIZE / 2,
                    backgroundImage: `url(${url})`,
                    backgroundSize: bgSize,
                    backgroundPosition: bgPos,
                    backgroundRepeat: "no-repeat",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
