import React from "react";
import {Link} from "react-router-dom";
import {Compass} from "lucide-react";
import {Button} from "../components/Button";

export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen grid place-items-center bg-amber-50 px-4">
    <div className="text-center">
      <Compass size={40} className="mx-auto text-amber-400 mb-4" />
      <h1 className="font-display text-4xl text-slate-900">Page not found</h1>
      <p className="text-slate-500 mt-2 mb-6">
        That page doesn't exist. Let's get you back to your courses.
      </p>
      <Link to="/dashboard">
        <Button size="lg">Back to dashboard</Button>
      </Link>
    </div>
  </div>
);
