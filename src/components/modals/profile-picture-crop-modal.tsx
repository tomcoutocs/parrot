"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ZoomIn, Loader2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface ProfilePictureCropModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageFile: File | null
  onCropComplete: (croppedFile: File) => void
  aspect?: number
}

const ASPECT_RATIO = 1 // Square crop for profile pictures
const MIN_DIMENSION = 150 // Minimum size for profile picture

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

export function ProfilePictureCropModal({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
  aspect = ASPECT_RATIO,
}: ProfilePictureCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Load image when file changes
  useEffect(() => {
    if (imageFile && open) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(imageFile)
    } else if (!open) {
      // Reset when modal closes
      setImageSrc(null)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setZoom(1)
      setScale(1)
    }
  }, [imageFile, open])

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspect))
  }, [aspect])

  const getCroppedImg = useCallback(
    async (
      image: HTMLImageElement,
      pixelCrop: PixelCrop,
      scale: number = 1
    ): Promise<File | null> => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        return null
      }

      // Calculate scale to ensure minimum dimension
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      const pixelRatio = window.devicePixelRatio

      canvas.width = pixelCrop.width * scaleX * pixelRatio * scale
      canvas.height = pixelCrop.height * scaleY * pixelRatio * scale

      ctx.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, 0, 0)
      ctx.imageSmoothingQuality = "high"

      const cropX = pixelCrop.x * scaleX
      const cropY = pixelCrop.y * scaleY

      ctx.drawImage(
        image,
        cropX,
        cropY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY
      )

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null)
              return
            }
            // Create a File object from the blob
            const file = new File([blob], imageFile?.name || "profile-picture.jpg", {
              type: "image/jpeg",
            })
            resolve(file)
          },
          "image/jpeg",
          0.95 // High quality
        )
      })
    },
    [imageFile]
  )

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current || !imageFile) {
      return
    }

    setIsProcessing(true)
    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop, scale)
      if (croppedFile) {
        onCropComplete(croppedFile)
        // Reset state
        setCrop(undefined)
        setCompletedCrop(undefined)
        setScale(1)
        setZoom(1)
        setImageSrc(null)
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error cropping image:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setScale(1)
    setZoom(1)
    setImageSrc(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
          <DialogDescription>
            Adjust the zoom and position to select the best part of your image for your profile picture.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {imageSrc && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  minWidth={MIN_DIMENSION}
                  minHeight={MIN_DIMENSION}
                  className="max-h-[400px]"
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc || undefined}
                    style={{
                      transform: `scale(${zoom})`,
                      maxWidth: "100%",
                      maxHeight: "400px",
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Zoom</span>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1x</span>
                  <span>3x</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!completedCrop || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Save Picture"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

