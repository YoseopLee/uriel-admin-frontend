// utils/uploadImage.ts
import { fetchAuthSession } from "aws-amplify/auth";

export const uploadImageToS3 = async (file: File): Promise<string> => {
  try {
    // 🌟 1. 로그인한 유저의 세션에서 JWT 토큰(AccessToken) 꺼내오기
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();

    if (!token) {
      throw new Error("로그인 토큰이 없습니다. 다시 로그인해주세요.");
    }

    // 🌟 2. 백엔드에 Presigned URL 요청 (헤더에 토큰 추가!)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/upload-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization 헤더에 'Bearer [토큰]' 형식으로 담아서 보냄
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `업로드 URL 발급 실패: ${errorData.message || response.statusText}`,
      );
    }

    const { uploadUrl, fileUrl } = await response.json();

    // 3. 발급받은 임시 주소로 S3에 직접 이미지 업로드
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) throw new Error("S3 이미지 업로드 실패");

    return fileUrl;
  } catch (error) {
    console.error("이미지 업로드 중 에러:", error);
    throw error;
  }
};
