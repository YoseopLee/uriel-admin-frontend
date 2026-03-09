// app/page.tsx
"use client";

import { useState, useEffect } from "react";
// 🌟 getCurrentUser 추가
import { signIn, confirmSignIn, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isRequireNewPassword, setIsRequireNewPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 🌟 화면 깜빡임 방지용 초기 로딩 상태
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // 🌟 1. 페이지 접속 시 이미 로그인되어 있는지 확인하는 로직
  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        await getCurrentUser(); // 현재 유저 정보가 있는지 확인
        // 에러가 안 나고 통과했다면? 이미 로그인된 상태!
        router.push("/dashboard");
      } catch (err) {
        // 로그인 안 된 상태면 여기서 정상적으로 로그인 화면을 보여줌
        setIsCheckingAuth(false);
      }
    };
    checkAlreadyLoggedIn();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!isRequireNewPassword) {
        const { isSignedIn, nextStep } = await signIn({
          username: email,
          password,
        });

        if (
          nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
        ) {
          setIsRequireNewPassword(true);
          setIsLoading(false);
          return;
        }

        if (isSignedIn) {
          router.push("/dashboard");
        }
      } else {
        const { isSignedIn } = await confirmSignIn({
          challengeResponse: newPassword,
        });
        if (isSignedIn) {
          alert("비밀번호가 성공적으로 변경되었습니다. 환영합니다!");
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      console.error("로그인/비밀번호 변경 실패:", err);

      // 🌟 2. 이미 로그인되어 있다는 에러가 발생하면 쿨하게 대시보드로 넘기기
      if (err.name === "UserAlreadyAuthenticatedException") {
        router.push("/dashboard");
        return;
      }

      // 그 외의 에러 처리
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("오류가 발생했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 체크 중일 때는 빈 화면이나 로딩 바를 보여줌 (깜빡임 방지)
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        로그인 상태 확인 중...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            우리엘 어드민
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRequireNewPassword
              ? "보안을 위해 새 비밀번호를 설정해 주세요."
              : "회사 홈페이지 관리를 위한 통합 대시보드입니다."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {!isRequireNewPassword ? (
            <>
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  이메일 계정
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                새로운 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 mt-4 text-white font-bold rounded-lg transition-all ${
              isLoading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading
              ? "처리 중..."
              : isRequireNewPassword
                ? "비밀번호 변경 및 로그인"
                : "시스템 로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
