// import { OpenAPIHono } from "@hono/zod-openapi";
// // import { MiddlewareHandler } from "hono";
import { logger } from "hono/logger";
// import { VisibleError } from "@sst-feature-flag/core/error";
// // import { session } from "../session";
// import { handle, streamHandle } from "hono/aws-lambda";
// import { ZodError } from "zod";
// import { FeatureFlagAdminApi } from "./feature-flag-admin";

import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { FeatureFlagAdminApi } from "./feature-flag-admin";
import { FeatureFlagEvaluationApi } from "./feature-flag-evaluation";

// // const auth: MiddlewareHandler = async (c, next) => {
// //   const authHeader =
// //     c.req.query("authorization") ?? c.req.header("authorization");
// //   if (authHeader) {
// //     const match = authHeader.match(/^Bearer (.+)$/);
// //     if (!match) {
// //       throw new VisibleError(
// //         "input",
// //         "auth.token",
// //         "Bearer token not found or improperly formatted",
// //       );
// //     }
// //     const bearerToken = match[1];
// //     const result = await session.verify(bearerToken!);
// //     if (result.type === "user") {
// //       return ActorContext.with(
// //         {
// //           type: "user",
// //           properties: {
// //             userID: result.properties.userID,
// //           },
// //         },
// //         next,
// //       );
// //     }
// //   }

// //   return ActorContext.with({ type: "public", properties: {} }, next);
// // };

// const app = new OpenAPIHono();
// app
//   .use(logger(), async (c, next) => {
//     c.header("Cache-Control", "no-store");
//     return next();
//   })
// // .use(auth);
// app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
//   type: "http",
//   scheme: "bearer",
// });
// // app.openAPIRegistry.registerComponent("schemas", "Product", {});

// const routes = app
//   // .route("/feature-flag/evaluate", ProductApi.route)
//   .route("/feature-flag/admin", FeatureFlagAdminApi.route)
//   .onError((error, c) => {
//     if (error instanceof VisibleError) {
//       return c.json(
//         {
//           code: error.code,
//           message: error.message,
//         },
//         error.kind === "input" ? 400 : 401,
//       );
//     }
//     console.error(error);
//     if (error instanceof ZodError) {
//       const e = error.errors[0];
//       if (e) {
//         return c.json(
//           {
//             code: e?.code,
//             message: e?.message,
//           },
//           400,
//         );
//       }
//     }
//     return c.json(
//       {
//         code: "internal",
//         message: "Internal server error!!!!!!",
//       },
//       500,
//     );
//   });

// app.doc("/doc", () => ({
//   openapi: "3.0.0",
//   info: {
//     title: "Terminal API",
//     version: "0.0.1",
//   },
// }));

// export type Routes = typeof routes;
// export const handler = streamHandle(app);
// export const handler = process.env.SST_LIVE ? handle(app) : streamHandle(app)index.ts
const app = new Hono()
  .use(logger(), async (c, next) => {
    c.header("Cache-Control", "no-store");
    return next();
  })
  .route("/feature-flag/admin", FeatureFlagAdminApi.route)
  .route("/feature-flag/evaluate", FeatureFlagEvaluationApi.route);

export const handler = handle(app);
