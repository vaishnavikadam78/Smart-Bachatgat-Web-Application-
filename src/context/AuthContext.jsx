import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("bachatgat_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData, token) => {
    localStorage.setItem("bachatgat_user", JSON.stringify(userData));
    localStorage.setItem("bachatgat_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("bachatgat_user");
    localStorage.removeItem("bachatgat_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);