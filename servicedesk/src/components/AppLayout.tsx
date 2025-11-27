import { Outlet } from "react-router-dom";
import { Header } from "./layout";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Outlet />
    </div>
  );
}
