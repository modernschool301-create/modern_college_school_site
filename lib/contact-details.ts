// The school's real contact details, in one place. The footer and /privacy both
// render them, and a phone number that is right in one and stale in the other is
// worse than one that is stale in both — so neither hardcodes its own copy.
//
// Phones are DISPLAYED in the local form the school uses on its own signage and
// DIALLED in full international form, so tap-to-call works from a mobile that is
// not on a Nepali network.
export const SCHOOL_CONTACT = {
  address: 'Srijananagar, Bhaktapur Municipality-1, Bhaktapur, Nepal',
  phones: [
    { display: '01-6611411', dial: '+97716611411' },
    { display: '01-6619681', dial: '+97716619681' },
  ],
  emails: ['info@modern.edu.np', 'universalmoderncollege@gmail.com'],
} as const;
