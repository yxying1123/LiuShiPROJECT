import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { sanitizeFilename } from '../../utils/exportUtils';

/**
 * 预览图片弹窗组件
 */
const PreviewDialog = ({ preview, isOpen, onClose, previewTitle }) => {
  const handleDownload = () => {
    if (!preview?.url) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const name = sanitizeFilename(preview.label || 'preview');
    const link = document.createElement('a');
    link.download = `scatter-preview-${name}-${timestamp}.png`;
    link.href = preview.url;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>图片预览</DialogTitle>
          <DialogDescription>
            {preview?.label ? `${previewTitle}：${preview.label}` : '散点图预览'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-slate-200 bg-white">
          {preview?.url ? (
            <img
              src={preview.url}
              alt={preview.label || 'preview'}
              className="max-h-[60vh] w-auto max-w-full object-contain"
            />
          ) : null}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            下载图片
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
