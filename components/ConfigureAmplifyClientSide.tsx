"use client"; // 무조건 클라이언트에서 실행되도록 강제함

import { Amplify } from "aws-amplify";
import { useEffect } from "react";

// 외부 파일(amplifyConfig.ts)에 있던 설정을 여기로 합쳐서 확실하게 주입
export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    Amplify.configure(
      {
        Auth: {
          Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
            userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
            // signUpVerificationMethod: 'code', (이 옵션은 생략해도 돼)
          },
        },
      },
      { ssr: true }, // Next.js SSR 환경 호환 설정
    );
    console.log("✅ Amplify 클라이언트 초기화 완료!"); // 디버깅용 로그
  }, []);

  return null; // 화면에 그릴 UI는 없고, 설정만 돕는 컴포넌트야.
}
