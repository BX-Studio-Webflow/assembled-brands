import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { createAsset, uploadFinancialDocument } from "@/lib/financeApi";
import {
  FILE_RULES,
  type FileRuleKey,
  type FinanceDocumentType,
  type FinancePage,
} from "@/lib/financeTypes";

// Which file rule governs each document type (mirrors the warm-lead flow).
const DOC_TYPE_RULE: Record<FinanceDocumentType, FileRuleKey> = {
  monthly_income_statement: "excel",
  monthly_balance_sheet: "excel",
  monthly_income_forecast: "excel",
  income_statement_forecast: "excel",
  balance_sheet_full_year_forecast: "excel",
  monthly_inventory_report: "excel",
  accounts_receivable_aging: "excel",
  accounts_payable_aging: "excel",
  shopify_sales_over_time: "excel",
  shopify_first_vs_returning_customers: "excel",
  management_bios: "team_leadership",
  investor_deck: "team_leadership",
  cap_table: "excel",
  instore_velocity_reports: "instore_velocity",
  business_plan: "business_plan",
};

const VALID_PAGES: FinancePage[] = [
  "financial-reports",
  "accounts-inventory",
  "ecommerce-performance",
  "team-ownership",
];

// Same-origin upload proxy. The browser sends one multipart POST here; this
// handler does the whole dance server-side (create asset -> PUT to S3 ->
// register the document), so the browser never makes a cross-origin call and
// the backend's CORS config is untouched.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json(
      { message: "Your session expired. Please reopen your invite link." },
      { status: 401 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const documentType = form.get("documentType") as FinanceDocumentType | null;
  const rawPage = form.get("page");
  const page: FinancePage =
    typeof rawPage === "string" && VALID_PAGES.includes(rawPage as FinancePage)
      ? (rawPage as FinancePage)
      : "financial-reports";

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file provided." }, { status: 400 });
  }
  if (typeof documentType !== "string" || !(documentType in DOC_TYPE_RULE)) {
    return NextResponse.json({ message: "Unknown document type." }, { status: 400 });
  }
  const rule = FILE_RULES[DOC_TYPE_RULE[documentType]];
  if (!rule.mimeTypes.includes(file.type)) {
    return NextResponse.json({ message: rule.invalidMessage }, { status: 400 });
  }

  try {
    const { asset, presignedUrl } = await createAsset(
      {
        fileName: file.name,
        contentType: file.type,
        assetType: "document",
        fileSize: file.size,
        duration: 0,
      },
      token
    );

    if (!presignedUrl) {
      return NextResponse.json(
        { message: "Could not get an upload URL from the server." },
        { status: 502 }
      );
    }

    const bytes = await file.arrayBuffer();

    const putRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: bytes,
    });
    if (!putRes.ok) {
      return NextResponse.json(
        { message: "Failed to upload the file to storage." },
        { status: 502 }
      );
    }

    const fileData = Buffer.from(bytes).toString("base64");

    const { document } = await uploadFinancialDocument(
      {
        page,
        document_type: documentType as FinanceDocumentType,
        asset_id: asset.id,
        file_name: file.name,
        file_mime_type: file.type,
        file_data: fileData,
      },
      token
    );

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        document_type: document.document_type,
        asset_name: document.asset_name ?? file.name,
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "There was a problem uploading the file.";
    return NextResponse.json({ message }, { status });
  }
}
