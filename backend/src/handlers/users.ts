import { Request, Response } from 'express';
import { db } from '../repository';

export const getDemoUsers = (req: Request, res: Response) => {
  res.json({ success: true, data: db.getAllUsers() });
};
