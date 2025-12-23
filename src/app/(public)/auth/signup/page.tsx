import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Opprett konto",
  description: "Opprett en konto for å administrere turneringer og lag.",
};

export default function SignupPage() {
  return <SignupForm />;
}
