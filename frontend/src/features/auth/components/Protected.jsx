import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { AuthBoot } from "./AuthShell";

const Protected = ({ children }) => {
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);

  if (loading) {
    return <AuthBoot label="Opening your research desk" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default Protected;
