// app/dashboard/register_guide/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiEdit2, FiX, FiFileText } from "react-icons/fi";
import { uploadImageToS3 } from "@/utils/uploadImage"; // PDF도 이 함수로 업로드 가능

export default function RegisterGuidePage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // 폼 상태
  const [mainCategory, setMainCategory] = useState("");
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState(""); // 기존 등록된 PDF 주소 (수정용)
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 페이지네이션 상태
  const [nextPageKey, setNextPageKey] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  // 데이터 로드
  useEffect(() => {
    fetchCategories();
    fetchGuides();
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

  const fetchGuides = async (loadMore = false) => {
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/guides?limit=10`;
      if (loadMore && nextPageKey) url += `&lastEvaluatedKey=${nextPageKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (loadMore) {
        setGuides((prev) => [...prev, ...data.data]);
      } else {
        setGuides(data.data);
      }
      setNextPageKey(data.nextPageKey);
      setHasNextPage(data.hasNextPage);
    } catch (err) {
      console.error(err);
    }
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
                가이드 제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-slate-900"
                required
                placeholder="예: URC-02 System (KOR)"
              />
            </div>
          </div>

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
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          등록된 가이드 목록
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b text-slate-500">
              <tr>
                <th className="px-4 py-3">카테고리</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">PDF 첨부</th>
                <th className="px-4 py-3">등록일</th>
                <th className="px-4 py-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {guides.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-blue-800">
                    {g.main_category}
                  </td>
                  <td className="px-4 py-3">{g.title}</td>
                  <td className="px-4 py-3">
                    {g.pdf_url ? (
                      <a
                        href={g.pdf_url}
                        target="_blank"
                        className="text-blue-500 flex items-center"
                      >
                        <FiFileText className="mr-1" /> 보기
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(g.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEditClick(g)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded mr-1"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 🌟 더보기 (페이지네이션) 버튼 */}
        {hasNextPage && (
          <div className="mt-6 text-center">
            <button
              onClick={() => fetchGuides(true)}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              10개 더보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
