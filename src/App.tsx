import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import RapportForm from "./pages/RapportForm";
import InscriptionForm from "./pages/InscriptionForm";
import ProclamateursGestion from "./pages/ProclamateursGestion";
import AdminPanel from "./pages/AdminPanel";
import Parametrage from "./pages/Parametrage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/rapport" element={<ProtectedRoute><RapportForm /></ProtectedRoute>} />
            <Route path="/inscription" element={<ProtectedRoute><InscriptionForm /></ProtectedRoute>} />
            <Route path="/proclamateurs" element={<ProtectedRoute><ProclamateursGestion /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
            <Route path="/parametrage" element={<ProtectedRoute><Parametrage /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
