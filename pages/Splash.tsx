import { useEffect } from "react";
import Layout from "@/components/app/Layout";
import { useNavigate } from "react-router-dom";

export default function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate("/welcome", { replace: true }), 1200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <Layout className="flex items-center justify-center" hideTopBar hideBottomNav>
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-white shadow-elevated">
          <span className="text-3xl font-extrabold">R</span>
        </div>
      </div>
    </Layout>
  );
}
