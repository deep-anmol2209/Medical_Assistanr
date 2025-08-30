// src/pages/Signin.jsx
import { SignIn } from "@clerk/clerk-react";
import React from "react";
export default function Signin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Welcome Back
        </h1>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          afterSignInUrl="/chat"   // 👈 redirect after login
        />
      </div>
    </div>
  );
}
