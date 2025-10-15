# api-task-assignment Setup

You will need Docker. You may use Docker Desktop, or Colima or other container solutions.

1. Copy `.env.example` into `.env`. Replace value for `GEMINI_API_KEY`.
2. Run `make start_db` to create initial database
3. Run `make run_migration_up` to run migration files
4. Run `make run_seed` to seed the data into database
5. Once the above steps has been ran, subsequently, just run `make start_dev` (for hot reload) or `make start`

Note: Alternatively, you may also run `make init_and_start` for a first time set-up. Subsequently, just run `make start_dev` (for hot reload) or `make start`.

To remove database data, run `make remove_db_data`.

**Note for development usage only**

Requires you to have `npm` to get type definitions. Run `npm i` to install libraries. Note that Prisma also requires `npm i` or `npm run postinstall` to generate type definition.

# Documentation on design, API and justification

<!-- vscode-markdown-toc -->
* 1. [General introduction](#Generalintroduction)
* 2. [Note regarding AI coding asssistant usage](#NoteregardingAIcodingasssistantusage)
	* 2.1. [Update as of October 14 2025](#UpdateasofOctober142025)
* 3. [Backend](#Backend)
	* 3.1. [Database](#Database)
	* 3.2. [Endpoints](#Endpoints)
		* 3.2.1. [Create task endpoint](#Createtaskendpoint)
		* 3.2.2. [Get tasks endpoint](#Gettasksendpoint)
		* 3.2.3. [Get developers, and assign task to a developer](#Getdevelopersandassigntasktoadeveloper)
		* 3.2.4. [Set status of a task](#Setstatusofatask)
	* 3.3. [Libraries](#Libraries)
* 4. [Frontend](#Frontend)
	* 4.1. [Libraries](#Libraries-1)
		* 4.1.1. [Tanstack](#Tanstack)
		* 4.1.2. [Bootstrap](#Bootstrap)
		* 4.1.3. [React Toastify](#ReactToastify)
		* 4.1.4. [Important note regarding libraries](#Importantnoteregardinglibraries)
	* 4.2. [UI](#UI)
		* 4.2.1. [Homepage (Task list)](#HomepageTasklist)
		* 4.2.2. [Create task](#Createtask)
* 5. [Things done since Oct 14, and my thoughts on using Codex / Claude Code](#ThingsdonesinceOct14andmythoughtsonusingCodexClaudeCode)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='Generalintroduction'></a>General introduction

With the task being needing full stack application, I've decided to create 2 repositories: [api-task-assignment](https://github.com/lohszeying/api-task-assignment) for backend related tasks, and [ui-task-assignment](https://github.com/lohszeying/ui-task-assignment) for frontend related tasks.

There is a reason why I've decided to split into 2 separate repositories, 1 is for separation of concern. This is to allow ui related context to be stored separately from api. If we combine both api and ui repository into 1 repository, especially in a large project with many developers, there may be "pipeline war" as well, where developers keep having to rebase and wait for pipeline to pass before being able to merge. It's also good to split backend and frontend so that pipeline can be made simpler, by focusing on just 1 part required.

After setting up the initial stages, for example, with vite create react app and creating express application, I started with backend first.

##  2. <a name='NoteregardingAIcodingasssistantusage'></a>Note regarding AI coding asssistant usage

Originally, the assignment is due in 3 days.

When doing this assignment, I have used the help of tools such as Codex and Gemini with some planning, since this is due in 3 days which is quite tight and we are allowed to use AI coding assistant or tool.

I planned to use around 1.5 days for Backend and 1.5 days for Frontend to hopefully complete the base requirement. I looked at the document, and it did not indicate testing is required, although ideally I would want to add unit and end-to-end (e2e) testing using playwright or cypress if I have the time. Also, since I am using Codex, I am frequently using git as a version control.

For this assignment, I planned to complete the base features required first, then add README file detailing my thought process, refactor if possible, and then add test. For now, I will not be adding new feature of viewing task page, as for every code that is written by LLM, I would have to check on it and currently I don't think I have enough time for now.

###  2.1. <a name='UpdateasofOctober142025'></a>Update as of October 14 2025

As of October 14 2025, request for additional 2 more days of extension has been granted, and the new due date is October 15 end of day (11:59pm). I will still be refactoring some parts of the code, and add tests.

##  3. <a name='Backend'></a>Backend

From my experiences with full stack development so far, database schema design is quite important, and it is important to properly think about the schema design.

It's easy to add new tables and columns, but when we want to edit the columns, migrate the data, or even delete the column, it gets tougher. We will have to take into considerations of possibly needing downtime just for database related changes, and once the data are in, we cannot remove the data without justification.

So initially I started installing express library and trying out some sample routes, and designing folder structure.

Then I started to do containerization. I am using my home gaming PC with WSL, and I don't want to install postgres locally on my computer, so the first step is to containerize the backend so that I can ensure the database, and connection from the backend to database is working first.

This is also to ensure that I am also able to run this application on my personal Macbook if required, without needing to install the required versions.

Containerization is also important, because everyone's computer is different, and we would usually need to build the image anyway when hosting on non-production and production environment.

I used Codex to containerize, and giving instructions to create Makefile as well. One thing I realized is it tried to use Node 20 image, which does not have active support anymore, and security support ends in 6 months. I've changed it to node 24 as it's the latest version with more years of security support. This is one aspect where LLM may be trained from the internet to use node 20 (older) version, but it does not know there is a more updated version available for use.

Currently, there is no swagger. If given more time, I would love to add swagger for documentation purposes.

###  3.1. <a name='Database'></a>Database

Afterwards, I put my focus into database.

For the database schema design, I have also planned it with the help of Gemini Flash, to use it as a brainstorming session. It is good and useful as a sort of another pair to communicate with.

In a real world environment, developing features or even chores is always happening, so we would need migration script to create, delete or alter tables, rows, etc. I started with migration script with version control, similar to how it is done in real world. I have also added indexing, since it's the easiest way to optimize a database, although we should use it only when we need to, because mindlessly creating index also comes with drawback to writing data.

Then, since there is a need to seed the data, I have also created a seed script. In addition to the seed data required from the assignment, I have also added more data to help with development of this application.

After migration and seed script is completed, I was thinking - Should I write pure SQL script within the application itself? Or should I use ORM?

I have heard about Sequelize, Knex and TypeORM before for Node applications, but since I mainly use Golang for backend during work, I only used Sequelize before.

I went to Google search and Reddit about what ORM to use for Node, and it seems like Prisma is a popular choice for its ease of use, and is still maintained. I've decided to use Prisma since I can use this opportunity to delve more into backend ecosystem using Node. I think it's quite amazing that Prisma can rely on your database connection to help you automatically build relations, and you can use the typings.

###  3.2. <a name='Endpoints'></a>Endpoints

After database and ORM has been decided, I started to build endpoints, and also split it into different folders. I decided to start with backend first, while imagining how the frontend would call the backend. This also makes development easier. For example, if I start with frontend first, I would have to keep mocking the response structure with Tweak, which would be a bit more troublesome although still doable.

I was reading through the document and thinking about what kind of endpoints we need, including the request and response structure. The document did state what kind of endpoints we need which is great in starting out the skeleton.

Since this is my personal PC, I did not install Postman. I have heard about "REST Client" extension in VS Code, so I used it.

I've also listed out the endpoints that I would need for this assignment in endpoints.http file, following REST convention.

It is quite useful at a glance to see what endpoints I would need, and it helps a lot in planning what endpoints to create. When listing out the endpoints, I would also think about the request body structure for create task.

Regarding endpoint response structure, ideally I would want to go with a standardised approach such as following JSON API convention. However, due to time constraint, I've decided to forgo this for now and get the prototype working first with Codex. In an actual project, ideally there should be guidelines on what convention to follow since there are many developers, each with different styles within a team, so it is good if there is consistency.

####  3.2.1. <a name='Createtaskendpoint'></a>Create task endpoint

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

####  3.2.2. <a name='Gettasksendpoint'></a>Get tasks endpoint

From the simple wireframe, it seems like a list of tasks will be displayed, and user can update the status or assignee of a task.

With the addition of subtask feature, I have also included it to return all tasks and its subtasks in the endpoint response. This could be used for future enhancement, where the Homepage (task list page) can display subtasks directly, or perhaps some sort of link to click into task page where they can view subtasks link and click on it.

For now, I also did not add pagination to task list. It would be good to add, but this can be for a future enhancement.

####  3.2.3. <a name='Getdevelopersandassigntasktoadeveloper'></a>Get developers, and assign task to a developer

##### Get developers

Within each of task's dropdown list for assignee, I've decided to only display dropdown where the developers have the specific skills. This is for a better user experience, as it may be a bad user experience if user tries to assign a developer that does not have required skill, only to get error message. If we could enhance the user experience by not letting user go through that interaction, why not?

This is why I've got `/developers` [GET] endpoint.

Initially, I added additional query parameter `skill`, such that by calling `/developers?skill=1,2`, we are only returning developers that have both skills 1 and 2.

However, for every combination of task skills, such as [1], [2] or [1,2] (and even more in the future), this requires repeatedly calling the API for combination that exists.

Hence, I've opted for just using `/developers` [GET] endpoint to return a list of developers, with their skills that they have. Then we will get frontend to filter by task skills, and let dropdown show available developers list.

##### Assign task to a developer

For a better user experience, I have used optimistic approach. When user clicks on a dropdown selection, we set the dropdown to the one user has selected first and trigger the endpoint, then revert the option when error occurs.

####  3.2.4. <a name='Setstatusofatask'></a>Set status of a task

According to requirements, in order to set status to "Done", all its subtasks and nested subtasks must be "Done", so a check is done for this status.

Also similar to assigning task to a developer, for a better user experience, I have also used optimistic approach.

###  3.3. <a name='Libraries'></a>Libraries

The libraries I'm using are `cors`, `@google/genai`, `@prisma/client`, `dotenv`, `express`, `pg` and `prisma`. I believe these are the minimum libraries required.

- `cors` - To allow frontend to be able to connect to my backend
    - Initially after I npm install cors manually, I asked Codex to add my frontend URL. However, it tried to allow origin from all sites `*`, which could be dangerous. I've set it to only allow my frontend localhost URL for now, since I do not have any other non-production or production environment.
- `@google/genai` - Call LLM to generate skills
- `@prisma/client` and `prisma` - ORM for database
- `dotenv` - For environment variables
- `express` - Web application framework
- `pg` - For postgres database

##  4. <a name='Frontend'></a>Frontend

I've used Vite to start a react project, and have chosen React version 19 for React compiler features. While using Codex, I've noticed LLM trying to add `useMemo`, which is not needed anymore in React 19 as React compiler automatically optimizes. This is another thing to note regarding using LLM, where it may use code that are out of date.

I've tried to split the structure of the folder into `components`, `config` to store URL information if there are more backend URLs in the future (eg. microservice or third party), `lib` for reusable http client code, `features` for utilities broken down by features, `pages` for the different pages, and `services` for calling endpoints.

For `services`, we put in the base URL. For now, we are still using the same URL constant defined in `config`, but this can scale well into the future if we have more backend URLs.

###  4.1. <a name='Libraries-1'></a>Libraries

####  4.1.1. <a name='Tanstack'></a>Tanstack

Regarding usage of library, I started off with using Tanstack query. I have heard great things from colleagues about tanstack query, and have added tanstack query during work for one of my project, and have found it very useful. It comes with caching and auto retry with `useQuery`, and we do not need to manually set loading and error state.

Hence, I've also decided to add it to this assignment. I have also known about Tanstack router (in fact it's one of the option available when I start a React project with Vite), so I have also added it. This will be my first time using Tanstack router.

While looking through Tanstack query documentation, I noticed there is Tanstack Form! I was thinking, since we are going to have some sort of form in create task page, why not try out Tanstack form as well?

Although I will mostly be using Codex to help with this due to time constraint, it will be useful to learn more about its capabilities, and would help me in my future project or work.

####  4.1.2. <a name='Bootstrap'></a>Bootstrap

I've decided to add Botostrap for styling and layout for its rapid development capabilities.

####  4.1.3. <a name='ReactToastify'></a>React Toastify

I've added React Toastify to display error growl message, which will be helpful for user experience as it's a global pop up to let them know an error has occured with their latest interaction.

####  4.1.4. <a name='Importantnoteregardinglibraries'></a>Important note regarding libraries

I've choosen to use exact version of the libraries, to ensure the precise same version of dependency and reliable build.

With the recent npm supply chain attack, it is good to pin the versions as well.

###  4.2. <a name='UI'></a>UI

Currently the UI is split into 2 pages: Homepage (task list) and create task page.

####  4.2.1. <a name='HomepageTasklist'></a>Homepage (Task list)

Under task list, I've chosen to only render the parent tasks to reduce complexity, even though the `/tasks` [GET] endpoint still returns subtasks and nested subtasks.

In the future, or if I have time, I am thinking to create another page for Task details instead. In that page, we will render Task title, skills, status and assignee, and user can still edit status or assignee from that page. Then, since that page will call `/tasks/:taskId` [GET] endpoint, that endpoint will return optional `parent` object field and direct `children` array of object field. In that page, I am planning to put a link to parent and children if available, similar to how JIRA display weblinks of parent and children card.

####  4.2.2. <a name='Createtask'></a>Create task

Currently, I've imposed a limit of max depth of up to 3 subtasks. This is because if we allow infinite subtasks, the UI will not be able to accomodate. In the future, I plan to enable linkage of new task with `parentTaskId` field (which is already available in the API but not on frontend) to link a newly created task to a parent task.

I've also added a cross button to allow user to be able to delete accidental added subtask, else it may be more complex to allow user to submit the form with empty task title.

When "Create task" button is clicked, I've also disabled the form while the API is still firing. This is to avoid cases where user click on "Create task", and while API is still pending, user tries to edit the form which may lead to unintended behaviour.

##  5. <a name='ThingsdonesinceOct14andmythoughtsonusingCodexClaudeCode'></a>Things done since Oct 14, and my thoughts on using Codex / Claude Code

After the extension was granted, I still continued to work on refactoring with Codex. This time, I also added Claude Code into the mix because my weekly Codex limit was running out, and tried to use CLAUDE.md with Linus to review code and critize code. This is quite helpful in terms of pointing out what's the potential issue with the code, and this makes Claude Code be honest and frank about the code.

I've also added tests using Codex, with Frontend using Vitest. However, when Codex was adding test for frontend, it used an older version of Vitest and also older version of testing library. When I tried to remove node_modules and install again, I faced resolving dependency issues. Claude code suggested to downgrade React to 18. I just installed the latest version of testing library instead, and this solved the issue.

One thing I've noticed while working with Codex / Claude Code during the last 2 days - doing refactors is not fun. Codex / Claude Code can speed up the prototype development as evident in the initial 3 days, but it is a pain to fix issues later on. Even after all these refactors, I will still have to check the changes which eats up my time. While doing the refactors, sometimes it also broke things, although using Claude Code with Linus edition `CLAUDE.md` lets Claude find out what is the potential issue with the code so that I can check on it.

Going back, if there is 1 thing I would love to change if I were to still continue to use tools such as Codex / Claude Code, I want to try doing this with spec driven development. It requires some investment into writing specs initially, but subsequently it would probably help a lot since the plans are already written out.