// app/dashboard/register_faq/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiEdit2, FiX } from "react-icons/fi";

export default function RegisterFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFaqs = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/faqs`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setFaqs(data);
      } else {
        setFaqs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      if (!token) throw new Error("로그인 정보 없음");

      const payload = { question, answer };
      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/faqs/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/faqs`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("저장 실패");

      alert(editId ? "FAQ가 수정되었습니다." : "FAQ가 등록되었습니다.");
      setQuestion("");
      setAnswer("");
      setEditId(null);
      fetchFaqs();
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (faq: any) => {
    setEditId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 질문을 목록에서 삭제하시겠습니까?")) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFaqs();
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ===== 상단 폼 ===== */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {editId ? "FAQ 수정" : "FAQ 신규 등록"}
          </h2>
          {editId && (
            <button
              onClick={() => {
                setEditId(null);
                setQuestion("");
                setAnswer("");
              }}
              className="text-sm flex items-center text-slate-500 hover:text-slate-800"
            >
              <FiX className="mr-1" /> 수정 취소
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              질문 (Question)
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              답변 (Answer)
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg h-32 focus:ring-2 focus:ring-emerald-500 resize-none text-slate-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl shadow-lg transition-colors text-lg"
          >
            {isLoading ? "처리중..." : editId ? "FAQ 수정하기" : "FAQ 등록하기"}
          </button>
        </form>
      </div>

      {/* ===== 하단 리스트 ===== */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 ml-2">
          등록된 FAQ 목록 ({faqs.length})
        </h3>
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative"
          >
            <div className="absolute top-6 right-6 flex gap-2">
              <button
                onClick={() => handleEditClick(faq)}
                className="text-slate-400 hover:text-green-600"
              >
                <FiEdit2 size={18} />
              </button>
              <button
                onClick={() => handleDelete(faq.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
            <p className="font-bold text-lg text-slate-800 mb-2 pr-16">
              <span className="text-blue-500 mr-2">Q.</span>
              {faq.question}
            </p>
            <p className="text-slate-600 whitespace-pre-wrap">
              <span className="text-emerald-500 font-bold mr-2">A.</span>
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
