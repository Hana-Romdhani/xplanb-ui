import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "@/lib/auth";

export default function PrivateRoute() {
    return isAuthed() ? <Outlet /> : <Navigate to="/login" replace />;
}

