import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Camera, Upload, Image as ImageIcon, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImageCaptureProps {
    currentImage?: string;
    onImageCapture: (base64: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Detect if device is mobile
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export function ProductImageCapture({ currentImage, onImageCapture, open, onOpenChange }: ImageCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isMobile] = useState(isMobileDevice());
    const [activeTab, setActiveTab] = useState(isMobileDevice() ? "camera" : "upload");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImageSrc(dataUrl);
                stopCamera();
            }
        }
    };

    // File upload handling
    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setImageSrc(reader.result as string));
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

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return canvas.toDataURL('image/jpeg');
    };

    const handleSave = async () => {
        try {
            if (imageSrc && croppedAreaPixels) {
                const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
                if (croppedImage) {
                    onImageCapture(croppedImage);
                    onOpenChange(false);
                    setImageSrc(null);
                    stopCamera();
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Gagal memproses gambar");
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
                    aspect={1}
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
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[60vh] sm:h-[500px]">
                            <TabsList className={`w-full rounded-none border-b-2 border-brand-black p-0 h-14 bg-white ${isMobile ? 'grid grid-cols-2' : ''}`}>
                                {isMobile && (
                                    <TabsTrigger
                                        value="camera"
                                        onClick={startCamera}
                                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-brand-orange h-full font-bold border-r-2 border-brand-black uppercase tracking-wider text-xs sm:text-sm transition-all"
                                    >
                                        <Camera className="w-4 h-4 mr-2" /> Kamera
                                    </TabsTrigger>
                                )}
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

                            <TabsContent value="upload" className="flex-1 p-6 m-0 flex flex-col items-center justify-center bg-gray-50">
                                <div className="w-full max-w-sm">
                                    <label htmlFor="file-upload" className="group flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-gray-300 cursor-pointer bg-white hover:bg-blue-50 hover:border-brand-blue transition-all rounded-xl">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                <Upload className="w-10 h-10 text-brand-blue" />
                                            </div>
                                            <p className="mb-2 text-lg font-bold text-gray-700 group-hover:text-brand-blue">Klik untuk upload foto</p>
                                            <p className="text-sm text-gray-500 font-mono">Format: PNG, JPG (Max 5MB)</p>
                                        </div>
                                        <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                                    </label>
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        // Editor Mode (Crop & Zoom)
                        <div className="flex flex-col max-h-[90vh]">
                            <div className="relative h-[350px] sm:h-[400px] bg-black overflow-hidden flex-shrink-0">
                                {renderCropper()}
                            </div>
                            <div className="p-4 bg-white border-t-2 border-brand-black flex-shrink-0">
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
