import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/files');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    const ok = login(username.trim(), password);
    if (ok) {
      navigate('/files');
    } else {
      setError('用户名或密码不正确');
    }
  };

  const visualSeed = useMemo(() => Math.random(), []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.38),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.32),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(244,114,182,0.25),transparent_55%)]" />
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl animate-[float_16s_ease-in-out_infinite]" />
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-orange-400/25 blur-3xl animate-[float_18s_ease-in-out_infinite]" />
        <div className="absolute left-1/3 bottom-10 h-80 w-80 rounded-full bg-rose-400/20 blur-3xl animate-[float_20s_ease-in-out_infinite]" />
      </div>
      <div className="absolute inset-0 particles-layer opacity-70" />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.08), transparent 35%),
            linear-gradient(180deg, rgba(30,41,59,0.4), rgba(15,23,42,0.9))`,
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)] sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">
                数据可视化平台
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                进入聚类分析系统
              </h1>
              <p className="max-w-lg text-sm text-slate-200/80">
                一键登录后，开始上传数据、选择坐标轴并探索散点图与聚类结果。
              </p>
              <div className="grid gap-4 text-xs text-slate-300/80 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-amber-100/80">动态视觉氛围</p>
                  <p className="mt-2 text-slate-300/70">
                    流动光影与渐变背景增强专注感
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-amber-100/80">快速分析流程</p>
                  <p className="mt-2 text-slate-300/70">
                    统一四步流程，随时返回结果列表
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-10 right-8 h-20 w-20 rounded-2xl border border-amber-200/40 bg-amber-400/20 blur-xl" />
              <div className="absolute -bottom-8 left-8 h-16 w-16 rounded-full border border-amber-200/30 bg-amber-300/20 blur-xl" />
              <form
                onSubmit={handleSubmit}
                className="relative rounded-[28px] border border-white/15 bg-slate-900/60 p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.8)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">管理员登录</h2>
                    <p className="mt-1 text-xs text-slate-300/80">使用管理员账号进入系统</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-amber-100">
                    {Math.floor(visualSeed * 9 + 1)}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="block text-xs font-semibold text-slate-200/80">
                    用户名
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/30"
                      placeholder="输入用户名"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-200/80">
                    密码
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/15 bg-slate-900/60 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/30"
                      placeholder="输入密码"
                    />
                  </label>
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-500/30 transition hover:translate-y-[-1px]"
                >
                  登录系统
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0% { transform: translate3d(0, 0, 0); }
            50% { transform: translate3d(0, -16px, 0); }
            100% { transform: translate3d(0, 0, 0); }
          }
          @keyframes particleDrift {
            0% { transform: translate3d(0, 0, 0); opacity: 0.65; }
            50% { transform: translate3d(20px, -30px, 0); opacity: 0.9; }
            100% { transform: translate3d(-10px, 20px, 0); opacity: 0.7; }
          }
          .particles-layer::before,
          .particles-layer::after {
            content: '';
            position: absolute;
            inset: -20%;
            background-image:
              radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px),
              radial-gradient(circle, rgba(251,146,60,0.5) 1px, transparent 1px),
              radial-gradient(circle, rgba(244,114,182,0.45) 1px, transparent 1px);
            background-size: 120px 120px, 160px 160px, 200px 200px;
            background-position: 0 0, 40px 60px, 80px 20px;
            filter: blur(0.2px);
            animation: particleDrift 18s ease-in-out infinite;
          }
          .particles-layer::after {
            background-size: 140px 140px, 180px 180px, 220px 220px;
            background-position: 20px 40px, 100px 10px, 0 80px;
            animation-duration: 26s;
          }
        `}
      </style>
    </div>
  );
};

export default LoginPage;
