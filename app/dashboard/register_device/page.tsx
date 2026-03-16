// app/dashboard/register_device/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // 🌟 URL 파라미터 읽기용
import { FiPlus, FiTrash2, FiImage, FiType, FiLink2 } from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";
import { fetchAuthSession } from "aws-amplify/auth";

type SectionType = "IMAGE" | "TEXT" | "BUTTON";

interface SectionData {
  id: number;
  type: SectionType;
  files: File[];
  previewUrls: string[];
  title: string;
  subtitle: string;
  description: string;
  buttonTitle: string;
  buttonUrl: string;
}

interface RelatedProduct {
  id: number;
  file: File | null;
  previewUrl: string;
  title: string;
  subtitle: string;
  desc1: string;
  desc2: string;
}

function RegisterDeviceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId"); // 🌟 URL에 editId가 있으면 '수정 모드'

  const [fetchedCategories, setFetchedCategories] = useState<any[]>([]);
  const [mainCategory, setMainCategory] = useState("");
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    [],
  );
  const [thumbnail, setThumbnail] = useState({
    file: null as File | null,
    previewUrl: "",
    title: "",
    subtitle: "",
  });
  const [sections, setSections] = useState<SectionData[]>([]);
  const [detailImage, setDetailImage] = useState({
    file: null as File | null,
    previewUrl: "",
  });
  const [seriesName, setSeriesName] = useState(""); // 🌟 시리즈명 (예: "UTH-170 Series")
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // 수정 모드 시 데이터 로딩 상태

  // 1. 카테고리 로드 및 수정 모드 데이터 불러오기
  useEffect(() => {
    const initPage = async () => {
      // 카테고리 목록 불러오기
      try {
        const catRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
        );
        const catData = await catRes.json();
        setFetchedCategories(catData);
      } catch (err) {
        console.error("카테고리 로드 실패:", err);
      }

      // 🌟 수정 모드일 경우 기존 데이터 불러와서 폼에 채우기
      if (editId) {
        setIsLoadingData(true);
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/devices/${editId}`,
          );
          if (!res.ok) throw new Error("데이터를 찾을 수 없습니다.");
          const data = await res.json();

          // 폼 상태에 기존 데이터 세팅
          // 🔧 GET /api/devices/:id 는 단일 객체를 반환하므로 data[0]이 아닌 data로 접근
          if (data.main_category) setMainCategory(data.main_category as string);
          setSelectedSubCategories(data.sub_category || []);
          setThumbnail({
            file: null,
            previewUrl: data.thumbnail_info.image_url,
            title: data.thumbnail_info.title,
            subtitle: data.thumbnail_info.subtitle || "",
          });

          // 섹션 데이터 복원
          if (data.sections) {
            const restoredSections = data.sections.map(
              (sec: any, idx: number) => ({
                id: Date.now() + idx,
                type: sec.type,
                files: [],
                previewUrls: sec.type === "IMAGE" ? sec.images || [] : [],
                title: sec.title || "",
                subtitle: sec.subtitle || "",
                description: sec.description || "",
                buttonTitle: sec.type === "BUTTON" ? sec.title || "" : "",
                buttonUrl: sec.link_url || "",
              }),
            );
            setSections(restoredSections);
          }

          setSeriesName(data.series_name || "");

          setDetailImage({
            file: null,
            previewUrl: data.product_detail_image || "",
          });

          if (data.related_product_list) {
            const restoredRelated = data.related_product_list.map(
              (rel: any, idx: number) => ({
                id: Date.now() + idx,
                file: null,
                previewUrl: rel.thumbnail || "",
                title: rel.title || "",
                subtitle: rel.subtitle || "",
                desc1: rel.description || "",
                desc2: rel.description2 || "",
              }),
            );
            setRelatedProducts(restoredRelated);
          }
        } catch (error) {
          alert("수정할 데이터를 불러오지 못했습니다.");
          router.push("/dashboard/manage_devices"); // 에러 시 목록으로 돌아감
        } finally {
          setIsLoadingData(false);
        }
      }
    };
    initPage();
  }, [editId, router]);

  //   const availableSubCategories = Array.from(
  //     new Set(
  //       fetchedCategories
  //         .filter((c) => c.main_category === mainCategory)
  //         .map((c) => c.sub_category)
  //         .filter((sub) => sub && sub.trim() !== ""),
  //     ),
  //   );

  const selectedCategoryObj = fetchedCategories.find(
    (c) => c.main_category === mainCategory,
  );
  const availableSubCategories = selectedCategoryObj?.sub_categories || [];

  const handleMainCategoryChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setMainCategory(e.target.value);
    setSelectedSubCategories([]);
  };

  const toggleSubCategory = (sub: string) => {
    if (selectedSubCategories.includes(sub)) {
      setSelectedSubCategories(
        selectedSubCategories.filter((item) => item !== sub),
      );
    } else {
      setSelectedSubCategories([...selectedSubCategories, sub]);
    }
  };

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
        buttonTitle: "",
        buttonUrl: "",
      },
    ]);
  const removeSection = (id: number) =>
    setSections(sections.filter((s) => s.id !== id));
  const addRelated = () =>
    setRelatedProducts([
      ...relatedProducts,
      {
        id: Date.now(),
        file: null,
        previewUrl: "",
        title: "",
        subtitle: "",
        desc1: "",
        desc2: "",
      },
    ]);
  const removeRelated = (id: number) =>
    setRelatedProducts(relatedProducts.filter((r) => r.id !== id));

  // --- 폼 제출 (신규 등록 OR 수정) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSubCategories.length === 0) {
      alert("최소 1개 이상의 서브 카테고리를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error("로그인 토큰이 없습니다.");

      // 이미지 업로드 처리 (새 파일이 있으면 S3에 올리고, 없으면 기존 URL 유지)
      let thumbUrl = thumbnail.previewUrl;
      if (thumbnail.file) thumbUrl = await uploadImageToS3(thumbnail.file);

      const processedSections = await Promise.all(
        sections.map(async (sec) => {
          if (sec.type === "IMAGE") {
            // 새 파일이 있으면 업로드, 없으면 기존 URL 배열 유지
            const uploadedUrls =
              sec.files.length > 0
                ? await Promise.all(
                    sec.files.map((file) => uploadImageToS3(file)),
                  )
                : sec.previewUrls;
            return { type: "IMAGE", images: uploadedUrls };
          } else if (sec.type === "TEXT") {
            return {
              type: "TEXT",
              title: sec.title,
              subtitle: sec.subtitle,
              description: sec.description,
            };
          } else if (sec.type === "BUTTON") {
            return {
              type: "BUTTON",
              title: sec.buttonTitle,
              link_url: sec.buttonUrl,
            };
          }
        }),
      );

      let detailImgUrl = detailImage.previewUrl;
      if (detailImage.file)
        detailImgUrl = await uploadImageToS3(detailImage.file);

      const processedRelated = await Promise.all(
        relatedProducts.map(async (rel) => {
          let relImgUrl = rel.previewUrl;
          if (rel.file) relImgUrl = await uploadImageToS3(rel.file);
          return {
            title: rel.title,
            subtitle: rel.subtitle,
            description: rel.desc1,
            description2: rel.desc2,
            thumbnail: relImgUrl,
          };
        }),
      );

      const finalData = {
        main_category:
          mainCategory ||
          (fetchedCategories.length > 0
            ? fetchedCategories[0].main_category
            : ""),
        sub_category: selectedSubCategories,
        series_name: seriesName, // 🌟 시리즈명 (예: "UTH-170 Series")
        thumbnail_info: {
          image_url: thumbUrl,
          title: thumbnail.title,
          subtitle: thumbnail.subtitle,
        },
        sections: processedSections,
        product_detail_image: detailImgUrl,
        related_product_list: processedRelated,
      };

      // 🌟 URL 분기: 수정 모드면 PUT /api/devices/:id, 신규면 POST /api/devices
      const apiUrl = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/devices/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/devices`;
      const apiMethod = editId ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) throw new Error("DB 저장 실패");

      alert(
        editId
          ? "✅ 제품 정보가 수정되었습니다!"
          : "✅ 제품이 성공적으로 등록되었습니다!",
      );
      router.push("/dashboard/manage_devices"); // 완료 후 목록 페이지로 이동
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData)
    return (
      <div className="p-10 text-center text-slate-500">
        기존 데이터를 불러오는 중입니다...
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          {editId ? "제품 정보 수정" : "제품 신규 등록"}
        </h2>
        {editId && (
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded font-bold text-sm">
            수정 모드
          </span>
        )}
      </div>

      {/* ===== 이하 폼 UI 영역 (기존 코드와 동일) ===== */}
      {/* 코드 길이가 길어 생략합니다. 기존 파일의 <form onSubmit={handleSubmit}> 내부 코드를 그대로 붙여넣어 주세요! */}

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* ================= 1. 카테고리 ================= */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
            1. 카테고리 분류
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-900">
                메인 카테고리
              </label>
              <select
                value={mainCategory}
                onChange={handleMainCategoryChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              >
                {Array.from(
                  new Set(fetchedCategories.map((c) => c.main_category)),
                ).map((cat) => (
                  <option key={cat as string} value={cat as string}>
                    {cat as string}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                서브 카테고리 (다중 선택 가능){" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-3 mt-2">
                {availableSubCategories.length > 0 ? (
                  availableSubCategories.map((sub: string) => (
                    <label
                      key={sub as string}
                      className={`flex items-center space-x-2 cursor-pointer border px-4 py-2 rounded-lg transition-colors ${selectedSubCategories.includes(sub as string) ? "bg-blue-50 border-blue-500 text-blue-700 font-semibold" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubCategories.includes(sub as string)}
                        onChange={() => toggleSubCategory(sub as string)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>{sub as string}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 py-2">
                    등록된 서브 카테고리가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================= 2. 썸네일 ================= */}
        <section className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">
            2. 리스트 노출용 썸네일 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-900">
                썸네일 이미지
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    setThumbnail({
                      ...thumbnail,
                      file,
                      previewUrl: URL.createObjectURL(file),
                    });
                }}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 text-slate-900"
              />
              {thumbnail.previewUrl && (
                <img
                  src={thumbnail.previewUrl}
                  className="mt-4 h-32 object-cover rounded-lg shadow-sm"
                  alt="thumb"
                />
              )}
            </div>
            <div className="col-span-2 space-y-4">
              <input
                type="text"
                placeholder="썸네일 타이틀 (제품명)"
                value={thumbnail.title}
                onChange={(e) =>
                  setThumbnail({ ...thumbnail, title: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              />
              <input
                type="text"
                placeholder="썸네일 서브타이틀 (한줄 설명)"
                value={thumbnail.subtitle}
                onChange={(e) =>
                  setThumbnail({ ...thumbnail, subtitle: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
        </section>

        {/* ================= 3. 상세페이지 빌더 (업그레이드 됨!) ================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b pb-4 gap-4">
            <h3 className="text-lg font-bold text-slate-800">
              3. 상세페이지 빌더 (섹션 조립)
            </h3>

            {/* 🌟 3가지 타입의 블록 추가 버튼 */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addSection("IMAGE")}
                className="flex items-center text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 font-semibold transition-colors"
              >
                <FiImage className="mr-1" /> 이미지 블록 추가
              </button>
              <button
                type="button"
                onClick={() => addSection("TEXT")}
                className="flex items-center text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-100 font-semibold transition-colors"
              >
                <FiType className="mr-1" /> 텍스트 블록 추가
              </button>
              <button
                type="button"
                onClick={() => addSection("BUTTON")}
                className="flex items-center text-sm bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
              >
                <FiLink2 className="mr-1" /> 버튼 블록 추가
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {sections.length === 0 && (
              <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-slate-800">
                우측 상단의 버튼을 눌러 상세페이지 블록을 추가해 보세요.
              </div>
            )}

            {sections.map((sec, index) => (
              <div
                key={sec.id}
                className="relative bg-white border border-slate-200 p-6 rounded-lg shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => removeSection(sec.id)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 size={20} />
                </button>

                {/* 🌟 타입별 블록 뱃지 표시 */}
                <div className="mb-4 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                  {sec.type === "IMAGE" && (
                    <>
                      <FiImage className="mr-1.5 text-slate-900" /> 이미지 블록
                    </>
                  )}
                  {sec.type === "TEXT" && (
                    <>
                      <FiType className="mr-1.5" /> 텍스트 블록
                    </>
                  )}
                  {sec.type === "BUTTON" && (
                    <>
                      <FiLink2 className="mr-1.5" /> 버튼 블록
                    </>
                  )}
                </div>

                {/* 🌟 1. IMAGE 타입 렌더링 */}
                {sec.type === "IMAGE" && (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-900">
                      이미지 등록 (최대 10장)
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
                        const urls = files.map((f) => URL.createObjectURL(f));
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
                    <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                      {sec.previewUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          className="h-24 w-24 object-cover rounded-lg border shadow-sm"
                          alt="sec-img"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 🌟 2. TEXT 타입 렌더링 */}
                {sec.type === "TEXT" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          텍스트 타이틀
                        </label>
                        <input
                          type="text"
                          placeholder="예: 혁신적인 기술력"
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
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          텍스트 서브타이틀
                        </label>
                        <input
                          type="text"
                          placeholder="부제목 입력"
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
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        상세 설명 본문
                      </label>
                      <textarea
                        placeholder="제품에 대한 상세 설명을 입력하세요."
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
                        className="w-full px-4 py-2 border rounded-lg h-28 focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* 🌟 3. BUTTON 타입 렌더링 */}
                {sec.type === "BUTTON" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        버튼에 표시될 문구
                      </label>
                      <input
                        type="text"
                        placeholder="버튼 텍스트 입력"
                        value={sec.buttonTitle}
                        onChange={(e) =>
                          setSections(
                            sections.map((s) =>
                              s.id === sec.id
                                ? { ...s, buttonTitle: e.target.value }
                                : s,
                            ),
                          )
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-800 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        클릭 시 이동할 URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={sec.buttonUrl}
                        onChange={(e) =>
                          setSections(
                            sections.map((s) =>
                              s.id === sec.id
                                ? { ...s, buttonUrl: e.target.value }
                                : s,
                            ),
                          )
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-800 text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================= 4. 규격 & 5. 관련 제품 ================= */}
        <section className="grid grid-cols-1 gap-10 border-t border-slate-200 pt-8">
          {/* <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              4. 제품 규격표 이미지 (1장)
            </h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  setDetailImage({
                    file,
                    previewUrl: URL.createObjectURL(file),
                  });
              }}
              className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 text-slate-900"
            />
            {detailImage.previewUrl && (
              <img
                src={detailImage.previewUrl}
                className="h-40 object-contain border border-slate-200 p-2 rounded-lg bg-slate-50"
                alt="detail"
              />
            )}
          </div> */}

          {/* ================= 시리즈명 ================= */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">
              시리즈명 (연관 제품 그룹명)
            </h3>
            <p className="text-sm text-slate-500">
              이 제품이 속한 시리즈의 이름입니다. 프론트엔드 상세페이지에서 &quot;○○○ 라인업&quot; 등의 제목으로 사용됩니다.
              <br />
              예: &quot;UTH-170 Series&quot;, &quot;URC-02 Series&quot;
            </p>
            <input
              type="text"
              placeholder="시리즈명 입력 (예: UTH-170 Series)"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                4. 연관 제품 등록
              </h3>
              <button
                type="button"
                onClick={addRelated}
                className="text-sm bg-slate-200 text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold"
              >
                + 연관 제품 추가
              </button>
            </div>

            <div className="space-y-4">
              {relatedProducts.map((rel, index) => (
                <div
                  key={rel.id}
                  className="flex flex-col md:flex-row gap-6 border border-slate-200 p-6 rounded-lg bg-slate-50 relative shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => removeRelated(rel.id)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 size={18} />
                  </button>
                  <div className="w-full md:w-1/3">
                    <label className="block text-xs font-semibold mb-2 text-slate-500">
                      연관 제품 썸네일
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file)
                          setRelatedProducts(
                            relatedProducts.map((r) =>
                              r.id === rel.id
                                ? {
                                    ...r,
                                    file,
                                    previewUrl: URL.createObjectURL(file),
                                  }
                                : r,
                            ),
                          );
                      }}
                      className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 text-slate-900"
                    />
                    {rel.previewUrl && (
                      <img
                        src={rel.previewUrl}
                        className="h-24 w-full object-cover rounded-lg border border-slate-200"
                        alt="related"
                      />
                    )}
                  </div>
                  <div className="w-full md:w-2/3 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="타이틀"
                      value={rel.title}
                      onChange={(e) =>
                        setRelatedProducts(
                          relatedProducts.map((r) =>
                            r.id === rel.id
                              ? { ...r, title: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="서브타이틀"
                      value={rel.subtitle}
                      onChange={(e) =>
                        setRelatedProducts(
                          relatedProducts.map((r) =>
                            r.id === rel.id
                              ? { ...r, subtitle: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="설명 1"
                      value={rel.desc1}
                      onChange={(e) =>
                        setRelatedProducts(
                          relatedProducts.map((r) =>
                            r.id === rel.id
                              ? { ...r, desc1: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="설명 2"
                      value={rel.desc2}
                      onChange={(e) =>
                        setRelatedProducts(
                          relatedProducts.map((r) =>
                            r.id === rel.id
                              ? { ...r, desc2: e.target.value }
                              : r,
                          ),
                        )
                      }
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg text-lg transition-colors"
        >
          {isSubmitting
            ? "제품 데이터와 이미지 업로드 중... (시간이 걸릴 수 있습니다)"
            : "제품 등록하기"}
        </button>
      </form>
    </div>
  );
}

// 🌟 2. 파일 맨 아래에 이것을 새로 추가! (진짜 페이지 컴포넌트)
export default function RegisterDevicePage() {
  return (
    // Suspense로 감싸주면 Vercel 빌드 에러가 사라집니다.
    <Suspense
      fallback={
        <div className="p-10 text-center text-slate-500">
          페이지를 불러오는 중입니다...
        </div>
      }
    >
      <RegisterDeviceForm />
    </Suspense>
  );
}
