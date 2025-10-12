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

I used Codex to containerize, and giving instructions to create Makefile as well. One thing I realized is it tried to use Node 20 image, which does not have active support anymore, and security support ends in 6 months. I've changed it to node 24 as it's the latest version with more years of security support. This is one aspect where LLM may be trained from the internet to use node 20 (older) version, but it does not know there is a more updated version available for use.

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

I've also listed out the endpoints that I would need for this assignment in endpoints.http file, following REST convention.

It is quite useful at a glance to see what endpoints I would need, and it helps a lot in planning what endpoints to create. When listing out the endpoints, I would also think about the request body structure for create task.

#### Create task endpoint

One of the more interesting endpoints would definitely be get all tasks, and create task.

Since there is a subtask requirement, this makes create task more challenging, with hidden edge cases.

Initially, I designed the request body structure to have:
- title
- skills (array of number based on `skillId`)
- status
- assignee
- subtasks (with the same above structure, in array)

I planned to allow the user to create a task with its subtask in one-shot when user click "Submit" button to reduce complexity.

Then, I was reading the requirements again and noticed some edge cases.

1. Regarding status: A status cannot be `Done` if a subtask is not done.
    - This may post a problem where user intention is to set parent task as `Done`, then create a subtask with other status. It may be a bad user experience to throw error and ask user to redo.
    - Since I am also under time constraint, I went with the simpler approach of not allowing user to set status of task during creation. User can only set the status within task list.
2. Regarding assignee: A task can only be assigned to developer with required skill(s).
    - Since it is possible for skills field to be empty and LLM can assign a skill after creation of a task, it would not be good if we allow assigning of developer when skill is empty at first.
    - There would also be more validation checks needed during form submission.
    - To reduce complexity given limited amount of time, I have opted for a simpler working approach, which is to not allow assignee during task creation.

Then looking at how we have subtask feature, I planned to let users be able to submit parent + subtask in one shot, using this structure:

```
{
    "title": "As a user, I want to use this website on my mobile and tablet",
    "skills": [1],
    "subtasks": [
        {
            "title": "As an analyst, I want to analyse user behaviour",
            "skills": [1,2],
            "subtasks": [
                {
                    "title": "As a user, I want to customise profile"
                }
            ]
        },
        {
            "title": "As an analyst, I want to see clickstream data."
        }
    ]
}
```

For the task/subtasks that does not have skills, those task(s) will get its skills from LLM.

I have also included an optional field `parentTaskId`. Currently this is unused, but in the future, we could have an additional form field in Create Task to directly create a subtask within Create Task page.

#### Get tasks endpoint

From the simple wireframe, it seems like a list of tasks will be displayed, and user can update the status or assignee of a task.

With the addition of subtask feature, I have also included it to return all tasks and its subtasks in the endpoint response. This could be used for future enhancement, where the Homepage (task list page) can display subtasks directly, or perhaps some sort of link to click into task page where they can view subtasks link and click on it.

For now, I also did not add pagination to task list. It would be good to add, but this can be for a future enhancement.

#### Get developers, and assign task to a developer

##### Get developers

Within each of task's dropdown list for assignee, I've decided to only display dropdown where the developers have the specific skills. This is for a better user experience, as it may be a bad user experience if user tries to assign a developer that does not have required skill, only to get error message. If we could enhance the user experience by not letting user go through that interaction, why not?

This is why I've got `/developers` [GET] endpoint.

Initially, I added additional query parameter `skill`, such that by calling `/developers?skill=1,2`, we are only returning developers that have both skills 1 and 2.

However, for every combination of task skills, such as [1], [2] or [1,2] (and even more in the future), this requires repeatedly calling the API for combination that exists.

Hence, I've opted for just using `/developers` [GET] endpoint to return a list of developers, with their skills that they have. Then we will get frontend to filter by task skills, and let dropdown show available developers list.

##### Assign task to a developer

For a better user experience, I have used optimistic approach. When user clicks on a dropdown selection, we set the dropdown to the one user has selected first and trigger the endpoint, then revert the option when error occurs.

#### Set status of a task

According to requirements, in order to set status to "Done", all its subtasks and nested subtasks must be "Done", so a check is done for this status.

Also similar to assigning task to a developer, for a better user experience, I have also used optimistic approach.

## Frontend

I've used Vite to start a react project, and have chosen React version 19 for React compiler features. While using Codex, I've noticed LLM trying to add `useMemo`, which is not needed anymore in React 19 as React compiler automatically optimizes. This is another thing to note regarding using LLM, where it may use code that are out of date.

### Libraries

#### Tanstack

Regarding usage of library, I started off with using Tanstack query. I have heard great things from colleagues about tanstack query, and have added tanstack query during work for one of my project, and have found it very useful. It comes with caching with `useQuery`, and we do not need to manually set loading and error state.

Hence, I've also decided to add it to this assignment. I have also known about Tanstack router (in fact it's one of the option available when I start a React project with Vite), so I have also added it. This will be my first time using Tanstack router.

While looking through Tanstack query documentation, I noticed there is Tanstack Form! I was thinking, since we are going to have some sort of form in create task page, why not try out Tanstack form as well?

Although I will mostly be using Codex to help with this due to time constraint, it will be useful to learn more about its capabilities, and would help me in my future project or work.

#### Bootstrap

I've decided to add Botostrap for styling and layout for its rapid development capabilities.

#### React Toastify

I've added React Toastify to display error growl message, which will be helpful for user experience as it's a global pop up to let them know an error has occured with their latest interaction.

#### Important note regarding libraries

I've choosen to use exact version of the libraries, to ensure the precise same version of dependency and reliable build.

With the recent npm supply chain attack, it is good to pin the versions as well.