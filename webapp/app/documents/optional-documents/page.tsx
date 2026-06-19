import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AppShell from "@/components/AppShell";
import DocumentUploadForm from "@/components/DocumentUpload/DocumentUploadForm";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { loadDocumentPageData } from "@/lib/documentPageData";

export const dynamic = "force-dynamic";

export default async function OptionalDocumentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) redirect("/onboarding");

  const data = await loadDocumentPageData("optional-documents", token);

  return (
    <AppShell
      activeKey="optional-documents"
      percentage={data.percentage}
      companyName={data.companyName}
      contactEmail={data.contactEmail}
      sectionStatuses={data.sectionStatuses}
    >
      <DocumentUploadForm
        config={data.config}
        initialDocs={data.initialDocs}
        initialAnswers={data.initialAnswers}
        businessProfile={data.businessProfile}
      />
    </AppShell>
  );
}
