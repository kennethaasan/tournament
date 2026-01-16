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
