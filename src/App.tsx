import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import SettingsPage from "./pages/SettingsPage";
import TaskPage from "./pages/TaskPage";
import PreviewPage from "./pages/PreviewPage";
import CustomCssPage from "./pages/CustomCssPage";
import { loadDefaultStyleConfig } from "./store/defaultStyleStore";
import { StyleConfig, buildDefaultStyleConfig } from "./types/style";
import DefaultStylePage from "./pages/DefaultStylePage";

type Page = "settings" | "task" | "preview" | "custom-css" | "default-style";

export default function App() {
  const [page, setPage] = useState<Page>("settings");
  const [dark, setDark] = useState(true);
  const [convertedHtml, setConvertedHtml] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [defaultStyleConfig, setDefaultStyleConfig] = useState<StyleConfig>(
    buildDefaultStyleConfig()
  );

  useEffect(() => {
    loadDefaultStyleConfig().then(setDefaultStyleConfig);
  }, []);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
        <Sidebar current={page} onChange={setPage} />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 頂部 bar */}
          <header className="h-11 shrink-0 flex items-center justify-end
            px-5 border-b border-zinc-800 bg-zinc-900">
            <ThemeToggle
              dark={dark}
              onToggle={() => setDark((d) => !d)}
            />
          </header>

          {/* 頁面內容 */}
          <main className="flex-1 overflow-hidden">
            {page === "settings" && <SettingsPage />}
            {page === "default-style" && (
              <DefaultStylePage
                onSave={(config) => setDefaultStyleConfig(config)}
              />
            )}
            {page === "task" && (
              <TaskPage
                onConverted={(html) => setConvertedHtml(html)}
                onTitleChange={(t) => setArticleTitle(t)}
                onNavigate={(p) => setPage(p)}
              />
            )}
            {page === "preview" && (
              <PreviewPage
                html={convertedHtml}
                title={articleTitle}
                defaultStyleConfig={defaultStyleConfig}
              />
            )}
            {page === "custom-css" && <CustomCssPage />}
          </main>
        </div>
      </div>
    </div>
  );
}