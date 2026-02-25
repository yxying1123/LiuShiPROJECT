import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, label: '上传文件' },
  { id: 2, label: '降维选择' },
  { id: 3, label: '数据处理' },
  { id: 4, label: '聚类处理' },
];

export const AnalysisBreadcrumb = ({ currentStep = 1 }) => {
  const activeStep = Math.max(1, Math.min(currentStep, steps.length));
  const currentLabel = steps.find((step) => step.id === activeStep)?.label || '';

  return (
    <nav className="flex flex-wrap items-center gap-2 text-base text-slate-600">
      <Link to="/results" className="font-medium text-slate-700 transition hover:text-slate-900">
        聚类结果
      </Link>
      <span className="text-slate-400">/</span>
      <span className="text-slate-500">新建分析</span>
      <span className="text-slate-400">/</span>
      <span className="font-medium text-slate-900">{currentLabel}</span>
    </nav>
  );
};

export const AnalysisStepper = ({ currentStep = 1 }) => {
  const activeStep = Math.max(1, Math.min(currentStep, steps.length));

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isDone = step.id < activeStep;
          return (
            <div key={step.id} className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md'
                    : isDone
                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className={`${isActive ? 'text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'} text-base font-medium`}>
                {step.label}
              </div>
              {index < steps.length - 1 && (
                <div className="hidden h-px w-10 bg-slate-200 sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnalysisFlowHeader = ({ currentStep = 1 }) => (
  <div className="space-y-3">
    <AnalysisBreadcrumb currentStep={currentStep} />
    <AnalysisStepper currentStep={currentStep} />
  </div>
);

export default AnalysisFlowHeader;
