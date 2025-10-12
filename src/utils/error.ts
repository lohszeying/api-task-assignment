import { HttpError } from "../services/errors";
import { Response } from 'express';

export const handleError = (error: unknown, res: Response, fallbackMessage: string) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};