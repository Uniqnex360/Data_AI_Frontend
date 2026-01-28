import { AuditTrail } from '../types/database.types';
import api from '../lib/api';
export const auditService={
    async getAuditLogs():Promise<AuditTrail[]>{
        try {
            const {data}=await api.get<AuditTrail[]>('/audit-trail')
            return data||[]
        } catch (error) {
            console.error("Failed to fetch audit logs",error)
            return []
        }
    }
}