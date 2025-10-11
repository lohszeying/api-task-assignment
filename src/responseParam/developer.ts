import type { SkillSummary } from './skill';

export interface DeveloperListItem {
  developerId: string;
  developerName: string;
  skills: SkillSummary[];
}
