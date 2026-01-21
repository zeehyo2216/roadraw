import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        // Delete all user's runs first
        await prisma.run.deleteMany({
            where: { userId: session.user.id },
        });

        // Delete all user's sessions
        await prisma.session.deleteMany({
            where: { userId: session.user.id },
        });

        // Delete all user's accounts
        await prisma.account.deleteMany({
            where: { userId: session.user.id },
        });

        // Delete the user
        await prisma.user.delete({
            where: { id: session.user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete account error:", error);
        return NextResponse.json(
            { error: "계정 삭제에 실패했습니다." },
            { status: 500 }
        );
    }
}
