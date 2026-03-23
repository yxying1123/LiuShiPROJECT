import React from 'react';
import { Download, FileImage, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { sanitizeFilename, downloadImageAsPdf } from '../../utils/exportUtils';

/**
 * 预览图片弹窗组件
 */
const PreviewDialog = ({ preview, isOpen, onClose, previewTitle }) => {
  const handleDownload = async (format = 'png') => {
    if (!preview?.url) return;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const name = sanitizeFilename(preview.label || 'preview');

    if (format === 'pdf') {
      await downloadImageAsPdf(preview.url, `scatter-preview-${name}-${timestamp}`, { orientation: 'landscape' });
    } else {
      const link = document.createElement('a');
      link.download = `scatter-preview-${name}-${timestamp}.png`;
      link.href = preview.url;
      link.click();
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="mr-2 h-4 w-4" />
                下载
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload('png')}>
                <FileImage className="mr-2 h-4 w-4" />
                下载为 PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                下载为 PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
