import { SiteNavbar } from "@/ui/components/site-navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNavbar />
      {children}
    </>
  );
}
