import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4 mr-2" />
          切換為深色模式
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 mr-2" />
          切換為淺色模式
        </>
      )}
    </button>
  );
}
