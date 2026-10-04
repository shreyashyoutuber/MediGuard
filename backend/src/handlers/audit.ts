import { Request, Response } from 'express';
import { db } from '../repository';

export const getAuditLogs = (req: Request, res: Response) => {
  res.json({ success: true, data: db.getAuditEvents() });
};

export const getPrivacyReceipts = (req: Request, res: Response) => {
  res.json({ success: true, data: db.getPrivacyReceipts() });
};
