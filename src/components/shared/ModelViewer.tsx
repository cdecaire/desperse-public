/**
 * ModelViewer Component
 * Wrapper for @google/model-viewer to display GLB/GLTF 3D models
 *
 * Proxies the GLB fetch through /api/v1/media/proxy to bypass
 * Vercel bot-challenge CORS issues on direct blob storage requests.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'

interface ModelViewerProps extends React.HTMLAttributes<HTMLElement> {
  src: string
  alt?: string
  controls?: boolean
  autoRotate?: boolean
  cameraOrbit?: string
  cameraFov?: number
  minCameraOrbit?: string
  maxCameraOrbit?: string
  exposure?: number
  shadowIntensity?: number
  environmentImage?: string
  loading?: 'lazy' | 'eager'
  ar?: boolean
  arScale?: string
  arPlacement?: 'floor' | 'wall'
  interactionPrompt?: 'auto' | 'when-focused' | 'none'
  interactionPromptThreshold?: number
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        alt?: string
        // model-viewer treats attribute presence as truthy — pass undefined to omit
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'camera-orbit'?: string
        'camera-fov'?: number
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        exposure?: number
        'shadow-intensity'?: number
        'environment-image'?: string
        loading?: 'lazy' | 'eager'
        ar?: boolean
        'ar-scale'?: string
        'ar-placement'?: 'floor' | 'wall'
        'interaction-prompt'?: 'auto' | 'when-focused' | 'none'
        'interaction-prompt-threshold'?: number
      }
    }
  }
}

export function ModelViewer({
  src,
  alt = '3D Model',
  className,
  controls = true,
  autoRotate = false,
  cameraOrbit = 'auto auto auto',
  cameraFov = 45,
  minCameraOrbit = 'auto auto auto',
  maxCameraOrbit = 'auto auto auto',
  exposure = 1,
  shadowIntensity = 0,
  environmentImage,
  loading = 'lazy',
  ar = false,
  arScale = 'auto',
  arPlacement = 'floor',
  interactionPrompt = 'auto',
  interactionPromptThreshold = 3000,
  ...props
}: ModelViewerProps) {
  const [ready, setReady] = useState(false)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    import('@google/model-viewer')
      .then(() => setReady(true))
      .catch((err) => {
        console.error('[ModelViewer] Failed to load @google/model-viewer:', err)
        setError(true)
      })
  }, [])

  useEffect(() => {
    if (!ready || !src) return

    let cancelled = false
    let objectUrl: string | null = null

    setError(false)
    setBlobSrc(null)

    const proxyUrl = `/api/v1/media/proxy?url=${encodeURIComponent(src)}`
    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobSrc(objectUrl)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[ModelViewer] Failed to fetch model:', err)
        setError(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [ready, src])

  const bgClass = 'bg-zinc-200 dark:bg-zinc-800'

  if (error) {
    return (
      <div
        className={cn(`w-full h-full flex flex-col items-center justify-center ${bgClass} text-muted-foreground`, className)}
        {...props}
      >
        <Icon name="cube" variant="regular" className="text-2xl mb-2" />
        <span className="text-sm">Failed to load 3D model</span>
      </div>
    )
  }

  if (!ready || !blobSrc) {
    return (
      <div
        className={cn(`w-full h-full flex items-center justify-center ${bgClass}`, className)}
        {...props}
      >
        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <model-viewer
      src={blobSrc}
      alt={alt}
      className={cn(`w-full h-full block ${bgClass}`, className)}
      camera-controls={controls || undefined}
      auto-rotate={autoRotate || undefined}
      camera-orbit={cameraOrbit}
      camera-fov={cameraFov}
      min-camera-orbit={minCameraOrbit}
      max-camera-orbit={maxCameraOrbit}
      exposure={exposure}
      shadow-intensity={shadowIntensity}
      environment-image={environmentImage}
      loading={loading}
      ar={ar || undefined}
      ar-scale={arScale}
      ar-placement={arPlacement}
      interaction-prompt={interactionPrompt}
      interaction-prompt-threshold={interactionPromptThreshold}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
      {...props}
    />
  )
}

export default ModelViewer
