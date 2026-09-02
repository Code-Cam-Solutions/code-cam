import { Route, Routes } from "react-router-dom";
import { AccessibilityProvider } from "@/shared/context/AccessibilityContext";
import { AuthProvider } from "@/shared/context/AuthContext";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { NotFoundPage } from "@/shared/components/NotFoundPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { CameraPage } from "@/features/capture/pages/CameraPage";
import { ReviewCapturePage } from "@/features/capture/pages/ReviewCapturePage";
import { FormatSelectionPage } from "@/features/capture/pages/FormatSelectionPage";
import { ProcessingPage } from "@/features/capture/pages/ProcessingPage";
import { ResultPage } from "@/features/capture/pages/ResultPage";
import { HomePage } from "@/features/home/pages/HomePage";
import { ContentDetailPage } from "@/features/library/pages/ContentDetailPage";
import { FolderDetailPage } from "@/features/library/pages/FolderDetailPage";
import { FoldersPage } from "@/features/library/pages/FoldersPage";
import { SearchPage } from "@/features/library/pages/SearchPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { StudyPage } from "@/features/study/pages/StudyPage";

/** Rotas que exigem sessão. Declarar em dado evita repetir o wrapper em cada uma. */
const PROTECTED_ROUTES = [
  { path: "/", element: <HomePage /> },
  { path: "/camera", element: <CameraPage /> },
  { path: "/camera/review", element: <ReviewCapturePage /> },
  { path: "/camera/formats", element: <FormatSelectionPage /> },
  { path: "/processing", element: <ProcessingPage /> },
  { path: "/result", element: <ResultPage /> },
  { path: "/flashcards", element: <StudyPage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/folders", element: <FoldersPage /> },
  { path: "/folders/:id", element: <FolderDetailPage /> },
  { path: "/content/:id", element: <ContentDetailPage /> },
  { path: "/settings", element: <SettingsPage /> },
];

function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        {/* Primeiro elemento focável da página: permite pular a navegação e ir
            direto ao conteúdo, em vez de tabular pela barra a cada tela.
            WCAG 2.4.1. */}
        <a href="#main-content" className="skip-link sr-only">
          Pular para o conteúdo
        </a>

        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {PROTECTED_ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
          ))}

          {/* Antes esta rota caía no login, o que mostrava a tela de entrada a
              quem já estava autenticado e escondia o erro de endereço. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
