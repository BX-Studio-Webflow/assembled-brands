// AB originators the prospect may be working with (maps to HubSpot "Deal Owner").
// Emails verified against the HubSpot Owners API (crm/v3/owners) so deal-owner
// matching works. If the originator roster changes often, move this to a
// backend endpoint that reads HubSpot owners directly.
export const TEAM_MEMBERS: { value: string; label: string }[] = [
  { value: "kunal@assembledbrands.com", label: "Kunal Kohli" },
  { value: "david@assembledbrands.com", label: "Dave Warga" },
  { value: "michael@assembledbrands.com", label: "Michael Lipkin" },
  { value: "abby@assembledbrands.com", label: "Abby Jonathan" },
  { value: "jeff@assembledbrands.com", label: "Jeffrey Mangiafico" },
];
