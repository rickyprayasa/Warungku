import { toast } from 'sonner';

// Custom error handler for queries
export function handleQueryError(error: unknown) {
  if (error instanceof Error) {
    // Check for specific Supabase errors
    if (error.message.includes('JWT')) {
      toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      return;
    }
    
    if (error.message.includes('timeout') || error.message.includes('Koneksi lambat')) {
      toast.error('Koneksi lambat. Mencoba lagi...');
      return;
    }
    
    if (error.message.includes('network')) {
      toast.error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      return;
    }
    
    // Generic error
    toast.error(`Terjadi kesalahan: ${error.message}`);
  } else {
    toast.error('Terjadi kesalahan yang tidak diketahui');
  }
}

// Retry logic - only retry on network/timeout errors
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // Don't retry more than 2 times
  if (failureCount >= 2) return false;
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Retry on network/timeout errors
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('koneksi')
    ) {
      return true;
    }
    
    // Don't retry on auth errors
    if (message.includes('jwt') || message.includes('auth')) {
      return false;
    }
  }
  
  // Default: don't retry
  return false;
}

// Exponential backoff delay
export function getRetryDelay(attemptIndex: number): number {
  // 1st retry: 1s, 2nd retry: 2s, 3rd retry: 4s, max 10s
  return Math.min(1000 * Math.pow(2, attemptIndex), 10000);
}

// Check if error is recoverable
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // These errors are NOT recoverable (don't show retry)
    if (
      message.includes('not found') ||
      message.includes('forbidden') ||
      message.includes('unauthorized') ||
      message.includes('jwt')
    ) {
      return false;
    }
  }
  
  // Default: error is recoverable
  return true;
}

// Format error message for user display
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Map technical errors to user-friendly messages
    if (message.includes('JWT')) {
      return 'Sesi Anda telah berakhir';
    }
    if (message.includes('timeout')) {
      return 'Koneksi timeout';
    }
    if (message.includes('network')) {
      return 'Tidak ada koneksi internet';
    }
    if (message.includes('duplicate')) {
      return 'Data sudah ada';
    }
    if (message.includes('foreign key')) {
      return 'Data tidak dapat dihapus karena masih digunakan';
    }
    
    return message;
  }
  
  return 'Terjadi kesalahan yang tidak diketahui';
}
