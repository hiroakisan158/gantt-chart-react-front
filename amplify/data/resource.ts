import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  GanttProject: a
    .model({
      name: a.string().required(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  GanttTask: a
    .model({
      projectId: a.id().required(),
      name: a.string().required(),
      start: a.datetime().required(),
      end: a.datetime().required(),
      progress: a.float().required(),
      type: a.string().required(), // "task" | "milestone" | "project"
      dependencies: a.string().array(),
      displayOrder: a.integer(),
    })
    .secondaryIndexes((index) => [
      index("projectId").queryField("listByProject"),
    ])
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
