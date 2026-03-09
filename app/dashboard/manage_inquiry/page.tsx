// app/dashboard/manage_inquiry/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiEye, FiX, FiMail, FiPhone } from "react-icons/fi";

interface Inquiry {
  id: string;
  Q_type: string;
  Q_name: string;
  Q_company: string;
  Q_phone_number: string;
  Q_email: string;
  Q_description: string;
  created_at: string;
}

export default function ManageInquiryPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태 관리
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/inquiries`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setInquiries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`${name}님의 문의 내역을 삭제하시겠습니까?`)) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/inquiries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries(inquiries.filter((inq) => inq.id !== id));
      if (selectedInquiry?.id === id) setSelectedInquiry(null); // 모달이 열려있었다면 닫기
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative">
      {/* 헤더 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800">
          고객 문의 (Contact Us) 관리
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          접수된 문의 내역: 총{" "}
          <span className="font-bold text-blue-600">{inquiries.length}</span>건
        </p>
      </div>

      {/* 문의 리스트 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">
            데이터 로딩 중...
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 text-slate-500">
            접수된 문의가 없습니다.
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-xs">
              <tr>
                <th className="px-4 py-4">접수일</th>
                <th className="px-4 py-4">문의 유형</th>
                <th className="px-4 py-4">이름 (소속)</th>
                <th className="px-4 py-4">내용 요약</th>
                <th className="px-4 py-4 text-center">상세 / 삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(inq.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded text-xs font-bold">
                      {inq.Q_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {inq.Q_name}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      ({inq.Q_company || "소속 없음"})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate overflow-hidden">
                    {inq.Q_description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedInquiry(inq)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="상세 보기"
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(inq.id, inq.Q_name)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🌟 상세 보기 모달 팝업 */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center bg-slate-800 text-white px-6 py-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs mr-3">
                  {selectedInquiry.Q_type}
                </span>
                {selectedInquiry.Q_name}님의 문의
              </h3>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-300 hover:text-white"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    소속(회사/기관)
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selectedInquiry.Q_company || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    접수 일시
                  </p>
                  <p className="font-semibold text-slate-800">
                    {new Date(selectedInquiry.created_at).toLocaleString(
                      "ko-KR",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    연락처
                  </p>
                  <a
                    href={`tel:${selectedInquiry.Q_phone_number}`}
                    className="font-semibold text-blue-600 flex items-center hover:underline"
                  >
                    <FiPhone className="mr-1.5" />
                    {selectedInquiry.Q_phone_number}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    이메일
                  </p>
                  <a
                    href={`mailto:${selectedInquiry.Q_email}`}
                    className="font-semibold text-blue-600 flex items-center hover:underline"
                  >
                    <FiMail className="mr-1.5" />
                    {selectedInquiry.Q_email}
                  </a>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800 mb-2 border-b pb-2">
                  문의 상세 내용
                </p>
                <div className="bg-white border border-slate-200 p-4 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[150px]">
                  {selectedInquiry.Q_description}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t">
              <a
                href={`mailto:${selectedInquiry.Q_email}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                답장 보내기
              </a>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
