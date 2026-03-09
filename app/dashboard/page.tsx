// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import Link from "next/link";
import {
  FiPackage,
  FiUsers,
  FiMail,
  FiFileText,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

interface DashboardStats {
  counts: {
    devices: number;
    blogs: number;
    subscribers: number;
    inquiries: number;
  };
  recent_inquiries: {
    id: string;
    name: string;
    type: string;
    date: string;
  }[];
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard-stats`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (!res.ok) throw new Error("통계 로드 실패");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-slate-500 font-semibold animate-pulse text-lg">
          데이터를 분석 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 🌟 1. 상단 환영 메시지 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 rounded-2xl shadow-lg text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">환영합니다! 관리자님 👋</h1>
          <p className="text-slate-300">
            오늘도 우리엘전자 홈페이지의 새로운 현황을 확인해보세요.
          </p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm text-slate-300">최근 접속 시간</p>
          <p className="text-lg font-semibold">
            {new Date().toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      {/* 🌟 2. 핵심 지표 (Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 제품 통계 카드 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">
              등록된 총 제품 수
            </p>
            <p className="text-3xl font-black text-slate-800">
              {stats?.counts.devices || 0}{" "}
              <span className="text-sm font-normal text-slate-400">개</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FiPackage size={28} />
          </div>
        </div>

        {/* 블로그 통계 카드 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">
              발행된 블로그
            </p>
            <p className="text-3xl font-black text-slate-800">
              {stats?.counts.blogs || 0}{" "}
              <span className="text-sm font-normal text-slate-400">건</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <FiFileText size={28} />
          </div>
        </div>

        {/* 구독자 통계 카드 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">
              뉴스레터 구독자
            </p>
            <p className="text-3xl font-black text-slate-800">
              {stats?.counts.subscribers || 0}{" "}
              <span className="text-sm font-normal text-slate-400">명</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FiUsers size={28} />
          </div>
        </div>

        {/* 누적 문의 카드 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">
              누적 고객 문의
            </p>
            <p className="text-3xl font-black text-slate-800">
              {stats?.counts.inquiries || 0}{" "}
              <span className="text-sm font-normal text-slate-400">건</span>
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <FiMail size={28} />
          </div>
        </div>
      </div>

      {/* 🌟 3. 하단 상세 영역 (최근 문의 & 퀵 링크) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 최근 접수된 문의 내역 (가장 중요한 알림) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <FiClock className="mr-2 text-blue-500" /> 최근 접수된 고객 문의
            </h3>
            <Link
              href="/dashboard/manage_inquiry"
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center"
            >
              전체 보기 <FiArrowRight className="ml-1" />
            </Link>
          </div>
          <div className="p-2">
            {stats?.recent_inquiries && stats.recent_inquiries.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {stats.recent_inquiries.map((inq, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {inq.name}{" "}
                          <span className="font-normal text-slate-500 ml-2">
                            님의 새로운 문의가 있습니다.
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center">
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded mr-2">
                            {inq.type}
                          </span>
                          {new Date(inq.date).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/manage_inquiry"
                      className="text-sm border border-slate-300 px-3 py-1.5 rounded-md hover:bg-white font-semibold text-slate-600"
                    >
                      확인
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                <FiCheckCircle size={32} className="text-emerald-400 mb-2" />
                새로 접수된 문의가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 퀵 링크(바로가기) 섹션 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            빠른 작업 바로가기
          </h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/register_landing"
              className="block w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <p className="font-bold text-slate-800 group-hover:text-blue-700">
                🖥️ 랜딩페이지(메인) 관리
              </p>
              <p className="text-xs text-slate-500 mt-1">
                메인 배너와 슬라이드를 즉시 변경합니다.
              </p>
            </Link>
            <Link
              href="/dashboard/register_device"
              className="block w-full text-left p-4 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <p className="font-bold text-slate-800 group-hover:text-indigo-700">
                📦 신규 제품 등록하기
              </p>
              <p className="text-xs text-slate-500 mt-1">
                새로운 난방 기기나 제품을 등록합니다.
              </p>
            </Link>
            <Link
              href="/dashboard/manage_email"
              className="block w-full text-left p-4 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <p className="font-bold text-slate-800 group-hover:text-emerald-700">
                📧 전체 뉴스레터 발송
              </p>
              <p className="text-xs text-slate-500 mt-1">
                구독자들에게 새로운 소식을 메일로 보냅니다.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
