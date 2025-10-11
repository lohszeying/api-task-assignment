import { Request, Response } from 'express';
import { getDbHealth } from '../db/client';
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { json } from 'stream/consumers';

export const getApiStatus = (_req: Request, res: Response) => {
  res.send('API is running!');
};

export const checkDatabaseHealth = async (_req: Request, res: Response) => {
  try {
    const timestamp = await getDbHealth();
    res.json({
      status: 'ok',
      timestamp
    });
  } catch (error) {
    console.error('Database connectivity check failed', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
};

// Sample temporary endpoint just to test out Gemini. Will also put this into create tasks, when skills are empty.
// TODO: Remove this later!
export const getGemini = async (_req: Request, res: Response) => {
  const text = `
  This are the available skills: {1: 'Frontend', 2: 'Backend'}.

  Based on the map where key is taskId and value is description of task
  {'20348e46-f6fe-4f5d-b91e-0a43a9f7d09c': 'As a user, I want to be able to use website on both PC and phone'., '4f2c2007-5052-4635-b409-092a629fc834': 'As a logged-in user, I want to update my profile information and upload a profile picture.'}

  According to description of the task, assign skill or skills best suited. The format should be map where key is taskId, and value is array of skillsId.
  For example:
  {'20348e46-f6fe-4f5d-b91e-0a43a9f7d09c': [1],'4f2c2007-5052-4635-b409-092a629fc834': [1,2]}

  Please answer the following and return in JSON format: This is my taskId and desription of my task:
  {'b24c93ca-338a-41e3-acd2-6920290a570b': 'As a logged-in user, I want to update my profile information and upload a profile picture so that my account details are accurate and personalized.'}

  `


  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: text,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (response.text) {
    res.json(JSON.parse(response.text))
  } else {
    res.status(500).json({ message: 'Failed to call gemini' });
  }
  
}