export const formatAddress = (addressStr: string | null | undefined): string => {
  if (!addressStr) return '';
  try {
    const parsed = JSON.parse(addressStr);
    if (parsed.street) {
      let formatted = parsed.street;
      if (parsed.number) formatted += `, Nº ${parsed.number}`;
      if (parsed.cp) formatted += `, CP: ${parsed.cp}`;
      if (parsed.notes) formatted += ` - Notas: ${parsed.notes}`;
      return formatted;
    }
  } catch (e) {
    // If it's not JSON or doesn't have the expected format, just return the string
  }
  return addressStr;
};
