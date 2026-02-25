import UploadPage from "./pages/Index.jsx";
import FileListPage from "./pages/FileListPage.jsx";
import AxisSelectionPage from "./pages/AxisSelectionPage.jsx";
import ScatterPage from "./pages/ScatterPage.jsx";
import ClusterResultsPage from "./pages/ClusterResultsPage.jsx";
import { navigationLinks } from "./navigation.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
const pageByRoute = {
  "/files": <FileListPage />,
  "/upload": <UploadPage />,
  "/axes": <AxisSelectionPage />,
  "/scatter": <ScatterPage />,
  "/results": <ClusterResultsPage />,
};

export const navItems = navigationLinks.map((item) => ({
  ...item,
  page: pageByRoute[item.to],
}));
