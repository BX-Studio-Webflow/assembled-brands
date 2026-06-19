"use client";

import { useRouter } from "next/navigation";
import { Fragment, useMemo, useRef, useState } from "react";

import type { DocumentPageConfig, QuestionDef, SectionDef } from "@/lib/documentSections";
import { withBasePath } from "@/lib/config";
import {
  FILE_RULES,
  type BusinessProfile,
  type BusinessUpsertBody,
  type FinanceDocumentType,
} from "@/lib/financeTypes";

import styles from "./documentUpload.module.css";

export type ExistingDoc = { id: number; name: string };

type UploadResponse = {
  ok?: boolean;
  document?: { id: number; asset_name: string };
  message?: string;
};

type Props = {
  config: DocumentPageConfig;
  initialDocs: Partial<Record<FinanceDocumentType, ExistingDoc | null>>;
  initialAnswers: Record<string, string>;
  businessProfile: BusinessProfile | null;
};

export default function DocumentUploadForm({
  config,
  initialDocs,
  initialAnswers,
  businessProfile,
}: Props) {
  const router = useRouter();
  // Saved = persisted on the backend. Pending = chosen on screen, not yet
  // uploaded. Removed = saved docs the user cleared (deleted on Save). Nothing
  // touches the backend until the user clicks Save.
  const [docs, setDocs] =
    useState<Partial<Record<FinanceDocumentType, ExistingDoc | null>>>(initialDocs);
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<FinanceDocumentType, File>>>({});
  const [removed, setRemoved] = useState<Partial<Record<FinanceDocumentType, boolean>>>({});
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const questions = config.questions ?? [];

  // Sections gated by a question only render when that answer matches.
  const visibleSections = useMemo(
    () =>
      config.sections.filter((s) => {
        if (!s.conditionalOn) return true;
        return answers[s.conditionalOn.questionId] === s.conditionalOn.equals;
      }),
    [config.sections, answers],
  );

  const setError = (type: string, message: string | null) =>
    setErrors((prev) => ({ ...prev, [type]: message }));

  const onAnswerChange = (id: string, value: string) => {
    setQuestionError(null);
    setFormStatus("idle");
    setFormMessage(null);
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Select a file: validate and hold it on screen only. The actual upload is
  // deferred to Save, so re-picking simply overwrites the held file (no
  // duplicate ever reaches the backend / Drive).
  const handleFile = (section: SectionDef, file: File) => {
    setFormStatus("idle");
    setFormMessage(null);

    const rule = FILE_RULES[section.fileRule];
    if (!rule.mimeTypes.includes(file.type)) {
      setError(section.docType, rule.invalidMessage);
      return;
    }
    setError(section.docType, null);
    setPendingFiles((prev) => ({ ...prev, [section.docType]: file }));
    // Picking a new file supersedes any prior saved doc on the next Save.
    setRemoved((prev) => ({ ...prev, [section.docType]: false }));
  };

  // Clear the current selection. If it's a held (unsaved) file, just drop it.
  // If it's a saved doc, mark it for deletion on the next Save.
  const handleRemove = (section: SectionDef) => {
    setError(section.docType, null);
    setFormStatus("idle");
    setFormMessage(null);
    if (pendingFiles[section.docType]) {
      setPendingFiles((prev) => {
        const next = { ...prev };
        delete next[section.docType];
        return next;
      });
      return;
    }
    if (docs[section.docType]) {
      setRemoved((prev) => ({ ...prev, [section.docType]: true }));
    }
  };

  // Whether a section currently has a file the user intends to keep.
  const hasFile = (type: FinanceDocumentType) =>
    Boolean(pendingFiles[type]) || Boolean(docs[type] && !removed[type]);

  // Persist all held files and pending removals for the visible sections.
  // Returns false (and surfaces an error) if any operation fails.
  const commitDocuments = async (): Promise<boolean> => {
    for (const section of visibleSections) {
      const type = section.docType;
      const file = pendingFiles[type];

      if (file) {
        const body = new FormData();
        body.append("file", file);
        body.append("documentType", type);
        body.append("page", config.backendPage);
        let uploaded: { id: number; asset_name: string } | null = null;
        try {
          const res = await fetch(withBasePath("/api/financial-documents"), { method: "POST", body });
          const data = (await res.json().catch(() => null)) as UploadResponse | null;
          if (!res.ok || !data?.ok || !data.document) {
            setError(type, data?.message || "Upload failed. Please try again.");
            setFormStatus("error");
            setFormMessage(`Could not upload ${section.title}. Please try again.`);
            return false;
          }
          uploaded = data.document;
        } catch {
          setError(type, "We couldn't reach the server. Please try again.");
          setFormStatus("error");
          setFormMessage(`Could not upload ${section.title}. Please try again.`);
          return false;
        }
        setDocs((prev) => ({ ...prev, [type]: { id: uploaded!.id, name: uploaded!.asset_name } }));
        setPendingFiles((prev) => {
          const next = { ...prev };
          delete next[type];
          return next;
        });
        setRemoved((prev) => ({ ...prev, [type]: false }));
        continue;
      }

      // Removal of a previously saved doc (no replacement chosen).
      const existing = docs[type];
      if (removed[type] && existing) {
        try {
          const res = await fetch(withBasePath(`/api/financial-documents/${existing.id}`), {
            method: "DELETE",
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { message?: string } | null;
            setError(type, data?.message || "Could not remove the file.");
            setFormStatus("error");
            setFormMessage(`Could not remove ${section.title}. Please try again.`);
            return false;
          }
        } catch {
          setError(type, "We couldn't reach the server. Please try again.");
          setFormStatus("error");
          setFormMessage(`Could not remove ${section.title}. Please try again.`);
          return false;
        }
        setDocs((prev) => ({ ...prev, [type]: null }));
        setRemoved((prev) => ({ ...prev, [type]: false }));
      }
    }
    return true;
  };

  const saveQuestions = async (): Promise<boolean> => {
    if (questions.length === 0) return true;

    for (const q of questions) {
      const value = answers[q.id];
      if (!value) {
        setQuestionError(`Please answer: ${q.title}.`);
        setFormStatus("idle");
        return false;
      }
      if (q.freeText && value === q.freeText.whenValue && !answers[q.freeText.businessField]?.trim()) {
        setQuestionError(`Please provide ${q.freeText.label.toLowerCase()}.`);
        setFormStatus("idle");
        return false;
      }
    }
    setQuestionError(null);

    if (!businessProfile?.legal_name) {
      setFormStatus("error");
      setFormMessage("Your company profile is incomplete. Please revisit Company Profile first.");
      return false;
    }

    const payload: BusinessUpsertBody = {
      legal_name: businessProfile.legal_name,
      accounting_software: businessProfile.accounting_software || "other",
      headquarters: businessProfile.headquarters ?? "",
      description: businessProfile.description ?? "",
      year_formed: businessProfile.year_formed ?? "",
      other_accounting_software: businessProfile.other_accounting_software ?? "",
    };
    for (const q of questions) {
      if (q.businessField === "inventory_location") {
        payload.inventory_location = answers[q.id] as "US-CA" | "International";
        payload.international_location =
          answers[q.id] === "International" ? (answers.international_location ?? "").trim() : "";
      } else if (q.businessField === "raised_external_equity") {
        payload.raised_external_equity = answers[q.id] as "yes" | "no";
      }
    }

    const res = await fetch(withBasePath("/api/business"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      setFormStatus("error");
      setFormMessage(data?.message || "Could not save your answers. Please try again.");
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    const missing = visibleSections.some((s) => s.required && !hasFile(s.docType));
    if (missing) {
      setFormStatus("error");
      setFormMessage("Please upload all required documents before continuing.");
      return;
    }

    setFormStatus("saving");
    setFormMessage(null);

    try {
      // 1) Validate + persist business answers, 2) push held files/removals,
      // 3) advance page progress. Any failure aborts before navigation.
      const answersOk = await saveQuestions();
      if (!answersOk) return;

      const docsOk = await commitDocuments();
      if (!docsOk) return;

      const res = await fetch(withBasePath("/api/financial-page"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: config.backendPage }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setFormStatus("error");
        setFormMessage(data?.message || "Could not save your progress. Please try again.");
        return;
      }

      // Final step: mark the application submitted so progress reads 100%.
      if (!config.nextKey) {
        const done = await fetch(withBasePath("/api/financial-complete"), { method: "POST" });
        if (!done.ok) {
          const doneData = (await done.json().catch(() => null)) as { message?: string } | null;
          setFormStatus("error");
          setFormMessage(doneData?.message || "Could not submit your application. Please try again.");
          return;
        }
      }

      setFormStatus("success");
      const nextRoute = config.nextKey ? NEXT_ROUTES[config.nextKey] : "/thank-you";
      router.push(withBasePath(nextRoute));
    } catch {
      setFormStatus("error");
      setFormMessage("We couldn't reach the server. Please try again.");
    }
  };

  const buttonLabel =
    formStatus === "saving"
      ? "Saving\u2026"
      : formStatus === "success"
        ? "Saved \u2713"
        : config.nextKey
          ? "Save & Continue"
          : "Save";

  return (
    <div className={styles.page}>
      <header className={styles.titleCard}>
        <h1 className={styles.title}>{config.title}</h1>
      </header>

      <section className={styles.card}>
        {config.sections.map((section) => {
          const anchored = questions.filter((q) => q.anchorBeforeDocType === section.docType);
          const isVisible = visibleSections.includes(section);
          const heldFile = pendingFiles[section.docType];
          const savedDoc = docs[section.docType] ?? null;
          const isRemoved = Boolean(removed[section.docType]);
          const fileName = heldFile
            ? heldFile.name
            : savedDoc && !isRemoved
              ? savedDoc.name
              : null;
          const zoneState: ZoneState = heldFile
            ? "pending"
            : savedDoc && !isRemoved
              ? "saved"
              : "empty";
          return (
            <Fragment key={section.docType}>
              {anchored.map((q) => (
                <Question key={q.id} question={q} answers={answers} onChange={onAnswerChange} />
              ))}
              {isVisible && (
                <UploadZone
                  section={section}
                  fileName={fileName}
                  state={zoneState}
                  disabled={formStatus === "saving"}
                  error={errors[section.docType] ?? null}
                  onFile={(file) => handleFile(section, file)}
                  onRemove={() => handleRemove(section)}
                />
              )}
            </Fragment>
          );
        })}

        {questionError && (
          <p className={styles.formError} role="alert">
            {questionError}
          </p>
        )}
      </section>

      <div className={styles.footer}>
        <div className={styles.footerMsg}>
          {formMessage && (
            <p
              className={formStatus === "success" ? styles.formSuccess : styles.formError}
              role={formStatus === "error" ? "alert" : "status"}
            >
              {formMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.continueButton}
          onClick={handleContinue}
          disabled={formStatus === "saving"}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

type QuestionProps = {
  question: QuestionDef;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
};

function Question({ question, answers, onChange }: QuestionProps) {
  const value = answers[question.id] ?? "";
  const showFreeText = question.freeText && value === question.freeText.whenValue;

  return (
    <div className={styles.question}>
      <div className={styles.sectionInfo}>
        <p className={styles.sectionTitle}>{question.title}</p>
        <p className={styles.sectionDesc}>{question.description}</p>
      </div>
      <div className={styles.questionField}>
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(question.id, e.target.value)}
          aria-label={question.title}
        >
          <option value="" disabled>
            Select an option
          </option>
          {question.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {showFreeText && question.freeText && (
          <input
            className={styles.textInput}
            type="text"
            value={answers[question.freeText.businessField] ?? ""}
            placeholder={question.freeText.placeholder}
            aria-label={question.freeText.label}
            onChange={(e) => onChange(question.freeText!.businessField, e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

type ZoneState = "saved" | "pending" | "empty";

type ZoneProps = {
  section: SectionDef;
  fileName: string | null;
  state: ZoneState;
  disabled: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
};

function UploadZone({ section, fileName, state, disabled, error, onFile, onRemove }: ZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const rule = FILE_RULES[section.fileRule];
  const hasFile = state !== "empty";

  const openPicker = () => {
    if (disabled || hasFile) return;
    inputRef.current?.click();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || hasFile) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const boxClassName = [
    styles.dropzone,
    dragging ? styles.dropzoneDragging : "",
    hasFile ? styles.dropzoneFilled : "",
    error ? styles.dropzoneError : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.section}>
      <div className={styles.sectionInfo}>
        <p className={styles.sectionTitle}>
          {section.title}{" "}
          {section.required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : (
            <span className={styles.optionalTag}>(optional)</span>
          )}
        </p>
        <p className={styles.sectionDesc}>{section.description}</p>
        {section.exampleFile && (
          <a
            className={styles.exampleLink}
            href={withBasePath(`/examples/${section.exampleFile}`)}
            download={section.exampleDownloadName}
          >
            <FileIcon />
            {section.exampleLabel ?? "View a sample"}
          </a>
        )}
      </div>

      <div className={styles.sectionUpload}>
        <div
          className={boxClassName}
          role="button"
          tabIndex={0}
          aria-label={`Upload ${section.title}`}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!hasFile && !disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={rule.accept}
            className={styles.fileInput}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />

          {hasFile ? (
            <div className={styles.fileRow}>
              {state === "saved" ? <CheckIcon /> : <PendingIcon />}
              <span className={styles.fileName}>{fileName}</span>
              {state === "pending" && <span className={styles.pendingTag}>Ready to save</span>}
              <button
                type="button"
                className={styles.removeButton}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="Remove file"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <CloudIcon />
              <span className={styles.dropPrompt}>
                Drop documents here or <span className={styles.browse}>Browse</span>
              </span>
              <span className={styles.formats}>{rule.formatLabel}</span>
            </>
          )}
        </div>

        {error && (
          <p className={styles.zoneError} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// Route lookup kept in the client to avoid importing the full config map's
// functions; mirrors DOCUMENT_PAGES[key].route.
const NEXT_ROUTES: Record<string, string> = {
  "financial-reports": "/documents/financial-reports",
  "financial-forecasts": "/documents/financial-forecasts",
  "accounts-inventory": "/documents/accounts-inventory",
  "ecommerce-performance": "/documents/ecommerce-performance",
  "team-ownership": "/documents/team-ownership",
  "optional-documents": "/documents/optional-documents",
};

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M9 21a5 5 0 0 1-.5-9.97A7 7 0 0 1 22 11.5a4.5 4.5 0 0 1 1 8.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14v8m0-8-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#73a428" />
      <path
        d="m8 12 2.5 2.5L16 9"
        stroke="#fffbf5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#b8852b" strokeWidth="1.8" />
      <path
        d="M12 7.5v5l3 1.6"
        stroke="#b8852b"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
