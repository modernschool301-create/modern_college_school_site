// Shared date formatting. Every module displays dates in Nepal Standard Time
// (UTC+05:45) per CLAUDE.md — defined once here, imported everywhere, so no
// module re-invents the timezone or the format.

export const NPT_DATE = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'Asia/Kathmandu',
});
