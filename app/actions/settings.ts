'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getUserSettings() {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                isManualPace: true,
                manualPaceSecPerKm: true,
            },
        });

        return user;
    } catch (error) {
        console.error("Failed to get user settings:", error);
        return null;
    }
}

export async function updateUserSettings(data: {
    isManualPace: boolean;
    manualPaceSecPerKm?: number | null;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        return { error: "로그인이 필요합니다." };
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                isManualPace: data.isManualPace,
                manualPaceSecPerKm: data.isManualPace ? data.manualPaceSecPerKm : null,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Failed to update user settings:", error);
        return { error: "설정 저장에 실패했습니다." };
    }
}

// Default pace: 6:00/km = 360 seconds
const DEFAULT_PACE_SEC_PER_KM = 360;

/**
 * Get user's effective pace in seconds per km
 * - If manual mode: returns saved manual pace
 * - If auto mode: calculates average pace from run history
 * - If not logged in or no runs: returns default pace (6:00/km)
 */
export async function getUserPaceSecPerKm(): Promise<number> {
    const session = await auth();

    if (!session?.user?.id) {
        return DEFAULT_PACE_SEC_PER_KM;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                isManualPace: true,
                manualPaceSecPerKm: true,
            },
        });

        if (!user) {
            return DEFAULT_PACE_SEC_PER_KM;
        }

        // Manual mode: return saved pace
        if (user.isManualPace && user.manualPaceSecPerKm) {
            return user.manualPaceSecPerKm;
        }

        // Auto mode: calculate average from run history
        const runs = await prisma.run.findMany({
            where: { userId: session.user.id },
            select: { avgPaceSecPerKm: true },
            orderBy: { createdAt: 'desc' },
            take: 10, // Use last 10 runs for average
        });

        if (runs.length === 0) {
            return DEFAULT_PACE_SEC_PER_KM;
        }

        // Calculate average pace from runs
        const avgPace = runs.reduce((sum, run) => sum + run.avgPaceSecPerKm, 0) / runs.length;
        return Math.round(avgPace);
    } catch (error) {
        console.error("Failed to get user pace:", error);
        return DEFAULT_PACE_SEC_PER_KM;
    }
}
