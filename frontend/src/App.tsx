import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { AuthProvider } from "./context/AuthContext";
import { CameraPage } from "./pages/CameraPage";
import { ContentDetailPage } from "./pages/ContentDetailPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { FolderDetailPage } from "./pages/FolderDetailPage";
import { FoldersPage } from "./pages/FoldersPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProcessingPage } from "./pages/ProcessingPage";
import { ResultPage } from "./pages/ResultPage";
import { ReviewCapturePage } from "./pages/ReviewCapturePage";
import { SettingsPage } from "./pages/SettingsPage";

/** Rotas que exigem sessão. Declarar em dado evita repetir o wrapper em cada uma. */
const PROTECTED_ROUTES = [
  { path: "/", element: <HomePage /> },
  { path: "/camera", element: <CameraPage /> },
  { path: "/camera/review", element: <ReviewCapturePage /> },
  { path: "/processing", element: <ProcessingPage /> },
  { path: "/result", element: <ResultPage /> },
  { path: "/flashcards", element: <FlashcardsPage /> },
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
