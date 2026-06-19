import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE } from "@/lib/config";
import { inviteMember, resolveHostTeamId } from "@/lib/teamApi";
import type { InviteMemberInput } from "@/lib/teamTypes";

type InviteResult = { email: string; ok: boolean; message?: string };

// Same-origin proxy: sends one or more team invitations. Resolves the host
// team_id server-side (the backend requires it in the body) so the client only
// supplies name/email/role/message. Invites are sent sequentially and each
// result is reported back so partial success is visible.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ message: "Your session expired." }, { status: 401 });
  }

  let members: InviteMemberInput[];
  try {
    const body = (await request.json()) as { members?: InviteMemberInput[] };
    members = Array.isArray(body.members) ? body.members : [];
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const cleaned = members
    .map((m) => ({
      name: (m.name ?? "").trim(),
      email: (m.email ?? "").trim(),
      role: (m.role ?? "").trim(),
      message: (m.message ?? "").trim(),
    }))
    .filter((m) => m.name || m.email || m.role);

  if (cleaned.length === 0) {
    return NextResponse.json({ message: "Add at least one team member." }, { status: 400 });
  }

  let teamId: number | null;
  try {
    teamId = await resolveHostTeamId(token);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not load your team.";
    return NextResponse.json({ message }, { status });
  }
  if (!teamId) {
    return NextResponse.json(
      { message: "We couldn't find a team to invite members to." },
      { status: 400 },
    );
  }

  const results: InviteResult[] = [];
  for (const member of cleaned) {
    try {
      await inviteMember(
        {
          invitee_email: member.email,
          invitee_name: member.name,
          team_id: teamId,
          user_defined_role: member.role,
          ...(member.message ? { message: member.message } : {}),
        },
        token,
      );
      results.push({ email: member.email, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invitation failed.";
      results.push({ email: member.email, ok: false, message });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 });
}
