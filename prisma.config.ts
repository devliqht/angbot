export default {
	schema: "packages/database/prisma/schema.prisma",
	migrations: {
		path: "packages/database/prisma/migrations",
	},
	datasource: {
		url: process.env.DATABASE_URL,
	},
};
