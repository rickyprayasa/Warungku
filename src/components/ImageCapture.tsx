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
}

export function ProductImageCapture({ currentImage, onImageCapture }: ImageCaptureProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [defaultTab, setDefaultTab] = useState("camera");
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
                    setIsOpen(false);
                    setImageSrc(null);
                    stopCamera(); // Ensure camera is stopped
                }
            }
        } catch (e) {
            console.error(e);
            toast.error("Gagal memproses gambar");
        }
    };

    const handleClose = () => {
        setIsOpen(false);
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
        <>
            {/* Trigger Area */}
            <div className="border-2 border-dashed border-brand-black bg-gray-50 min-h-[200px] relative group overflow-hidden">
                {currentImage ? (
                    <div
                        onClick={() => {
                            setDefaultTab("camera");
                            setIsOpen(true);
                        }}
                        className="w-full h-full absolute inset-0 cursor-pointer"
                    >
                        <img src={currentImage} alt="Preview" className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-brand-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <PencilIcon className="w-8 h-8 text-white mb-2" />
                            <span className="text-white font-bold font-mono uppercase tracking-wider text-sm">Ubah Foto</span>
                        </div>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col sm:flex-row">
                        {/* Camera Trigger */}
                        <div
                            onClick={() => {
                                setDefaultTab("camera");
                                setIsOpen(true);
                            }}
                            className="flex-1 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-brand-orange/10 transition-colors border-b-2 sm:border-b-0 sm:border-r-2 border-dashed border-brand-black/20 group/camera"
                        >
                            <div className="w-12 h-12 bg-white border-2 border-brand-black rounded-full flex items-center justify-center mb-2 shadow-hard group-hover/camera:translate-x-0.5 group-hover/camera:translate-y-0.5 group-hover/camera:shadow-none transition-all">
                                <Camera className="w-6 h-6 text-brand-black" />
                            </div>
                            <span className="font-bold font-mono text-xs uppercase tracking-wider">Kamera</span>
                        </div>

                        {/* Upload Trigger */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-brand-blue/10 transition-colors group/upload"
                        >
                            <div className="w-12 h-12 bg-white border-2 border-brand-black rounded-full flex items-center justify-center mb-2 shadow-hard group-hover/upload:translate-x-0.5 group-hover/upload:translate-y-0.5 group-hover/upload:shadow-none transition-all">
                                <Upload className="w-6 h-6 text-brand-black" />
                            </div>
                            <span className="font-bold font-mono text-xs uppercase tracking-wider">Upload</span>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onFileChange}
                        />
                    </div>
                )}
            </div>

            {/* Main Dialog */}
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent className="sm:max-w-[600px] border-4 border-brand-black rounded-none bg-brand-white p-0 overflow-hidden gap-0 shadow-hard-xl">
                    <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-orange flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="font-display text-xl font-bold flex items-center text-brand-black uppercase tracking-wider">
                            <Camera className="w-6 h-6 mr-2 border-2 border-brand-black p-0.5 bg-white rounded-sm" />
                            Ambil / Edit Foto
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-0 bg-gray-100">
                        {!imageSrc ? (
                            <Tabs defaultValue={defaultTab} className="w-full flex flex-col h-[500px]">
                                {defaultTab === 'upload' && (
                                    <TabsList className="w-full grid grid-cols-2 rounded-none border-b-2 border-brand-black p-0 h-14 bg-white">
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
                                            className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-brand-orange h-full font-bold uppercase tracking-wider text-xs sm:text-sm transition-all"
                                        >
                                            <Upload className="w-4 h-4 mr-2" /> Upload File
                                        </TabsTrigger>
                                    </TabsList>
                                )}

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
                            <div className="flex flex-col h-[600px] sm:h-[500px]">
                                <div className="relative flex-1 bg-black overflow-hidden">
                                    {renderCropper()}
                                </div>
                                <div className="p-4 bg-white border-t-2 border-brand-black z-10">
                                    <div className="flex items-center gap-4 mb-6">
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setImageSrc(null)}
                                            className="h-12 border-2 border-brand-black rounded-none font-bold hover:bg-gray-100 uppercase tracking-wider"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" /> Ulangi
                                        </Button>
                                        <Button
                                            onClick={handleSave}
                                            className="h-12 bg-brand-green text-white border-2 border-brand-black rounded-none font-bold hover:bg-green-600 shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all uppercase tracking-wider"
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
        </>
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
