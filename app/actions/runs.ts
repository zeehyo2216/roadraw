'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type RunData = {
    pathData: { lat: number; lng: number }[];
    totalDistanceKm: number;
    totalDurationSec: number;
    calories?: number;
};

export async function saveRun(data: RunData) {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "로그인이 필요합니다." };
    }

    // Calculate average pace (seconds per km)
    const avgPaceSecPerKm = data.totalDistanceKm > 0
        ? data.totalDurationSec / data.totalDistanceKm
        : 0;

    try {
        const run = await prisma.run.create({
            data: {
                userId: session.user.id,
                pathData: data.pathData,
                totalDistanceKm: data.totalDistanceKm,
                totalDurationSec: data.totalDurationSec,
                avgPaceSecPerKm,
                calories: data.calories,
            },
        });

        revalidatePath('/history');
        return { success: true, runId: run.id };
    } catch (error) {
        console.error("Failed to save run:", error);
        return { error: "기록 저장에 실패했습니다." };
    }
}

export async function getRuns() {
    const session = await auth();

    if (!session?.user?.id) {
        return [];
    }

    try {
        const runs = await prisma.run.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return runs;
    } catch (error) {
        console.error("Failed to get runs:", error);
        return [];
    }
}

export async function getRunById(id: string) {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    try {
        const run = await prisma.run.findFirst({
            where: {
                id,
                userId: session.user.id, // Ensure user owns this run
            },
        });

        return run;
    } catch (error) {
        console.error("Failed to get run:", error);
        return null;
    }
}
