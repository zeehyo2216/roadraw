'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRun } from '@/app/actions/runs';

type DeleteRunButtonProps = {
    runId: string;
};

export function DeleteRunButton({ runId }: DeleteRunButtonProps) {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deleteRun(runId);

        if (result.success) {
            router.push('/history');
        } else {
            alert(result.error || '삭제에 실패했습니다.');
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">삭제할까요?</span>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-400 disabled:opacity-50"
                >
                    {isDeleting ? '삭제 중...' : '확인'}
                </button>
                <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                >
                    취소
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setShowConfirm(true)}
            className="text-sm text-red-400 hover:text-red-300"
        >
            기록 삭제
        </button>
    );
}
