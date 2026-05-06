// app/dashboard/register_our_story/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiImage, FiType, FiInfo } from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";

type SectionType = "IMAGE" | "TEXT";

interface SectionData {
  id: number;
  type: SectionType;
  files: File[];
  previewUrls: string[];
  title: string;
  subtitle: string;
  description: string;
}

export default function RegisterOurStoryPage() {
  // 기본 정보 폼 상태
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  // 본문 섹션 빌더
  const [sections, setSections] = useState<SectionData[]>([]);

  const [isLoading, setIsLoading] = useState(true); // 초기 데이터 로딩
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 페이지 진입 시 기존 Our Story 데이터 자동 로드
  // - 랜딩페이지와 동일하게 GET /api/our-story (퍼블릭)
  // - 응답 → 로컬 state 매핑 (sections.images → previewUrls)
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/our-story`,
        );

        // 404 = 아직 등록된 데이터 없음 → 기본 빈 화면
        if (res.status === 404) {
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          console.error("Our Story 데이터 로드 실패:", res.status);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");

        if (Array.isArray(data.sections)) {
          const restored: SectionData[] = data.sections.map(
            (sec: any, idx: number) => ({
              id: Date.now() + idx,
              type: sec.type === "IMAGE" ? "IMAGE" : "TEXT",
              files: [],
              previewUrls: sec.type === "IMAGE" ? sec.images || [] : [],
              title: sec.title || "",
              subtitle: sec.subtitle || "",
              description: sec.description || "",
            }),
          );
          setSections(restored);
        }
      } catch (err) {
        console.error("Our Story 데이터 로드 중 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadExistingData();
  }, []);

  // --- 섹션 빌더 핸들러 ---
  const addSection = (type: SectionType) =>
    setSections([
      ...sections,
      {
        id: Date.now(),
        type,
        files: [],
        previewUrls: [],
        title: "",
        subtitle: "",
        description: "",
      },
    ]);

  const removeSection = (id: number) =>
    setSections(sections.filter((s) => s.id !== id));

  const moveSection = (id: number, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;
    const newSections = [...sections];
    [newSections[idx], newSections[newIdx]] = [
      newSections[newIdx],
      newSections[idx],
    ];
    setSections(newSections);
  };

  // 저장 (덮어쓰기)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      // 본문 섹션 이미지 병렬 업로드 및 가공
      const processedSections = await Promise.all(
        sections.map(async (sec) => {
          if (sec.type === "IMAGE") {
            // 새 파일이 있으면 업로드, 없으면 기존 previewUrls(S3 URL) 그대로 사용
            const uploadedUrls =
              sec.files.length > 0
                ? await Promise.all(
                    sec.files.map((file) => uploadImageToS3(file)),
                  )
                : sec.previewUrls;
            return { type: "IMAGE", images: uploadedUrls };
          } else {
            return {
              type: "TEXT",
              title: sec.title,
              subtitle: sec.subtitle,
              description: sec.description,
            };
          }
        }),
      );

      const payload = {
        title,
        subtitle,
        sections: processedSections,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/our-story`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("저장 실패");

      alert("Our Story가 성공적으로 저장되었습니다! 🎉");
    } catch (error: any) {
      console.error("저장 실패:", error);
      alert(`오류 발생: ${error?.message || "알 수 없는 에러"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 초기 로딩 화면
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-24">
          <div className="text-slate-500 font-semibold animate-pulse">
            기존 Our Story 데이터를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <FiInfo className="mr-2" /> Our Story 관리
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ⚠️ 저장 시 기존 Our Story를 덮어씁니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 (메인 타이틀 + 서브 타이틀) */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                메인 타이틀
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 따뜻한 기술로 일상을 바꾸다"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                서브 타이틀
              </label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="회사 소개 한 줄(또는 짧은 문단)"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 h-20 resize-none"
              />
            </div>
          </div>

          {/* 본문 섹션 빌더 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  본문 콘텐츠 빌더
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  텍스트와 이미지 블록을 조합하여 회사 소개 페이지를 자유롭게
                  구성하세요.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addSection("IMAGE")}
                  className="text-sm border px-3 py-1 rounded bg-blue-50 text-blue-700 flex items-center hover:bg-blue-100 transition-colors"
                >
                  <FiImage className="mr-1" /> 이미지 추가
                </button>
                <button
                  type="button"
                  onClick={() => addSection("TEXT")}
                  className="text-sm border px-3 py-1 rounded bg-indigo-50 text-indigo-700 flex items-center hover:bg-indigo-100 transition-colors"
                >
                  <FiType className="mr-1" /> 텍스트 추가
                </button>
              </div>
            </div>

            {sections.length === 0 && (
              <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-400">
                상단의 버튼을 눌러 텍스트 또는 이미지 블록을 추가해주세요.
              </div>
            )}

            <div className="space-y-4">
              {sections.map((sec, index) => (
                <div
                  key={sec.id}
                  className="relative bg-slate-50 border border-slate-200 p-5 rounded-lg"
                >
                  {/* 섹션 순서 표시 + 위/아래 이동 + 삭제 */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveSection(sec.id, "up")}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1"
                      title="위로 이동"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(sec.id, "down")}
                      disabled={index === sections.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1"
                      title="아래로 이동"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      className="text-slate-400 hover:text-red-500 ml-1"
                      title="삭제"
                    >
                      <FiTrash2 />
                    </button>
                  </div>

                  {/* IMAGE 블록 */}
                  {sec.type === "IMAGE" && (
                    <div className="pr-32">
                      <label className="text-xs font-bold text-slate-500 mb-2 block">
                        🖼️ 이미지 블록 (다중 선택 가능, 최대 10장)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(
                            0,
                            10,
                          );
                          const urls = files.map((f) =>
                            URL.createObjectURL(f),
                          );
                          setSections(
                            sections.map((s) =>
                              s.id === sec.id
                                ? { ...s, files, previewUrls: urls }
                                : s,
                            ),
                          );
                        }}
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 text-slate-900"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        {sec.previewUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            className="h-20 w-20 object-cover rounded border border-slate-200"
                            alt={`preview-${i}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TEXT 블록 */}
                  {sec.type === "TEXT" && (
                    <div className="space-y-2 pr-32">
                      <label className="text-xs font-bold text-slate-500 block">
                        📝 텍스트 블록
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="소제목"
                          value={sec.title}
                          onChange={(e) =>
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id
                                  ? { ...s, title: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          className="w-1/2 px-3 py-2 border border-slate-300 rounded text-slate-900 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="부제목 (선택)"
                          value={sec.subtitle}
                          onChange={(e) =>
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id
                                  ? { ...s, subtitle: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          className="w-1/2 px-3 py-2 border border-slate-300 rounded text-slate-900 text-sm"
                        />
                      </div>
                      <textarea
                        placeholder="본문 내용"
                        value={sec.description}
                        onChange={(e) =>
                          setSections(
                            sections.map((s) =>
                              s.id === sec.id
                                ? { ...s, description: e.target.value }
                                : s,
                            ),
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded h-24 text-slate-900 text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg disabled:bg-blue-300"
          >
            {isSubmitting
              ? "저장 중..."
              : "Our Story 저장하기 (덮어쓰기)"}
          </button>
        </form>
      </div>
    </div>
  );
}
