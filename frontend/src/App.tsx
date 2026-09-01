import { Routes, Route } from "react-router-dom";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { CameraPage } from "./pages/CameraPage";
import { ProcessingPage } from "./pages/ProcessingPage";
import { ResultPage } from "./pages/ResultPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { FoldersPage } from "./pages/FoldersPage";
import { FolderDetailPage } from "./pages/FolderDetailPage";
import { ContentDetailPage } from "./pages/ContentDetailPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/camera" element={<ProtectedRoute><CameraPage /></ProtectedRoute>} />
          <Route path="/processing" element={<ProtectedRoute><ProcessingPage /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
          <Route path="/flashcards" element={<ProtectedRoute><FlashcardsPage /></ProtectedRoute>} />
          <Route path="/folders" element={<ProtectedRoute><FoldersPage /></ProtectedRoute>} />
          <Route path="/folders/:id" element={<ProtectedRoute><FolderDetailPage /></ProtectedRoute>} />
          <Route path="/content/:id" element={<ProtectedRoute><ContentDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
