import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, Image as ImageIcon, RotateCcw, Check, Maximize2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImageCaptureProps {
    currentImage?: string;
    onCapture: (base64: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Detect if device is mobile
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export function ProductImageCapture({ currentImage, onCapture, open, onOpenChange }: ImageCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.8);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isMobile] = useState(isMobileDevice());
    const [activeTab, setActiveTab] = useState(isMobileDevice() ? "camera" : "upload");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain');

    // Reset zoom and crop when objectFit changes
    useEffect(() => {
        if (imageSrc) {
            if (objectFit === 'contain') {
                setZoom(0.8); // Smaller zoom to fit entire image
                setCrop({ x: 0, y: 0 });
            } else {
                setZoom(1); // Normal zoom for cover
                setCrop({ x: 0, y: 0 });
            }
        }
    }, [objectFit, imageSrc]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Handle dialog open state
    useEffect(() => {
        if (open) {
            if (currentImage) {
                setImageSrc(currentImage);
            } else {
                setImageSrc(null);
                setActiveTab(isMobile ? "camera" : "upload");
            }
        } else {
            stopCamera();
            setImageSrc(null);
        }
    }, [open, currentImage]);

    // Camera handling
    const startCamera = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Browser Anda tidak mendukung akses kamera.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Prefer back camera
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Gagal mengakses kamera. Pastikan izin diberikan.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                // Compress image with 0.6 quality to reduce size
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                const sizeKB = Math.round(dataUrl.length / 1024);
                console.log(`[ImageCapture] Camera photo size: ${sizeKB}KB`);
                setImageSrc(dataUrl);
                // Reset zoom and crop for captured photo
                setZoom(objectFit === 'contain' ? 0.8 : 1);
                setCrop({ x: 0, y: 0 });
                stopCamera();
            }
        }
    };

    // File upload handling
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
                // Reset zoom and crop for new image
                setZoom(objectFit === 'contain' ? 0.8 : 1);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
        }
    };

    // Crop handling
    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Calculate resize dimensions (max 600x450 to keep file size small)
        const maxWidth = 600;
        const maxHeight = 450;
        let targetWidth = pixelCrop.width;
        let targetHeight = pixelCrop.height;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
            const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
            targetWidth = Math.round(targetWidth * ratio);
            targetHeight = Math.round(targetHeight * ratio);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            targetWidth,
            targetHeight
        );

        // Compress with 0.6 quality for smaller file size
        const result = canvas.toDataURL('image/jpeg', 0.6);
        const sizeKB = Math.round(result.length / 1024);
        console.log(`[ImageCapture] Cropped image size: ${sizeKB}KB (${targetWidth}x${targetHeight})`);
        return result;
    };

    const handleSave = async () => {
        try {
            if (!imageSrc) {
                toast.error("Tidak ada gambar yang dipilih");
                return;
            }

            // If no crop area (shouldn't happen but just in case), use the whole image
            if (!croppedAreaPixels) {
                console.warn("No croppedAreaPixels, using full image");
                onCapture(imageSrc);
                onOpenChange(false);
                setImageSrc(null);
                stopCamera();
                return;
            }

            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onCapture(croppedImage);
                onOpenChange(false);
                setImageSrc(null);
                stopCamera();
                toast.success("Foto berhasil disimpan");
            } else {
                toast.error("Gagal memproses gambar");
            }
        } catch (e) {
            console.error("Error saving image:", e);
            toast.error(`Gagal memproses gambar: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        setImageSrc(null);
        stopCamera();
    };

    // Safe render for Cropper
    const renderCropper = () => {
        try {
            // @ts-ignore - react-easy-crop types might be tricky
            const CropperComponent = Cropper.default || Cropper;
            return (
                <CropperComponent
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={4 / 3}
                    objectFit={objectFit}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
            );
        } catch (e) {
            console.error("Cropper render error:", e);
            return <div className="text-white p-4">Gagal memuat editor gambar.</div>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[95vh] border-2 border-brand-black rounded-lg bg-brand-white p-0 overflow-hidden gap-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-orange flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="font-display text-xl font-bold flex items-center text-brand-black uppercase tracking-wider">
                        <Camera className="w-6 h-6 mr-2 border-2 border-brand-black p-0.5 bg-white rounded-sm" />
                        Ambil / Edit Foto
                    </DialogTitle>
                </DialogHeader>

                <div className="p-0 bg-gray-100">
                    {!imageSrc ? (
                        isMobile ? (
                            // Mobile: Show tabs with Camera and Upload
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[60vh] sm:h-[500px]">
                                <TabsList className="w-full rounded-none border-b-2 border-brand-black p-0 h-14 bg-white grid grid-cols-2">
                                    <TabsTrigger
                                        value="camera"
                                        onClick={startCamera}
                                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-brand-orange h-full font-bold border-r-2 border-brand-black uppercase tracking-wider text-xs sm:text-sm transition-all"
                                    >
                                        <Camera className="w-4 h-4 mr-2" /> Kamera
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="upload"
                                        onClick={stopCamera}
                                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-brand-orange h-full font-bold uppercase tracking-wider text-xs sm:text-sm transition-all w-full"
                                    >
                                        <Upload className="w-4 h-4 mr-2" /> Upload File
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="camera" className="flex-1 p-0 m-0 relative bg-black flex flex-col">
                                    {isCameraOpen ? (
                                        <div className="relative w-full h-full flex flex-col bg-black">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="flex-1 w-full h-full object-cover"
                                            />

                                            {/* Camera Overlay Grid */}
                                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                                <div className="w-full h-full border-2 border-white/50 grid grid-cols-3 grid-rows-3">
                                                    <div className="border-r border-b border-white/30"></div>
                                                    <div className="border-r border-b border-white/30"></div>
                                                    <div className="border-b border-white/30"></div>
                                                    <div className="border-r border-b border-white/30"></div>
                                                    <div className="border-r border-b border-white/30"></div>
                                                    <div className="border-b border-white/30"></div>
                                                    <div className="border-r border-white/30"></div>
                                                    <div className="border-r border-white/30"></div>
                                                    <div></div>
                                                </div>
                                            </div>

                                            {/* Capture Button Area */}
                                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end pb-8">
                                                <Button
                                                    onClick={capturePhoto}
                                                    className="rounded-full w-20 h-20 p-1 bg-white border-4 border-gray-300 hover:bg-gray-100 hover:scale-105 transition-all shadow-lg"
                                                >
                                                    <div className="w-full h-full bg-red-500 rounded-full border-2 border-white"></div>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center bg-zinc-900">
                                            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                <Camera className="w-10 h-10 text-zinc-500" />
                                            </div>
                                            <h3 className="text-xl font-bold mb-2">Kamera Belum Aktif</h3>
                                            <p className="text-zinc-400 mb-8 max-w-xs mx-auto">Klik tombol di bawah untuk mengaktifkan kamera dan mengambil foto produk.</p>
                                            <Button
                                                onClick={startCamera}
                                                className="bg-brand-orange text-brand-black font-bold border-2 border-white hover:bg-white hover:text-black px-8 py-6 text-lg shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                            >
                                                Nyalakan Kamera
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="upload" className="flex-1 p-6 m-0 flex flex-col items-center justify-center bg-gray-50 overflow-y-auto">
                                    <div className="w-full max-w-sm space-y-3">
                                        <label htmlFor="file-upload" className="group flex flex-col items-center justify-center w-full h-64 border-4 border-dashed border-gray-300 cursor-pointer bg-white hover:bg-blue-50 hover:border-brand-blue transition-all rounded-xl">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <Upload className="w-8 h-8 text-brand-blue" />
                                                </div>
                                                <p className="mb-2 text-base font-bold text-gray-700 group-hover:text-brand-blue">Klik untuk upload foto</p>
                                                <p className="text-xs text-gray-500 font-mono">PNG, JPG, WEBP (Max 5MB)</p>
                                            </div>
                                            <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                                        </label>

                                        {/* Image Guidelines - Compact Version */}
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5">
                                            <div className="flex items-start gap-2">
                                                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                                <div className="text-[10px] leading-tight space-y-0.5">
                                                    <p className="font-bold text-blue-900 mb-1">Tips Foto Produk:</p>
                                                    <div className="text-blue-700 space-y-0.5">
                                                        <p>• Format: <span className="font-mono font-bold">JPG, PNG, WEBP</span></p>
                                                        <p>• Ukuran: <span className="font-bold">Max 5MB</span></p>
                                                        <p>• Resolusi: <span className="font-bold">Min 800x600px</span></p>
                                                        <p>• Rasio: <span className="font-bold">4:3 atau 1:1</span></p>
                                                        <p>• Gunakan <span className="font-bold">pencahayaan baik</span></p>
                                                        <p>• Background <span className="font-bold">bersih & polos</span></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            // Desktop: Upload only (no camera), more compact
                            <div className="p-4 bg-gray-50">
                                <div className="max-w-md mx-auto space-y-3">
                                    <label htmlFor="file-upload" className="group flex flex-col items-center justify-center w-full h-48 border-4 border-dashed border-gray-300 cursor-pointer bg-white hover:bg-blue-50 hover:border-brand-blue transition-all rounded-xl">
                                        <div className="flex flex-col items-center justify-center px-4 text-center">
                                            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Upload className="w-7 h-7 text-brand-blue" />
                                            </div>
                                            <p className="mb-1 text-sm font-bold text-gray-700 group-hover:text-brand-blue">Klik untuk upload foto</p>
                                            <p className="text-[10px] text-gray-500 font-mono">PNG, JPG, WEBP (Max 5MB)</p>
                                        </div>
                                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                                    </label>

                                    {/* Image Guidelines - Desktop Compact */}
                                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2">
                                        <div className="flex items-start gap-1.5">
                                            <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-[9px] leading-tight space-y-0.5">
                                                <p className="font-bold text-blue-900 mb-0.5">Tips Foto:</p>
                                                <div className="text-blue-700 space-y-0.5 grid grid-cols-2 gap-x-2">
                                                    <p>• JPG, PNG, WEBP</p>
                                                    <p>• Max 5MB</p>
                                                    <p>• Min 800x600px</p>
                                                    <p>• Rasio 4:3 / 1:1</p>
                                                    <p>• Pencahayaan baik</p>
                                                    <p>• Background bersih</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        // Editor Mode (Crop & Zoom)
                        <div className="flex flex-col max-h-[90vh]">
                            <div className="relative h-[350px] sm:h-[400px] bg-black overflow-hidden flex-shrink-0">
                                {renderCropper()}
                            </div>
                            <div className="p-4 bg-white border-t-2 border-brand-black flex-shrink-0">
                                {/* Fit Mode Toggle */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Maximize2 className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Mode Tampilan</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="w-3.5 h-3.5 text-blue-500 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-[200px] text-xs">
                                                    <p><b>Fit:</b> Tampilkan seluruh foto tanpa terpotong</p>
                                                    <p className="mt-1"><b>Fill:</b> Isi frame penuh, mungkin terpotong</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant={objectFit === 'contain' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setObjectFit('contain')}
                                            className={`flex-1 h-9 text-xs font-bold ${objectFit === 'contain'
                                                ? 'bg-brand-orange text-brand-black border-2 border-brand-black'
                                                : 'border-2 border-gray-300'
                                                }`}
                                        >
                                            Fit (Seluruh Foto)
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={objectFit === 'cover' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setObjectFit('cover')}
                                            className={`flex-1 h-9 text-xs font-bold ${objectFit === 'cover'
                                                ? 'bg-brand-orange text-brand-black border-2 border-brand-black'
                                                : 'border-2 border-gray-300'
                                                }`}
                                        >
                                            Fill (Isi Frame)
                                        </Button>
                                    </div>
                                </div>

                                {/* Zoom Slider */}
                                <div className="flex items-center gap-4 mb-4">
                                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                    <Slider
                                        value={[zoom]}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onValueChange={(value) => setZoom(value[0])}
                                        className="flex-1"
                                    />
                                    <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-1 border border-gray-300 rounded">{zoom.toFixed(1)}x</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setImageSrc(null);
                                            setActiveTab("camera");
                                            stopCamera();
                                        }}
                                        className="h-12 border-2 border-brand-black rounded-lg font-bold hover:bg-gray-100 uppercase tracking-wider text-sm"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" /> Ulangi
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        className="h-12 bg-green-600 text-white border-2 border-brand-black rounded-lg font-bold hover:bg-green-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all uppercase tracking-wider text-sm"
                                    >
                                        <Check className="w-5 h-5 mr-2" /> Simpan Foto
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function PencilIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    )
}
