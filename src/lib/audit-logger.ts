// Audit logging utility for security events
import { supabase } from './supabase';

export interface AuditEvent {
  id?: string;
  userId?: string;
  storeId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  static async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Get client IP (in a real implementation, this would come from the server)
      const ip = this.getClientIP();
      const userAgent = navigator.userAgent;
      
      // Get current user if available
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      const auditEvent: AuditEvent = {
        ...event,
        userId,
        ip,
        userAgent,
        timestamp: Date.now(),
      };
      
      // In a real implementation, you would send this to a secure audit log table
      // For now, we'll log to console in development and send to error reporting in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT LOG]', auditEvent);
      } else {
        // In production, you might want to send this to a secure audit endpoint
        // This is just for demonstration - in a real app, you'd want a secure server-side endpoint
        console.log('[AUDIT LOG]', auditEvent);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
  
  private static getClientIP(): string {
    // This is a simplified approach
    // In a real implementation, you'd get this from the server-side request headers
    return 'unknown';
  }
  
  // Specific audit functions for common actions
  static async logLogin(userId: string, email: string): Promise<void> {
    await this.logEvent({
      action: 'login',
      resourceType: 'auth',
      metadata: { email }
    });
  }
  
  static async logLogout(userId: string): Promise<void> {
    await this.logEvent({
      action: 'logout',
      resourceType: 'auth'
    });
  }
  
  static async logProductCreate(userId: string, storeId: string, productId: string, productData: any): Promise<void> {
    await this.logEvent({
      action: 'create',
      resourceType: 'product',
      resourceId: productId,
      storeId,
      newValues: productData
    });
  }
  
  static async logProductUpdate(userId: string, storeId: string, productId: string, oldValues: any, newValues: any): Promise<void> {
    await this.logEvent({
      action: 'update',
      resourceType: 'product',
      resourceId: productId,
      storeId,
      oldValues,
      newValues
    });
  }
  
  static async logProductDelete(userId: string, storeId: string, productId: string, productData: any): Promise<void> {
    await this.logEvent({
      action: 'delete',
      resourceType: 'product',
      resourceId: productId,
      storeId,
      oldValues: productData
    });
  }
  
  static async logSaleCreate(userId: string, storeId: string, saleId: string, saleData: any): Promise<void> {
    await this.logEvent({
      action: 'create',
      resourceType: 'sale',
      resourceId: saleId,
      storeId,
      newValues: saleData
    });
  }
  
  static async logPurchaseCreate(userId: string, storeId: string, purchaseId: string, purchaseData: any): Promise<void> {
    await this.logEvent({
      action: 'create',
      resourceType: 'purchase',
      resourceId: purchaseId,
      storeId,
      newValues: purchaseData
    });
  }
  
  static async logUnauthorizedAccess(userId: string | null, resourceType: string, resourceId?: string, action: string = 'access'): Promise<void> {
    await this.logEvent({
      action: `unauthorized_${action}`,
      resourceType,
      resourceId,
      metadata: { attemptedAction: action }
    });
  }
  
  static async logSecurityEvent(severity: 'low' | 'medium' | 'high' | 'critical', message: string, metadata?: Record<string, any>): Promise<void> {
    await this.logEvent({
      action: 'security_event',
      resourceType: 'system',
      metadata: {
        severity,
        message,
        ...metadata
      }
    });
  }
}