import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export const AnimatedThemeToggler = () => {
  const { theme, setTheme } = useTheme();

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={theme}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="p-2 rounded-full hover:bg-gray-700"
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </motion.button>
    </AnimatePresence>
  );
};