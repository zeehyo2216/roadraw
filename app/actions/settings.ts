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
