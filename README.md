# api-task-assignment README

With the task being needing full stack application, I've decided to create 2 repositories: api-task-assignment for backend related tasks, and ui-task-assignment for frontend related tasks.

After setting up the initial stages, for example, with vite create react app and creating express application, I started with backend first.

When doing this assignment, I have used the help of tools such as Codex and Gemini with some planning, since this is due in 3 days which is quite tight. I planned to use around 1.5 days for Backend and 1.5 days for Frontend to hopefully complete the base requirement. I looked at the document, and it did not indicate testing is required.

So for this assignment, I planned to complete the base features required first, then add README file detailing my thought process, and then add test, and even extra features if I have time after writing this document.

## Backend

From my experiences with full stack development so far, database schema design is quite important, and it is important to properly think about the schema design.

It's easy to add new tables and columns, but when we want to edit the columns, migrate the data, or even delete the column, it gets tougher. We will have to take into considerations of possibly needing downtime just for database related changes, and once the data are in, we cannot remove the data without justification.

So initially I started installing express library and trying out some sample routes, and designing folder structure.

Then I started to do containerization. I am using my home gaming PC with WSL, and I don't want to install postgres locally on my computer, so the first step is to containerize the backend so that I can ensure the database, and connection from the backend to database is working first.

This is also to ensure that I am also able to run this application on my personal Macbook if required, without needing to install the required versions.

Containerization is also important, because everyone's computer is different, and we would usually need to build the image anyway when hosting on non-production and production environment.

### Database

Afterwards, I put my focus into database.

For the database schema design, I have also planned it with the help of Gemini Flash, to use it as a brainstorming session. It is good and useful as a sort of another pair to communicate with.

In a real world environment, developing features or even chores is always happening, so we would need migration script to create, delete or alter tables, rows, etc. I started with migration script with version control, similar to how it is done in real world.

Then, since there is a need to seed the data, I have also created a seed script. In addition to the seed data required from the assignment, I have also added more data to help with development of this application.

After migration and seed script is completed, I was thinking - Should I write pure SQL script within the application itself? Or should I use ORM?

I have heard about Sequelize, Knex and TypeORM before for Node applications, but since I mainly use Golang for backend during work, I only used Sequelize before.

I went to Google search and Reddit about what ORM to use for Node, and it seems like Prisma is a popular choice for its ease of use, and is still maintained. I've decided to use Prisma since I can use this opportunity to delve more into backend ecosystem using Node. I think it's quite amazing that Prisma can rely on your database connection to help you automatically build relations, and you can use the typings.

### Endpoints

After database and ORM has been decided, I started to build endpoints, and also split it into different folders. I decided to start with backend first, while imagining how the frontend would call the backend. This also makes development easier. For example, if I start with frontend first, I would have to keep mocking the response structure with Tweak, which would be a bit more troublesome although still doable.

I was reading through the document and thinking about what kind of endpoints we need, including the request and response structure. The document did state what kind of endpoints we need which is great in starting out the skeleton.

Since this is my personal PC, I did not install Postman. I have heard about "REST Client" extension in VS Code, so I used it.

I've also listed out the endpoints that I would need for this assignment in endpoints.http file. It is quite useful at a glance to see what endpoints I would need, and it helps a lot in planning what endpoints to create. When listing out the endpoints, I would also think about the request body structure for create task.

#### Create task endpoint

One of the more interesting endpoints would definitely be get all tasks, and create task.

Since there is a subtask requirement, this makes create task more challenging, with hidden edge cases.

Initially, I designed the request body structure to have:
- title
- skills (array of number)
- status
- assignee
- subtasks (with the same above structure, in array)

I planned to allow the user to create a task with its subtask in one-shot.

Then, I was reading the requirements again.

Regarding status, since 

#### Get tasks endpoint