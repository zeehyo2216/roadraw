'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const error = searchParams.get('error');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState(error ? '로그인에 실패했습니다.' : '');

    const handleGoogleSignIn = () => {
        signIn('google', { callbackUrl });
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginError('');

        const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
        });

        if (result?.error) {
            setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.');
            setIsLoading(false);
            return;
        }

        router.push(callbackUrl);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-slate-900 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-emerald-400">ROADRAW</h1>
                    <p className="mt-2 text-sm text-white/60">내 근처 러닝 코스를 직접 만들어보세요!</p>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleSignIn}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-white/90 active:scale-95"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google로 계속하기
                </button>

                <div className="my-6 flex items-center">
                    <div className="flex-1 border-t border-white/10" />
                    <span className="px-4 text-xs text-white/40">또는</span>
                    <div className="flex-1 border-t border-white/10" />
                </div>

                {/* Email Sign In Form */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <input
                        type="email"
                        placeholder="이메일"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />

                    {loginError && (
                        <p className="text-center text-sm text-red-400">{loginError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full rounded-full bg-emerald-400 py-3 text-sm font-bold text-black transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? '처리 중...' : '로그인'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-white/60">
                    계정이 없으신가요?{' '}
                    <Link href="/auth/signup" className="text-emerald-400 hover:underline">
                        회원가입
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-slate-900">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            </div>
        }>
            <SignInForm />
        </Suspense>
    );
}
