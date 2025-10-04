import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <Layout className="flex items-center justify-center" hideTopBar hideBottomNav>
      <div className="w-full px-6 text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <div className="h-8 w-8 rounded bg-primary" />
        </div>
        <h1 className="text-3xl font-extrabold">Welcome</h1>
        <p className="mt-2 text-sm text-neutral-600">Drive</p>
        <p className="mt-2 text-sm text-neutral-600">With Safety</p>
        <div className="mt-8 space-y-3">
          <Link to="/login" className="block">
            <Button className="h-12 w-full rounded-full">Sign In</Button>
          </Link>
          <Link to="/register/name" className="block text-sm font-semibold">Create An Account</Link>
        </div>
      </div>
    </Layout>
  );
}
