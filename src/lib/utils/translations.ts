export function translateEditionStatus(status: string): string {
  switch (status) {
    case "published":
      return "Publisert";
    case "draft":
      return "Utkast";
    case "archived":
      return "Arkivert";
    default:
      return status;
  }
}

export function translateEntryStatus(status: string): string {
  switch (status) {
    case "approved":
      return "Godkjent";
    case "pending":
      return "Venter";
    case "rejected":
      return "Avvist";
    case "withdrawn":
      return "Trukket";
    default:
      return status;
  }
}
