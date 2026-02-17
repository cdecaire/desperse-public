/**
 * ModelViewer Component
 * Wrapper for @google/model-viewer to display GLB/GLTF 3D models
 */

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ModelViewerProps extends React.HTMLAttributes<HTMLElement> {
  src: string
  alt?: string
  /** Show controls for interaction */
  controls?: boolean
  /** Auto-rotate the model */
  autoRotate?: boolean
  /** Camera orbit target */
  cameraOrbit?: string
  /** Field of view */
  cameraFov?: number
  /** Minimum camera orbit distance */
  minCameraOrbit?: string
  /** Maximum camera orbit distance */
  maxCameraOrbit?: string
  /** Exposure level */
  exposure?: number
  /** Shadow intensity */
  shadowIntensity?: number
  /** Environment image for lighting */
  environmentImage?: string
  /** Poster image to show before model loads */
  poster?: string
  /** Loading strategy */
  loading?: 'lazy' | 'eager'
  /** AR mode */
  ar?: boolean
  /** AR scale */
  arScale?: string
  /** AR placement */
  arPlacement?: 'floor' | 'wall'
  /** Interaction prompt */
  interactionPrompt?: 'auto' | 'when-focused' | 'none'
  /** Interaction prompt threshold */
  interactionPromptThreshold?: number
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        alt?: string
        'auto-rotate'?: boolean
        'camera-orbit'?: string
        'camera-fov'?: number
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        exposure?: number
        'shadow-intensity'?: number
        'environment-image'?: string
        poster?: string
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
  poster,
  loading = 'lazy',
  ar = false,
  arScale = 'auto',
  arPlacement = 'floor',
  interactionPrompt = 'auto',
  interactionPromptThreshold = 3000,
  ...props
}: ModelViewerProps) {
  const modelViewerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Dynamically import model-viewer to ensure it's loaded
    import('@google/model-viewer').catch((error) => {
      console.error('Failed to load model-viewer:', error)
    })
  }, [])

  return (
    <model-viewer
      ref={modelViewerRef}
      src={src}
      alt={alt}
      className={cn('w-full h-full', className)}
      controls={controls}
      auto-rotate={autoRotate}
      camera-orbit={cameraOrbit}
      camera-fov={cameraFov}
      min-camera-orbit={minCameraOrbit}
      max-camera-orbit={maxCameraOrbit}
      exposure={exposure}
      shadow-intensity={shadowIntensity}
      environment-image={environmentImage}
      poster={poster}
      loading={loading}
      ar={ar}
      ar-scale={arScale}
      ar-placement={arPlacement}
      interaction-prompt={interactionPrompt}
      interaction-prompt-threshold={interactionPromptThreshold}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
      }}
      {...props}
    />
  )
}

export default ModelViewer

