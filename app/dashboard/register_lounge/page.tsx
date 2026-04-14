// app/dashboard/register_lounge/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  FiTrash2,
  FiEdit2,
  FiX,
  FiImage,
  FiType,
  FiPaperclip,
  FiStar,
} from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage";

type SectionType = "IMAGE" | "TEXT";

interface SectionData {
  id: number;
  type: SectionType;
  files: File[]; // IMAGE: 업로드할 새 파일들 (carousel 다중 지원)
  previewUrls: string[]; // IMAGE: 미리보기/기존 URL 배열
  title: string;
  subtitle: string;
  description: string;
}

interface AttachmentItem {
  id: number;
  file: File | null; // 새 파일
  name: string;
  url: string; // 기존 URL 또는 업로드 후 URL
}

export default function RegisterLoungePage() {
  const [lounges, setLounges] = useState<any[]>([]);

  // 기본 정보
  const [title, setTitle] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  // 본문 섹션
  const [sections, setSections] = useState<SectionData[]>([]);

  // 첨부파일
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPageKey, setNextPageKey] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    fetchLounges();
  }, []);

  const fetchLounges = async (loadMore = false) => {
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/lounges?limit=10`;
      if (loadMore && nextPageKey) url += `&lastEvaluatedKey=${nextPageKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("라운지 목록 조회 실패:", res.status);
        return;
      }
      const data = await res.json();
      if (loadMore) setLounges((prev) => [...prev, ...(data.data || [])]);
      else setLounges(data.data || []);
      setNextPageKey(data.nextPageKey);
      setHasNextPage(data.hasNextPage);
    } catch (err) {
      console.error("라운지 목록 fetch 에러:", err);
    }
  };

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

  // --- 첨부파일 핸들러 ---
  const handleAddAttachments = (fileList: FileList | null) => {
    if (!fileList) return;
    const added: AttachmentItem[] = Array.from(fileList).map((f) => ({
      id: Date.now() + Math.random(),
      file: f,
      name: f.name,
      url: "",
    }));
    setAttachments((prev) => [...prev, ...added]);
  };
  const removeAttachment = (id: number) =>
    setAttachments(attachments.filter((a) => a.id !== id));

  // 등록/수정 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      // 1. 본문 섹션 처리 (IMAGE: 새 파일은 업로드, 없으면 기존 URL 유지)
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

      // 2. 첨부파일 처리
      const processedAttachments = await Promise.all(
        attachments.map(async (att) => {
          if (att.file) {
            const url = await uploadImageToS3(att.file);
            return { name: att.name, url };
          }
          return { name: att.name, url: att.url };
        }),
      );

      const payload = {
        is_pinned: isPinned,
        title,
        date: publishDate,
        attachments: processedAttachments,
        sections: processedSections,
      };

      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/lounges/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/lounges`;
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
      fetchLounges();
    } catch (error: any) {
      console.error("라운지 저장 에러:", error);
      alert(`오류 발생: ${error?.message || "알 수 없는 에러"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (lounge: any) => {
    setEditId(lounge.id);
    setTitle(lounge.title || "");
    setPublishDate(lounge.date || "");
    setIsPinned(!!lounge.is_pinned);

    if (Array.isArray(lounge.sections)) {
      const restored = lounge.sections.map((sec: any, idx: number) => ({
        id: Date.now() + idx,
        type: sec.type,
        files: [],
        previewUrls: sec.type === "IMAGE" ? sec.images || [] : [],
        title: sec.title || "",
        subtitle: sec.subtitle || "",
        description: sec.description || "",
      }));
      setSections(restored);
    } else {
      setSections([]);
    }

    if (Array.isArray(lounge.attachments)) {
      const restoredAtts = lounge.attachments.map((a: any, idx: number) => ({
        id: Date.now() + idx + 1000,
        file: null,
        name: a.name || "",
        url: a.url || "",
      }));
      setAttachments(restoredAtts);
    } else {
      setAttachments([]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lounges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLounges();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setPublishDate("");
    setIsPinned(false);
    setSections([]);
    setAttachments([]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 🌟 상단: 폼 영역 */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {editId ? "엔지니어 라운지 글 수정" : "엔지니어 라운지 새 글 쓰기"}
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
          <div className="grid grid-cols-1 gap-4">
            {/* 상단 고정 토글 */}
            <label className="flex items-center gap-3 cursor-pointer select-none w-fit bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <FiStar
                className={isPinned ? "text-amber-500" : "text-slate-400"}
              />
              <span className="text-sm font-semibold text-slate-700">
                상단 고정 (Pinned)
              </span>
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
            />

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                등록 날짜
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                required
              />
            </div>
          </div>

          {/* 첨부파일 */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <FiPaperclip className="mr-2" /> 첨부파일
              </h3>
              <label className="text-sm border px-3 py-1.5 rounded bg-slate-50 text-slate-700 cursor-pointer hover:bg-slate-100">
                파일 추가
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleAddAttachments(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="space-y-2">
              {attachments.length === 0 && (
                <p className="text-sm text-slate-400">
                  첨부된 파일이 없습니다.
                </p>
              )}
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                    <FiPaperclip className="shrink-0" />
                    {att.url ? (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {att.name}
                      </a>
                    ) : (
                      <span className="truncate">{att.name}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 본문 에디터 (섹션 빌더) */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4 text-slate-900">
              <h3 className="text-lg font-bold">본문 내용 조립 (블록 빌더)</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addSection("IMAGE")}
                  className="text-sm border px-3 py-1 rounded bg-blue-50 text-blue-700 flex items-center"
                >
                  <FiImage className="mr-1" /> 이미지 블록 (Carousel)
                </button>
                <button
                  type="button"
                  onClick={() => addSection("TEXT")}
                  className="text-sm border px-3 py-1 rounded bg-indigo-50 text-indigo-700 flex items-center"
                >
                  <FiType className="mr-1" /> 텍스트 블록
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {sections.length === 0 && (
                <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 text-sm">
                  상단 버튼을 눌러 블록을 추가해 주세요. (이미지 블록은 여러
                  장을 올리면 carousel 형식으로 노출됩니다.)
                </div>
              )}
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="relative bg-slate-50 border p-4 rounded-lg"
                >
                  <button
                    type="button"
                    onClick={() => removeSection(sec.id)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500"
                  >
                    <FiTrash2 />
                  </button>

                  {sec.type === "IMAGE" && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-2 block">
                        이미지 블록 (여러 장 업로드 시 Carousel)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []).slice(
                            0,
                            20,
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
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                        {sec.previewUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            className="h-20 w-20 object-cover rounded border shrink-0"
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
                          className="w-1/2 p-2 border rounded text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="서브 부제목"
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
                        className="w-full p-2 border rounded h-28 text-slate-900"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isLoading
              ? "저장 중..."
              : editId
                ? "라운지 글 수정 완료"
                : "라운지 글 등록하기"}
          </button>
        </form>
      </div>

      {/* 🌟 하단: 목록 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          등록된 엔지니어 라운지 글
        </h3>
        <div className="space-y-3">
          {lounges.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              등록된 글이 없습니다.
            </p>
          )}
          {lounges.map((lounge) => (
            <div
              key={lounge.id}
              className="flex items-center justify-between border p-4 rounded-lg hover:bg-slate-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                {lounge.is_pinned && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded flex items-center shrink-0">
                    <FiStar className="mr-1" /> 고정
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-blue-500 font-bold mb-0.5">
                    {lounge.date}
                  </p>
                  <h4 className="font-bold text-slate-800 truncate">
                    {lounge.title}
                  </h4>
                  {Array.isArray(lounge.attachments) &&
                    lounge.attachments.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center">
                        <FiPaperclip className="mr-1" />
                        첨부 {lounge.attachments.length}개
                      </p>
                    )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleEditClick(lounge)}
                  className="text-slate-400 hover:text-green-600"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(lounge.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
        {hasNextPage && lounges.length > 0 && (
          <button
            onClick={() => fetchLounges(true)}
            className="w-full mt-4 py-2 border text-slate-600 rounded hover:bg-slate-50"
          >
            10개 더보기
          </button>
        )}
      </div>
    </div>
  );
}
