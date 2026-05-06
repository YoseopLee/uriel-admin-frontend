// app/dashboard/register_our_story/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiPlus, FiInfo, FiArrowUp, FiArrowDown, FiImage } from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";

// 🌟 회사 연혁 카드 1개 (가로로 나열되는 타임라인 항목)
interface StoryItem {
  id: number; // 로컬 React key 용 (서버 저장 X)
  year: string;
  month: string;
  title: string;
  description: string;
  imageFile: File | null; // 새로 선택한 이미지
  imageUrl: string; // 기존 S3 URL (편집 시) 또는 미리보기 blob URL
}

const currentYear = new Date().getFullYear();

export default function RegisterOurStoryPage() {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 페이지 진입 시 기존 Our Story 자동 로드
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/our-story`,
        );

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
        if (Array.isArray(data.items)) {
          const restored: StoryItem[] = data.items.map(
            (item: any, idx: number) => ({
              id: Date.now() + idx,
              year: item.year || "",
              month: item.month || "",
              title: item.title || "",
              description: item.description || "",
              imageFile: null,
              imageUrl: item.image_url || "",
            }),
          );
          setItems(restored);
        }
      } catch (err) {
        console.error("Our Story 데이터 로드 중 오류:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadExistingData();
  }, []);

  // --- 카드 핸들러 ---
  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        year: String(currentYear),
        month: "",
        title: "",
        description: "",
        imageFile: null,
        imageUrl: "",
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (!window.confirm("이 카드를 삭제하시겠습니까?")) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: number,
    field: keyof StoryItem,
    value: string,
  ) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleImageChange = (
    id: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, imageFile: file, imageUrl: blobUrl } : item,
      ),
    );
  };

  const removeImage = (id: number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, imageFile: null, imageUrl: "" } : item,
      ),
    );
  };

  const moveItem = (id: number, direction: "up" | "down") => {
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    const newItems = [...items];
    [newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]];
    setItems(newItems);
  };

  // 🌟 연도/월 내림차순으로 자동 정렬 (가장 최근이 맨 앞)
  const sortByDateDesc = () => {
    if (!window.confirm("연도/월 내림차순(최신순)으로 자동 정렬하시겠습니까?"))
      return;
    const sorted = [...items].sort((a, b) => {
      const aKey = `${a.year || "0000"}-${(a.month || "00").padStart(2, "0")}`;
      const bKey = `${b.year || "0000"}-${(b.month || "00").padStart(2, "0")}`;
      return bKey.localeCompare(aKey);
    });
    setItems(sorted);
  };

  // 저장 (덮어쓰기)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      // 새 이미지가 있으면 업로드, 없으면 기존 imageUrl(S3 URL) 그대로 사용
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let finalImageUrl = item.imageUrl || "";
          if (item.imageFile) {
            finalImageUrl = await uploadImageToS3(item.imageFile);
          }
          return {
            year: item.year.trim(),
            month: item.month.trim(),
            title: item.title.trim(),
            description: item.description.trim(),
            image_url: finalImageUrl,
          };
        }),
      );

      const payload = { items: processedItems };

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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-24">
          <div className="text-slate-500 font-semibold animate-pulse">
            기존 Our Story 데이터를 불러오는 중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 border-b pb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <FiInfo className="mr-2" /> Our Story 관리
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              회사 연혁 카드를 추가/수정합니다. 카드들은 회사 홈페이지에서
              가로로 나열되어 표시됩니다.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 저장 시 기존 Our Story를 덮어씁니다.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {items.length > 1 && (
              <button
                type="button"
                onClick={sortByDateDesc}
                className="text-sm border border-slate-300 px-3 py-2 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                title="연도/월 내림차순(최신순)으로 정렬"
              >
                최신순 자동 정렬
              </button>
            )}
            <button
              type="button"
              onClick={addItem}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <FiPlus /> 새 카드 추가
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-400">
              <p>등록된 카드가 없습니다.</p>
              <p className="text-xs mt-2">
                우측 상단 &quot;새 카드 추가&quot; 버튼으로 연혁을 추가해주세요.
              </p>
            </div>
          )}

          {/* 카드 목록 (세로로 펼쳐서 편집, 실제 회사 홈페이지에서는 가로 배치됨) */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative bg-slate-50 border border-slate-200 p-5 rounded-lg hover:border-slate-300 transition-colors"
              >
                {/* 헤더: 카드 순번 + 순서 이동 + 삭제 */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded">
                      카드 #{index + 1}
                    </span>
                    {item.year && item.month && (
                      <span className="text-xs text-slate-500">
                        ({item.year}.{item.month.padStart(2, "0")})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "up")}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="위로 (좌측으로)"
                    >
                      <FiArrowUp />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, "down")}
                      disabled={index === items.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="아래로 (우측으로)"
                    >
                      <FiArrowDown />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 ml-2"
                      title="삭제"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                {/* 본문: 좌측 입력 / 우측 카드 미리보기 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 입력 영역 (2/3) */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          연도 (Year)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="2025"
                          value={item.year}
                          onChange={(e) =>
                            updateItem(item.id, "year", e.target.value)
                          }
                          maxLength={4}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          월 (Month)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="12"
                          value={item.month}
                          onChange={(e) =>
                            updateItem(item.id, "month", e.target.value)
                          }
                          maxLength={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        제목 (Title)
                      </label>
                      <input
                        type="text"
                        placeholder="예: 우리엘전자 온라인 사옥 홈페이지 리뉴얼"
                        value={item.title}
                        onChange={(e) =>
                          updateItem(item.id, "title", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        설명 (Description)
                      </label>
                      <textarea
                        placeholder="예: 2025년 12월 우리엘전자 온라인 사옥 홈페이지 리뉴얼"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm h-20 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center">
                        <FiImage className="mr-1" /> 이미지 (선택)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(item.id, e)}
                          className="flex-1 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                        />
                        {item.imageUrl && (
                          <button
                            type="button"
                            onClick={() => removeImage(item.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                          >
                            제거
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 카드 미리보기 (1/3) */}
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      카드 미리보기
                    </label>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 aspect-[3/4] flex flex-col justify-between shadow-sm">
                      {/* 상단: 연도/월 */}
                      <div>
                        <p className="text-base font-bold text-slate-900 leading-tight">
                          {item.year || "----"}
                        </p>
                        <p className="text-base font-bold text-slate-900 leading-tight">
                          {item.month
                            ? item.month.padStart(2, "0")
                            : "--"}
                        </p>
                      </div>
                      {/* 중간: 이미지 */}
                      {item.imageUrl && (
                        <div className="my-2">
                          <img
                            src={item.imageUrl}
                            alt="preview"
                            className="w-full h-20 object-cover rounded"
                          />
                        </div>
                      )}
                      {/* 하단: 제목 + 설명 */}
                      <div>
                        <p className="text-sm font-bold text-slate-900 mb-2 line-clamp-2">
                          {item.title || "(제목 미입력)"}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-3">
                          {item.description || "(설명 미입력)"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg disabled:bg-blue-300 mt-6"
          >
            {isSubmitting ? "저장 중..." : "Our Story 저장하기 (덮어쓰기)"}
          </button>
        </form>
      </div>
    </div>
  );
}
