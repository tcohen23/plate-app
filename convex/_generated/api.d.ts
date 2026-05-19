/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ViktorSpacesEmail from "../ViktorSpacesEmail.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as barcode from "../barcode.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as exerciseDatabase from "../exerciseDatabase.js";
import type * as feedback from "../feedback.js";
import type * as foodLogs from "../foodLogs.js";
import type * as grocery from "../grocery.js";
import type * as http from "../http.js";
import type * as levelUtils from "../levelUtils.js";
import type * as mealPlans from "../mealPlans.js";
import type * as meals from "../meals.js";
import type * as mealsDatabase from "../mealsDatabase.js";
import type * as onboarding from "../onboarding.js";
import type * as pageViews from "../pageViews.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as rehab from "../rehab.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as testAuth from "../testAuth.js";
import type * as users from "../users.js";
import type * as viktorTools from "../viktorTools.js";
import type * as welcomeEmail from "../welcomeEmail.js";
import type * as workoutGenerator from "../workoutGenerator.js";
import type * as workoutMatrix from "../workoutMatrix.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ViktorSpacesEmail: typeof ViktorSpacesEmail;
  admin: typeof admin;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  barcode: typeof barcode;
  constants: typeof constants;
  crons: typeof crons;
  exerciseDatabase: typeof exerciseDatabase;
  feedback: typeof feedback;
  foodLogs: typeof foodLogs;
  grocery: typeof grocery;
  http: typeof http;
  levelUtils: typeof levelUtils;
  mealPlans: typeof mealPlans;
  meals: typeof meals;
  mealsDatabase: typeof mealsDatabase;
  onboarding: typeof onboarding;
  pageViews: typeof pageViews;
  profiles: typeof profiles;
  progress: typeof progress;
  rehab: typeof rehab;
  seedTestUser: typeof seedTestUser;
  stores: typeof stores;
  stripe: typeof stripe;
  testAuth: typeof testAuth;
  users: typeof users;
  viktorTools: typeof viktorTools;
  welcomeEmail: typeof welcomeEmail;
  workoutGenerator: typeof workoutGenerator;
  workoutMatrix: typeof workoutMatrix;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
