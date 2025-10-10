import express, { Request, Response } from 'express';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('API is running!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});