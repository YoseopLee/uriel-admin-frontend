// app/dashboard/register_blog/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  FiTrash2,
  FiEdit2,
  FiX,
  FiImage,
  FiType,
  FiLink2,
  FiPlus,
} from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";
// 🌟 D&D
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/SortableItem";

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
  // 🌐 영문 (옵셔널)
  engTitle: string;
  engSubtitle: string;
  engDescription: string;
  engButtonTitle: string;
  showEng: boolean; // UI 전용
}

export default function RegisterBlogPage() {
  const [blogs, setBlogs] = useState<any[]>([]);

  // 기본 정보 폼 상태
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [thumbnail, setThumbnail] = useState({
    file: null as File | null,
    previewUrl: "",
  });

  // 🌐 본문 영문 (옵셔널)
  const [engTitle, setEngTitle] = useState("");
  const [engSubtitle, setEngSubtitle] = useState("");
  const [showEngHeader, setShowEngHeader] = useState(false);

  // 🌟 블로그 본문 (섹션 빌더)
  const [sections, setSections] = useState<SectionData[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPageKey, setNextPageKey] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  // 🌐 본문 영문 토글
  const openHeaderEng = () => setShowEngHeader(true);
  const closeHeaderEng = () => {
    if ((engTitle || engSubtitle) &&
      !window.confirm("입력한 본문 영문 내용을 비우시겠습니까?")) {
      return;
    }
    setEngTitle("");
    setEngSubtitle("");
    setShowEngHeader(false);
  };

  // 🌐 섹션별 영문 토글
  const openSectionEng = (id: number) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, showEng: true } : s)));
  };
  const closeSectionEng = (id: number) => {
    const target = sections.find((s) => s.id === id);
    const hasEng =
      !!(target?.engTitle || target?.engSubtitle || target?.engDescription || target?.engButtonTitle);
    if (hasEng &&
      !window.confirm("이 섹션의 영문 내용을 비우시겠습니까?")) {
      return;
    }
    setSections(
      sections.map((s) =>
        s.id === id
          ? {
              ...s,
              engTitle: "",
              engSubtitle: "",
              engDescription: "",
              engButtonTitle: "",
              showEng: false,
            }
          : s,
      ),
    );
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async (loadMore = false) => {
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/blogs?limit=10`;
      if (loadMore && nextPageKey) url += `&lastEvaluatedKey=${nextPageKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (loadMore) setBlogs((prev) => [...prev, ...data.data]);
      else setBlogs(data.data);
      setNextPageKey(data.nextPageKey);
      setHasNextPage(data.hasNextPage);
    } catch (err) {
      console.error(err);
    }
  };

  // 🌟 D&D sensors + handler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setSections(arrayMove(sections, oldIndex, newIndex));
  };

  // --- 본문 섹션 빌더 핸들러 ---
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
        engTitle: "",
        engSubtitle: "",
        engDescription: "",
        engButtonTitle: "",
        showEng: false,
      },
    ]);
  const removeSection = (id: number) =>
    setSections(sections.filter((s) => s.id !== id));

  // 등록/수정 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      // 1. 썸네일 업로드
      let uploadedThumb = thumbnail.previewUrl;
      if (thumbnail.file) uploadedThumb = await uploadImageToS3(thumbnail.file);

      // 2. 본문 섹션 이미지 병렬 업로드 및 가공
      const processedSections = await Promise.all(
        sections.map(async (sec) => {
          if (sec.type === "IMAGE") {
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
              // 🌐 영문 (옵셔널)
              eng_title: sec.engTitle,
              eng_subtitle: sec.engSubtitle,
              eng_description: sec.engDescription,
            };
          } else if (sec.type === "BUTTON") {
            return {
              type: "BUTTON",
              title: sec.buttonTitle,
              link_url: sec.buttonUrl,
              eng_title: sec.engButtonTitle, // 🌐
            };
          }
        }),
      );

      const payload = {
        title,
        subtitle,
        date: publishDate,
        thumbnail: uploadedThumb,
        sections: processedSections,
        // 🌐 본문 영문 (옵셔널)
        eng_title: engTitle,
        eng_subtitle: engSubtitle,
      };

      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/blogs`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("저장 실패");
      alert(editId ? "수정되었습니다." : "등록되었습니다.");
      resetForm();
      fetchBlogs();
    } catch (error) {
      alert("오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (blog: any) => {
    setEditId(blog.id);
    setTitle(blog.title || "");
    setSubtitle(blog.subtitle || "");
    setPublishDate(blog.date || "");
    setThumbnail({ file: null, previewUrl: blog.thumbnail || "" });

    // 🌐 본문 영문 데이터 로드
    const eTitle = blog.eng_title || "";
    const eSubtitle = blog.eng_subtitle || "";
    setEngTitle(eTitle);
    setEngSubtitle(eSubtitle);
    setShowEngHeader(!!(eTitle || eSubtitle));

    if (blog.sections) {
      const restored = blog.sections.map((sec: any, idx: number) => {
        const engTitle = sec.eng_title || "";
        const engSubtitle = sec.eng_subtitle || "";
        const engDescription = sec.eng_description || "";
        const engButtonTitle = sec.type === "BUTTON" ? sec.eng_title || "" : "";
        return {
          id: Date.now() + idx,
          type: sec.type,
          files: [],
          previewUrls: sec.type === "IMAGE" ? sec.images || [] : [],
          title: sec.title || "",
          subtitle: sec.subtitle || "",
          description: sec.description || "",
          buttonTitle: sec.type === "BUTTON" ? sec.title || "" : "",
          buttonUrl: sec.link_url || "",
          engTitle: sec.type === "BUTTON" ? "" : engTitle,
          engSubtitle: sec.type === "BUTTON" ? "" : engSubtitle,
          engDescription: sec.type === "BUTTON" ? "" : engDescription,
          engButtonTitle,
          // 🌐 영문 데이터 있으면 자동 펼침
          showEng:
            sec.type === "BUTTON"
              ? !!engButtonTitle
              : !!(engTitle || engSubtitle || engDescription),
        };
      });
      setSections(restored);
    } else {
      setSections([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBlogs();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setSubtitle("");
    setPublishDate("");
    setThumbnail({ file: null, previewUrl: "" });
    setSections([]);
    setEngTitle("");
    setEngSubtitle("");
    setShowEngHeader(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 🌟 상단: 폼 영역 */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {editId ? "블로그 게시글 수정" : "블로그 새 글 쓰기"}
          </h2>
          {editId && (
            <button
              onClick={resetForm}
              className="text-sm text-slate-500 hover:text-slate-800 flex"
            >
              <FiX className="mr-1 mt-0.5" /> 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
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
                      file,
                      previewUrl: URL.createObjectURL(file),
                    });
                }}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 text-slate-900"
              />
              {thumbnail.previewUrl && (
                <img
                  src={thumbnail.previewUrl}
                  className="mt-2 h-24 object-cover rounded border"
                  alt="thumb"
                />
              )}
            </div>
            <div className="md:col-span-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  블로그 제목 {showEngHeader && <span className="text-slate-400 font-normal">(한글)</span>}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="블로그 제목"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>
              {showEngHeader && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Title <span className="text-slate-400 font-normal">(English, 선택)</span>
                  </label>
                  <input
                    type="text"
                    value={engTitle}
                    onChange={(e) => setEngTitle(e.target.value)}
                    placeholder="Blog title in English"
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  서브 타이틀 {showEngHeader && <span className="text-slate-400 font-normal">(한글)</span>}
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="서브 타이틀 (간략한 설명)"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                  required
                />
              </div>
              {showEngHeader && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Subtitle <span className="text-slate-400 font-normal">(English, 선택)</span>
                  </label>
                  <input
                    type="text"
                    value={engSubtitle}
                    onChange={(e) => setEngSubtitle(e.target.value)}
                    placeholder="Brief subtitle in English"
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                  />
                </div>
              )}
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-1/2 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              />

              {/* 🌐 본문 영문 추가/제거 버튼 */}
              {showEngHeader ? (
                <button
                  type="button"
                  onClick={closeHeaderEng}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                  본문 영문 입력 제거
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openHeaderEng}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  본문 영문(English) 입력 추가하기
                </button>
              )}
            </div>
          </div>

          {/* 본문 에디터 (섹션 빌더) */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4 text-slate-900">
              <h3 className="text-lg font-bold">본문 내용 조립 (상세 빌더)</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addSection("IMAGE")}
                  className="text-sm border px-3 py-1 rounded bg-blue-50 text-blue-700 flex items-center"
                >
                  <FiImage className="mr-1" /> 이미지 추가
                </button>
                <button
                  type="button"
                  onClick={() => addSection("TEXT")}
                  className="text-sm border px-3 py-1 rounded bg-indigo-50 text-indigo-700 flex items-center"
                >
                  <FiType className="mr-1" /> 텍스트 추가
                </button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
            <div className="space-y-4">
              {sections.map((sec, index) => (
                <SortableItem
                  key={sec.id}
                  id={sec.id}
                  handleClassName="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-none"
                  className="bg-slate-50 border p-4 pl-12 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => removeSection(sec.id)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 z-10"
                  >
                    <FiTrash2 />
                  </button>

                  {sec.type === "IMAGE" && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">
                        이미지 블록 (다중 선택 가능)
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
                      <div className="flex gap-2 mt-2">
                        {sec.previewUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            className="h-16 w-16 object-cover"
                            alt="img"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {sec.type === "TEXT" && (
                    <div className="space-y-2 pr-8">
                      <label className="text-xs font-bold text-slate-500 block">
                        텍스트 블록
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={sec.showEng ? "소제목 (한글)" : "소제목"}
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
                          className="w-1/2 p-2 border rounded text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder={sec.showEng ? "서브 부제목 (한글)" : "서브 부제목"}
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
                          className="w-1/2 p-2 border rounded text-slate-900"
                        />
                      </div>
                      {sec.showEng && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Title (English, 선택)"
                            value={sec.engTitle}
                            onChange={(e) =>
                              setSections(
                                sections.map((s) =>
                                  s.id === sec.id
                                    ? { ...s, engTitle: e.target.value }
                                    : s,
                                ),
                              )
                            }
                            className="w-1/2 p-2 border border-slate-200 bg-white rounded text-slate-900 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Subtitle (English, 선택)"
                            value={sec.engSubtitle}
                            onChange={(e) =>
                              setSections(
                                sections.map((s) =>
                                  s.id === sec.id
                                    ? { ...s, engSubtitle: e.target.value }
                                    : s,
                                ),
                              )
                            }
                            className="w-1/2 p-2 border border-slate-200 bg-white rounded text-slate-900 text-sm"
                          />
                        </div>
                      )}
                      <textarea
                        placeholder={sec.showEng ? "본문 내용 (한글)" : "본문 내용"}
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
                        className="w-full p-2 border rounded h-20 text-slate-900"
                      />
                      {sec.showEng && (
                        <textarea
                          placeholder="Description (English, 선택)"
                          value={sec.engDescription}
                          onChange={(e) =>
                            setSections(
                              sections.map((s) =>
                                s.id === sec.id
                                  ? { ...s, engDescription: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          className="w-full p-2 border border-slate-200 bg-white rounded h-20 text-slate-900 text-sm"
                        />
                      )}

                      {/* 🌐 섹션별 영문 추가/제거 버튼 */}
                      <div className="pt-1">
                        {sec.showEng ? (
                          <button
                            type="button"
                            onClick={() => closeSectionEng(sec.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            이 섹션 영문 제거
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openSectionEng(sec.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-500 rounded text-sm font-semibold transition-colors"
                          >
                            <FiPlus className="w-4 h-4" />
                            이 섹션에 영문 추가
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
              </SortableContext>
            </DndContext>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg"
          >
            {isLoading
              ? "저장 중..."
              : editId
                ? "블로그 수정 완료"
                : "블로그 포스팅하기"}
          </button>
        </form>
      </div>

      {/* 🌟 하단: 목록 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          등록된 블로그 포스트
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blogs.map((blog) => (
            <div
              key={blog.id}
              className="flex gap-4 border p-4 rounded-lg relative hover:bg-slate-50"
            >
              <img
                src={blog.thumbnail || "https://via.placeholder.com/80"}
                className="w-20 h-20 object-cover rounded"
                alt="thumb"
              />
              <div>
                <p className="text-xs text-blue-500 font-bold mb-1">
                  {blog.date}
                </p>
                <h4 className="font-bold text-slate-800 line-clamp-1">
                  {blog.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                  {blog.subtitle}
                </p>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => handleEditClick(blog)}
                  className="text-slate-400 hover:text-green-600"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(blog.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
        {hasNextPage && (
          <button
            onClick={() => fetchBlogs(true)}
            className="w-full mt-4 py-2 border text-slate-600 rounded"
          >
            10개 더보기
          </button>
        )}
      </div>
    </div>
  );
}
