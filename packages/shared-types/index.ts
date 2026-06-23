// Common shared TypeScript interfaces and types for the monorepo

export interface BaseUser {
	id: string;
	username: string;
	discriminator?: string;
	avatarUrl?: string;
}
