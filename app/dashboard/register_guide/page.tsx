// app/dashboard/register_guide/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  FiTrash2,
  FiEdit2,
  FiX,
  FiFileText,
  FiPlus,
  FiMove,
  FiLoader,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage"; // PDF도 이 함수로 업로드 가능
import { AutoTextarea } from "@/components/AutoTextarea";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SaveStatus = "idle" | "saving" | "saved" | "error";

// 🌟 D&D 가능한 가이드 테이블 행
function SortableGuideRow({
  guide,
  onEdit,
  onDelete,
}: {
  guide: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guide.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#f1f5f9" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-slate-50">
      <td className="px-3 py-3 w-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 touch-none"
          title="드래그하여 순서 변경"
          aria-label="순서 변경"
        >
          <FiMove />
        </button>
      </td>
      <td className="px-4 py-3 font-semibold text-blue-800">
        {guide.main_category}
      </td>
      <td className="px-4 py-3">{guide.title}</td>
      <td className="px-4 py-3">
        {guide.pdf_url ? (
          <a
            href={guide.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 flex items-center"
          >
            <FiFileText className="mr-1" /> 보기
          </a>
        ) : (
          "-"
        )}
      </td>
      <td className="px-4 py-3 text-slate-500">
        {new Date(guide.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onEdit}
          className="p-2 text-green-600 hover:bg-green-50 rounded mr-1"
        >
          <FiEdit2 />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 rounded"
        >
          <FiTrash2 />
        </button>
      </td>
    </tr>
  );
}

export default function RegisterGuidePage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // 폼 상태
  const [mainCategory, setMainCategory] = useState("");
  const [title, setTitle] = useState("");
  const [engTitle, setEngTitle] = useState(""); // 🌐 영문 (옵셔널)
  const [showEng, setShowEng] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState(""); // 기존 등록된 PDF 주소 (수정용)
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 D&D 자동 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🌐 영문 입력 토글
  const openEng = () => setShowEng(true);
  const closeEng = () => {
    if (engTitle &&
      !window.confirm("입력한 영문 내용을 비우고 영문 칸을 닫으시겠습니까?")) {
      return;
    }
    setEngTitle("");
    setShowEng(false);
  };

  // 데이터 로드
  useEffect(() => {
    fetchCategories();
    fetchGuides();
  }, []);

  // unmount 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/categories`,
      );
      const data = await res.json();
      setCategories(data);
      if (data.length > 0) setMainCategory(data[0].main_category);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔧 페이지네이션 제거 - 한 번에 모든 가이드 로드 (limit=1000)
  //   - 가이드 수가 적어 부담 없음
  //   - D&D로 순서 변경 가능
  const fetchGuides = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/guides?limit=1000`,
      );
      const data = await res.json();
      setGuides(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 🌟 D&D sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // 🌟 순서 자동 저장 (debounce 1초)
  const scheduleSave = (orderedIds: string[]) => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/guides/reorder`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ordered_ids: orderedIds }),
          },
        );
        if (!res.ok) throw new Error("저장 실패");
        setSaveStatus("saved");
        saveStatusTimerRef.current = setTimeout(
          () => setSaveStatus("idle"),
          3000,
        );
      } catch (err) {
        console.error("가이드 순서 저장 실패:", err);
        setSaveStatus("error");
      }
    }, 1000);
  };

  // 🌟 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = guides.findIndex((g) => g.id === active.id);
    const newIndex = guides.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newGuides = arrayMove(guides, oldIndex, newIndex);
    setGuides(newGuides);
    scheduleSave(newGuides.map((g) => g.id));
  };

  // 등록 및 수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error("로그인 필요");

      // PDF 업로드 처리
      let uploadedPdfUrl = pdfUrl;
      if (pdfFile) {
        uploadedPdfUrl = await uploadImageToS3(pdfFile); // 파일(PDF) S3 업로드
      }

      const payload = {
        main_category: mainCategory,
        title,
        eng_title: engTitle, // 🌐 영문 (빈 문자열 허용)
        pdf_url: uploadedPdfUrl,
        link_url: linkUrl,
        video_url: videoUrl,
      };

      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/guides/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/guides`;
      const method = editId ? "PUT" : "POST";

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      alert(editId ? "수정되었습니다." : "등록되었습니다.");
      resetForm();
      fetchGuides(); // 목록 새로고침
    } catch (error) {
      alert("오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (guide: any) => {
    setEditId(guide.id);
    setMainCategory(guide.main_category);
    setTitle(guide.title);
    // 🌐 영문 데이터 있으면 자동 펼침
    const et = guide.eng_title || "";
    setEngTitle(et);
    setShowEng(!!et);
    setPdfUrl(guide.pdf_url || "");
    setLinkUrl(guide.link_url || "");
    setVideoUrl(guide.video_url || "");
    setPdfFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/guides/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGuides();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setEngTitle("");
    setShowEng(false);
    setPdfFile(null);
    setPdfUrl("");
    setLinkUrl("");
    setVideoUrl("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 폼 영역 */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {editId ? "제품 가이드 수정" : "제품 가이드 등록"}
          </h2>
          {editId && (
            <button
              onClick={resetForm}
              className="text-sm text-slate-500 hover:text-slate-800 flex"
            >
              <FiX className="mr-1 mt-0.5" /> 수정 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                대상 카테고리
              </label>
              <select
                value={mainCategory}
                onChange={(e) => setMainCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-slate-900"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.main_category}>
                    {c.main_category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                가이드 제목 {showEng && <span className="text-slate-400 font-normal">(한글)</span>}
              </label>
              <AutoTextarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-slate-900"
                required
                placeholder="예: URC-02 System (KOR)"
              />
            </div>
          </div>

          {/* 🌐 영문 제목 (옵셔널) */}
          {showEng && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Title <span className="text-slate-400 font-normal">(English, 선택)</span>
              </label>
              <AutoTextarea
                value={engTitle}
                onChange={(e) => setEngTitle(e.target.value)}
                placeholder="e.g. URC-02 System Guide (ENG)"
                className="w-full px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
              />
            </div>
          )}

          {/* 🌐 영문 추가/제거 버튼 */}
          {showEng ? (
            <button
              type="button"
              onClick={closeEng}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 rounded-lg text-xs font-semibold transition-colors"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              영문 입력 제거
            </button>
          ) : (
            <button
              type="button"
              onClick={openEng}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-500 rounded-lg text-sm font-semibold transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              영문(English) 입력 추가하기
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                PDF 파일 업로드
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-900"
              />
              {pdfUrl && !pdfFile && (
                <div className="mt-2 text-xs text-blue-600 truncate">
                  현재 파일: {pdfUrl}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                링크 공유 URL
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm text-slate-900"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                관련 영상 URL (유튜브 등)
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-sm text-slate-900"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg transition-colors text-lg"
          >
            {isLoading
              ? "저장 중..."
              : editId
                ? "가이드 수정하기"
                : "가이드 등록하기"}
          </button>
        </form>
      </div>

      {/* 목록 영역 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold text-slate-800">
            등록된 가이드 목록 ({guides.length})
          </h3>

          {/* 저장 상태 인디케이터 */}
          {saveStatus !== "idle" && (
            <div className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border">
              {saveStatus === "saving" && (
                <>
                  <FiLoader className="animate-spin w-3 h-3 text-blue-600" />
                  <span className="text-blue-700 font-semibold">저장 중...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <FiCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">저장됨</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <FiAlertCircle className="w-3 h-3 text-red-600" />
                  <span className="text-red-700 font-semibold">
                    저장 실패
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-3">
          ⠿ 핸들을 드래그하면 순서가 자동 저장됩니다 (회사 홈페이지 표시 순서)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-3 py-3 w-10"></th>
                <th className="px-4 py-3">카테고리</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">PDF 첨부</th>
                <th className="px-4 py-3">등록일</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={guides.map((g) => g.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-slate-100">
                  {guides.map((g) => (
                    <SortableGuideRow
                      key={g.id}
                      guide={g}
                      onEdit={() => handleEditClick(g)}
                      onDelete={() => handleDelete(g.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>

        {guides.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 mt-4">
            등록된 가이드가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
