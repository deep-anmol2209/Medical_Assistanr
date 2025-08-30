// src/pages/Signup.jsx
import { SignUp } from "@clerk/clerk-react";
import React from "react";
export default function Signup() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          Create an Account
        </h1>
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          afterSignUpUrl="/chat"   // 👈 redirect after signup
        />
      </div>
    </div>
  );
}
