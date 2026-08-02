import { requireApiAccess } from "../../../lib/authorization";
import { primaryEditableUnit } from "../../../lib/permissions";

export async function GET(request: Request) {
  const access = await requireApiAccess(request);
  if (!access) {
    return Response.json({ role: "user", assignedUnit: null });
  }

  return Response.json({
    role: access.role,
    assignedUnit: primaryEditableUnit(access),
    fullName: access.fullName,
    title: access.title,
  });
}
