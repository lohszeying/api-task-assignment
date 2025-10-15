import { GoogleGenAI, Type } from '@google/genai';

const MODEL = 'gemini-2.5-flash';

let cachedClient: GoogleGenAI | null = null;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
};

export interface SkillDescriptor {
  skillId: number;
  skillName: string;
}

export interface TaskDescriptor {
  taskId: string;
  description: string;
}

export const inferSkillsForTasks = async (
  tasks: TaskDescriptor[],
  skills: SkillDescriptor[]
): Promise<Record<string, number[]>> => {
  if (tasks.length === 0) {
    return {};
  }

  const skillMap = Object.fromEntries(
    skills.map(({ skillId, skillName }) => [skillId, skillName])
  );

  const taskMap = Object.fromEntries(
    tasks.map(({ taskId, description }) => [taskId, description])
  );

  const prompt = `
  <Example>
  
  This are the available skills in this example: {1: 'Frontend', 2: 'Backend'}.

  Based on the map where key is taskId and value is description of task, for example:
  {'20348e46-f6fe-4f5d-b91e-0a43a9f7d09c': 'As a user, I want to be able to use website on both PC and phone'., '4f2c2007-5052-4635-b409-092a629fc834': 'As a logged-in user, I want to update my profile information and upload a profile picture.'}

  According to description of the task, assign skill or skills best suited. The format should be map where key is taskId, and value is array of skillsId.
  For example:
  {"20348e46-f6fe-4f5d-b91e-0a43a9f7d09c": [1],"4f2c2007-5052-4635-b409-092a629fc834": [1,2]}
  "20348e46-f6fe-4f5d-b91e-0a43a9f7d09c" is assigned [1] because task "20348e46-f6fe-4f5d-b91e-0a43a9f7d09c" seems to want Frontend skills, while "4f2c2007-5052-4635-b409-092a629fc834" is assigned to [1,2] because it seems to want both Frontend and Backend skills.
  
  </Example>

  Return only JSON with the map of taskId to an array of skill IDs, with:
  - Actual available skills map: ${JSON.stringify(skillMap)}
  - Actual task map: ${JSON.stringify(taskMap)}

  <Sample return>
  {
    "20348e46-f6fe-4f5d-b91e-0a43a9f7d09c": [1],
    "4f2c2007-5052-4635-b409-092a629fc834": [1,2]
  },
  where key is taskId, and value is array of number.
  </Sample return>
  `;

  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const text = response.text;

  if (!text) {
    throw new Error('Gemini did not return any content.');
  }

  try {
    return JSON.parse(text) as Record<string, number[]>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini returned invalid JSON: ${message}\nResponse: ${text}`);
  }
};
