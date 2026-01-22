'use client';

import { useState } from 'react';
import { toggleFavorite } from '@/app/actions/runs';

type FavoriteButtonProps = {
    runId: string;
    initialFavorite: boolean;
};

export function FavoriteButton({ runId, initialFavorite }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(initialFavorite);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();

        setIsLoading(true);
        const result = await toggleFavorite(runId);

        if (result.success) {
            setIsFavorite(result.isFavorite!);
        }
        setIsLoading(false);
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={`p-1.5 rounded-full transition-all ${isFavorite
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : 'text-white/30 hover:text-white/60'
                } ${isLoading ? 'opacity-50' : ''}`}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        </button>
    );
}
