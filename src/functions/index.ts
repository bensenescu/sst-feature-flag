// import { OpenAPIHono } from "@hono/zod-openapi";
// import { MiddlewareHandler } from "hono";
// import { logger } from "hono/logger";
// import { ZodError } from "zod";
// import { APIGatewayProxyResult, handle, streamHandle } from "hono/aws-lambda";



// const app = new OpenAPIHono();
// app
//   .use(logger())
// // TODO: Add auth. API keys? Trust if coming within AWS? Certificate? 
// // .use(auth);

// const routes = app
//   .route("/flag", ProductApi.route)
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
//         message: "Internal server error",
//       },
//       500,
//     );
//   });

// app.doc("/doc", () => ({
//   openapi: "3.0.0",
//   info: {
//     title: "SST Feature Flag",
//     version: "0.0.1",
//   },
// }));

// export type Routes = typeof routes;
// export const handler = handle(app)