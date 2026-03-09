// app/dashboard/manage_email/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { FiTrash2, FiMail, FiCheckSquare, FiSquare } from "react-icons/fi";

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

export default function ManageEmailPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/subscribers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setSubscribers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  // --- 체크박스 핸들러 ---
  const handleSelectAll = () => {
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([]); // 전체 해제
    } else {
      setSelectedIds(subscribers.map((sub) => sub.id)); // 전체 선택
    }
  };

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // --- 메일 전송 액션 (기본 메일 클라이언트 연동) ---
  const handleSendMail = () => {
    if (selectedIds.length === 0) {
      alert("메일을 전송할 구독자를 선택해주세요.");
      return;
    }

    // 선택된 ID들을 기반으로 이메일 주소 배열 추출
    const selectedEmails = subscribers
      .filter((sub) => selectedIds.includes(sub.id))
      .map((sub) => sub.email);

    // 숨은 참조(BCC)로 여러 명에게 한 번에 메일 보내기 준비 (개인정보 보호를 위해 BCC 사용)
    const bccString = selectedEmails.join(",");
    const subject = encodeURIComponent(
      "[우리엘전자] 새로운 소식을 전해드립니다.",
    );

    // 브라우저의 기본 메일 앱(아웃룩, 애플 메일 등) 띄우기
    window.location.href = `mailto:?bcc=${bccString}&subject=${subject}`;
  };

  // --- 개별/선택 삭제 ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 이 구독자를 삭제하시겠습니까?")) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscribers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // 화면 갱신 및 선택 해제
      setSubscribers(subscribers.filter((sub) => sub.id !== id));
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 🌟 헤더 및 액션 버튼 영역 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            구독자 이메일 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            총{" "}
            <span className="font-bold text-blue-600">
              {subscribers.length}
            </span>
            명의 구독자가 있습니다. 선택된 구독자: {selectedIds.length}명
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
          >
            {selectedIds.length === subscribers.length &&
            subscribers.length > 0 ? (
              <FiCheckSquare className="mr-2 text-blue-500" />
            ) : (
              <FiSquare className="mr-2 text-slate-400" />
            )}
            전체 선택
          </button>
          <button
            onClick={handleSendMail}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors"
          >
            <FiMail className="mr-2" /> 선택된 이메일로 메일 보내기
          </button>
        </div>
      </div>

      {/* 🌟 구독자 리스트 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">
            데이터를 불러오는 중입니다...
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 text-slate-500">
            등록된 구독자가 없습니다.
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="px-6 py-4 w-12 text-center">선택</th>
                <th className="px-6 py-4">이메일 주소</th>
                <th className="px-6 py-4">구독 신청일</th>
                <th className="px-6 py-4 text-center w-24">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscribers.map((sub) => (
                <tr
                  key={sub.id}
                  className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(sub.id) ? "bg-blue-50/50" : ""}`}
                >
                  <td
                    className="px-6 py-4 text-center cursor-pointer"
                    onClick={() => toggleSelection(sub.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(sub.id)}
                      onChange={() => toggleSelection(sub.id)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {sub.email}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(sub.created_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
