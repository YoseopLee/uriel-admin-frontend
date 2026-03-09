// app/dashboard/register_landing/page.tsx
"use client";

import { useState } from "react";
import {
  FiPlus,
  FiTrash2,
  FiImage,
  FiLink,
  FiLayers,
  FiAlignLeft,
} from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";
import { fetchAuthSession } from "aws-amplify/auth";

// 🌟 개별 슬라이드 데이터 구조 (description 추가)
interface SlideItem {
  id: number;
  file: File | null;
  previewUrl: string;
  title: string;
  subtitle: string;
  description: string; // 🌟 새로 추가됨
  linkUrl: string;
}

interface CarouselSection {
  id: number;
  sectionTitle: string;
  slides: SlideItem[];
}

export default function RegisterLandingPage() {
  const [carousels, setCarousels] = useState<CarouselSection[]>([
    { id: Date.now(), sectionTitle: "메인 캐러셀", slides: [] },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 캐러셀 섹션 핸들러 ---
  const addCarouselSection = () => {
    setCarousels([
      ...carousels,
      { id: Date.now(), sectionTitle: "", slides: [] },
    ]);
  };

  const removeCarouselSection = (id: number) => {
    setCarousels(carousels.filter((c) => c.id !== id));
  };

  const updateSectionTitle = (id: number, title: string) => {
    setCarousels(
      carousels.map((c) => (c.id === id ? { ...c, sectionTitle: title } : c)),
    );
  };

  // --- 개별 슬라이드 핸들러 ---
  const addSlide = (carouselId: number) => {
    setCarousels(
      carousels.map((c) => {
        if (c.id === carouselId) {
          if (c.slides.length >= 10) {
            alert("한 캐러셀당 슬라이드는 최대 10장까지만 가능합니다.");
            return c;
          }
          return {
            ...c,
            // 🌟 새 슬라이드 추가 시 description 빈 값 추가
            slides: [
              ...c.slides,
              {
                id: Date.now(),
                file: null,
                previewUrl: "",
                title: "",
                subtitle: "",
                description: "",
                linkUrl: "",
              },
            ],
          };
        }
        return c;
      }),
    );
  };

  const removeSlide = (carouselId: number, slideId: number) => {
    setCarousels(
      carousels.map((c) =>
        c.id === carouselId
          ? { ...c, slides: c.slides.filter((s) => s.id !== slideId) }
          : c,
      ),
    );
  };

  const updateSlide = (
    carouselId: number,
    slideId: number,
    field: keyof SlideItem,
    value: string,
  ) => {
    setCarousels(
      carousels.map((c) =>
        c.id === carouselId
          ? {
              ...c,
              slides: c.slides.map((s) =>
                s.id === slideId ? { ...s, [field]: value } : s,
              ),
            }
          : c,
      ),
    );
  };

  const handleSlideImage = (
    carouselId: number,
    slideId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCarousels(
        carousels.map((c) =>
          c.id === carouselId
            ? {
                ...c,
                slides: c.slides.map((s) =>
                  s.id === slideId ? { ...s, file, previewUrl } : s,
                ),
              }
            : c,
        ),
      );
    }
  };

  // --- 폼 제출 및 DB 저장 ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error("로그인 정보가 없습니다.");

      const processedCarousels = await Promise.all(
        carousels.map(async (carousel) => {
          const processedSlides = await Promise.all(
            carousel.slides.map(async (slide) => {
              let s3Url = "";
              if (slide.file) s3Url = await uploadImageToS3(slide.file);
              return {
                title: slide.title,
                subtitle: slide.subtitle,
                description: slide.description, // 🌟 DB로 전송될 항목에 추가
                link_url: slide.linkUrl,
                image_url: s3Url || slide.previewUrl,
              };
            }),
          );

          return {
            section_title: carousel.sectionTitle,
            slides: processedSlides,
          };
        }),
      );

      const finalData = {
        carousel_sections: processedCarousels,
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/landing-page`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalData),
        },
      );

      if (!response.ok) throw new Error("DB 저장 실패");

      alert("랜딩페이지 정보가 성공적으로 적용되었습니다! 🎉");
    } catch (error) {
      console.error("업로드 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">랜딩페이지 관리</h2>
        <button
          type="button"
          onClick={addCarouselSection}
          className="flex items-center bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-semibold"
        >
          <FiLayers className="mr-2" /> 새 캐러셀 섹션 추가
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {carousels.length === 0 && (
          <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-slate-400">
            우측 상단의 버튼을 눌러 캐러셀 섹션을 추가해주세요.
          </div>
        )}

        {carousels.map((carousel, cIndex) => (
          <section
            key={carousel.id}
            className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative shadow-sm"
          >
            <button
              type="button"
              onClick={() => removeCarouselSection(carousel.id)}
              className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors"
            >
              <FiTrash2 size={22} />
            </button>

            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 pr-10">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  섹션 {cIndex + 1} 관리 제목
                </label>
                <input
                  type="text"
                  value={carousel.sectionTitle}
                  onChange={(e) =>
                    updateSectionTitle(carousel.id, e.target.value)
                  }
                  placeholder="예: 메인 배너 슬라이더, 프로모션 슬라이더"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={() => addSlide(carousel.id)}
                className="flex items-center justify-center bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-semibold transition-colors h-10 mt-5 md:mt-0"
              >
                <FiPlus className="mr-1" /> 슬라이드 사진 추가
              </button>
            </div>

            <div className="space-y-4">
              {carousel.slides.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6 bg-white rounded-lg border border-dashed border-slate-300">
                  슬라이드 사진을 추가해주세요.
                </p>
              )}

              {carousel.slides.map((slide, sIndex) => (
                <div
                  key={slide.id}
                  className="relative bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 items-start"
                >
                  <button
                    type="button"
                    onClick={() => removeSlide(carousel.id, slide.id)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                  >
                    <FiTrash2 size={18} />
                  </button>

                  {/* 왼쪽: 이미지 영역 */}
                  <div className="w-full lg:w-1/4">
                    <label className="block text-xs font-semibold text-slate-600 mb-2 flex items-center">
                      <FiImage className="mr-1" /> 슬라이드 {sIndex + 1} 이미지
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleSlideImage(carousel.id, slide.id, e)
                      }
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                    />
                    {slide.previewUrl && (
                      <img
                        src={slide.previewUrl}
                        alt="Slide Preview"
                        className="mt-3 w-full h-32 object-cover rounded-lg border border-slate-200 shadow-sm"
                      />
                    )}
                  </div>

                  {/* 오른쪽: 텍스트 및 정보 입력 영역 */}
                  <div className="w-full lg:w-3/4 space-y-3 pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          메인 타이틀 (Title)
                        </label>
                        <input
                          type="text"
                          placeholder="예: 혁신의 시작"
                          value={slide.title}
                          onChange={(e) =>
                            updateSlide(
                              carousel.id,
                              slide.id,
                              "title",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          서브 타이틀 (Subtitle)
                        </label>
                        <input
                          type="text"
                          placeholder="예: 2026년형 신제품 출시"
                          value={slide.subtitle}
                          onChange={(e) =>
                            updateSlide(
                              carousel.id,
                              slide.id,
                              "subtitle",
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
                        />
                      </div>
                    </div>

                    {/* 🌟 상세 설명(Description) 입력 칸 추가 */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">
                        <FiAlignLeft className="mr-1" /> 상세 설명 (Description)
                      </label>
                      <textarea
                        placeholder="슬라이드에 대한 자세한 설명을 입력하세요."
                        value={slide.description}
                        onChange={(e) =>
                          updateSlide(
                            carousel.id,
                            slide.id,
                            "description",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm h-16 resize-none text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">
                        <FiLink className="mr-1" /> 연결 URL (클릭 시 이동)
                      </label>
                      <input
                        type="text"
                        placeholder="https://uriel.kr/..."
                        value={slide.linkUrl}
                        onChange={(e) =>
                          updateSlide(
                            carousel.id,
                            slide.id,
                            "linkUrl",
                            e.target.value,
                          )
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg transition-colors text-lg"
        >
          {isSubmitting
            ? "모든 이미지 업로드 및 저장 중..."
            : "랜딩페이지 저장하기"}
        </button>
      </form>
    </div>
  );
}
