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
            orderBy: [
                { isFavorite: 'desc' }, // Favorites first
                { createdAt: 'desc' },  // Then by newest
            ],
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
                userId: session.user.id,
            },
        });

        return run;
    } catch (error) {
        console.error("Failed to get run:", error);
        return null;
    }
}

export async function toggleFavorite(runId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "로그인이 필요합니다." };
    }

    try {
        // Get current state
        const run = await prisma.run.findFirst({
            where: {
                id: runId,
                userId: session.user.id,
            },
            select: { isFavorite: true },
        });

        if (!run) {
            return { error: "기록을 찾을 수 없습니다." };
        }

        // Toggle favorite
        await prisma.run.update({
            where: { id: runId },
            data: { isFavorite: !run.isFavorite },
        });

        revalidatePath('/history');
        return { success: true, isFavorite: !run.isFavorite };
    } catch (error) {
        console.error("Failed to toggle favorite:", error);
        return { error: "즐겨찾기 변경에 실패했습니다." };
    }
}

export async function deleteRun(runId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "로그인이 필요합니다." };
    }

    try {
        // Verify user owns this run
        const run = await prisma.run.findFirst({
            where: {
                id: runId,
                userId: session.user.id,
            },
        });

        if (!run) {
            return { error: "기록을 찾을 수 없습니다." };
        }

        // Delete the run
        await prisma.run.delete({
            where: { id: runId },
        });

        revalidatePath('/history');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete run:", error);
        return { error: "기록 삭제에 실패했습니다." };
    }
}
