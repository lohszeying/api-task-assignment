interface TaskDeveloperSummary {
  developerId: string;
  developerName: string;
}

interface TaskSkillSummary {
  skillId: number;
  skillName: string;
}

export interface TaskSummary {
  taskId: string;
  title: string;
  skills: TaskSkillSummary[];
  status: string;
  developer?: TaskDeveloperSummary;
  subtasks?: TaskSummary[];
}

interface TaskRelationSummary {
  taskId: string;
  title: string;
  status: string;
}

export interface TaskDetails {
  taskId: string;
  title: string;
  status: string;
  skills: string[];
  developer: TaskDeveloperSummary | null;
  parent?: TaskRelationSummary;
  children?: TaskRelationSummary[];
}

export interface CreatedTaskResult {
  taskId: string;
  title: string;
  statusId: number;
  skills: TaskSkillSummary[];
  developerId: string | null;
  subtasks?: CreatedTaskResult[];
}
