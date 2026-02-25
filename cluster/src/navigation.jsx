import { Upload, BarChart3, ListChecks, Files } from "lucide-react";

export const navigationLinks = [
  {
    title: "文件列表",
    to: "/files",
    icon: <Files className="h-4 w-4" />,
  },
  {
    title: "上传文件",
    to: "/upload",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    title: "选择坐标轴",
    to: "/axes",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    title: "散点图展示",
    to: "/scatter",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    title: "聚类结果",
    to: "/results",
    icon: <ListChecks className="h-4 w-4" />,
  },
];
