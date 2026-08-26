export interface Player {
  id: string;
  name: string;
  username?: string;
  team: string;
  country: string;
  position?: string;
  createdAt?: Date;
  updatedAt?: Date;
}