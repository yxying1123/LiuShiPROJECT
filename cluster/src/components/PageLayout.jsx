import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  BarChart3, 
  FileText, 
  PieChart, 
  ChevronRight
} from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import { cn } from '@/lib/utils';

const topNavLinks = [
  { 
    label: '文件列表', 
    to: '/files',
    icon: FileText,
    description: '管理数据文件'
  },
  { 
    label: '数据分析', 
    to: '/scatter',
    icon: BarChart3,
    description: '可视化分析'
  },
  { 
    label: '分析结果', 
    to: '/results',
    icon: PieChart,
    description: '查看聚类结果'
  },
];

const PageLayout = ({
  title,
  subtitle,
  children,
  error,
  warning,
  actions,
  breadcrumb,
  containerClassName,
  cardClassName,
  contentClassName,
  stackClassName,
}) => {
  const lastErrorRef = useRef('');
  const lastWarningRef = useRef('');

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = '';
      return;
    }
    if (error !== lastErrorRef.current) {
      toast.error(error);
      lastErrorRef.current = error;
    }
  }, [error]);

  useEffect(() => {
    if (!warning) {
      lastWarningRef.current = '';
      return;
    }
    if (warning !== lastWarningRef.current) {
      toast.warning(warning);
      lastWarningRef.current = warning;
    }
  }, [warning]);

  return (
    <div className="min-h-screen text-slate-900">
      <div className="relative isolate overflow-hidden">
        {/* 粒子背景 */}
        <ParticleBackground className="opacity-40" particleCount={30} />
        
        {/* 原有的背景渐变效果 */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(87,61,35,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(87,61,35,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
        <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl animate-float" />
        <div className="pointer-events-none absolute left-0 top-32 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="pointer-events-none absolute bottom-20 right-1/4 h-48 w-48 rounded-full bg-rose-200/35 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

        <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 py-7", containerClassName)}>
          <motion.div
            className={cn("flex flex-col gap-4", stackClassName)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.header
              className="flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {/* 标题区域 - 更紧凑的设计 */}
              <motion.div
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 shadow-lg"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                {/* 装饰性背景 */}
                <div className="absolute inset-0 overflow-hidden opacity-50">
                  <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-white/10 blur-xl" />
                  <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                </div>

                <div className="relative flex flex-row items-center justify-between gap-4">
                  {/* 左侧导航链接 */}
                  <nav className="flex items-center gap-2">
                    {topNavLinks.map((link, index) => {
                      const Icon = link.icon;
                      return (
                        <React.Fragment key={link.to}>
                          {index > 0 && <div className="h-5 w-px bg-white/25" />}
                          <NavLink
                            to={link.to}
                            className={({ isActive }) =>
                              cn(
                                "group relative flex items-center gap-2 rounded-lg px-4 py-2 text-base font-medium transition-all duration-300",
                                isActive
                                  ? "bg-white/20 text-white shadow-sm"
                                  : "text-white/85 hover:bg-white/10 hover:text-white"
                              )
                            }
                          >
                            <Icon className="h-5 w-5" />
                            <span>{link.label}</span>
                          </NavLink>
                        </React.Fragment>
                      );
                    })}
                  </nav>

                  {/* 右侧系统标题 - 更精简 */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="hidden sm:block">
                      <h1 className="text-lg font-semibold text-white leading-tight">流式高维透视助手</h1>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 装饰性分隔线 */}
              <div className="h-px bg-gradient-to-r from-amber-100 via-orange-200 to-amber-100" />
            </motion.header>

            <motion.div
              className={cn(
                "rounded-[28px] border border-slate-200/70 bg-white/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur hover:shadow-[0_25px_70px_-40px_rgba(15,23,42,0.45)] transition-shadow duration-500",
                cardClassName
              )}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              whileHover={{ y: -5 }}
            >
              {(breadcrumb || actions) && (
                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:flex-nowrap">
                    {breadcrumb && <div className="min-w-0">{breadcrumb}</div>}
                    {actions && (
                      <div
                        className={cn(
                          "flex items-center justify-start sm:justify-end shrink-0",
                          !breadcrumb && "w-full"
                        )}
                      >
                        {actions}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <motion.div
                  className={cn("", contentClassName)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.6 }}
                >
                  {children}
                </motion.div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
