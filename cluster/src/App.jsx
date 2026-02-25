import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { navItems } from "./nav-items";
import { DataProvider } from "./context/data-context";
import ClusterRunPage from "./pages/ClusterRunPage.jsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <DataProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/results" replace />} />
            <Route path="/cluster" element={<ClusterRunPage />} />
            <Route path="/heatmap" element={<Navigate to="/cluster" replace />} />
            {navItems.map(({ to, page }) => (
              <Route key={to} path={to} element={page} />
            ))}
          </Routes>
        </HashRouter>
      </DataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
