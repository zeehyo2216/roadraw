'use server';

import { generateLoopRoutes, type RouteOption } from "@/lib/graphhopperRoute";
import type { LatLng } from "@/lib/loopRoute";

export type GenerateLoopInput = {
  center: LatLng;
  distanceKm: number;
};

export type GenerateLoopResult = {
  routes: RouteOption[];
};

export async function generateLoopRouteAction(
  input: GenerateLoopInput
): Promise<GenerateLoopResult> {
  const routes = await generateLoopRoutes({
    center: input.center,
    distanceKm: input.distanceKm,
    count: 3,
  });

  return { routes };
};