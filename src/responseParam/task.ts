import { StatusSummary } from "./status";

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
  status: StatusSummary;
  developer?: TaskDeveloperSummary;
  subtasks?: TaskSummary[];
}

interface TaskRelationSummary {
  taskId: string;
  title: string;
  status: StatusSummary;
}

export interface TaskDetails {
  taskId: string;
  title: string;
  status: StatusSummary;
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
