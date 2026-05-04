// Heavy fields stored inline on user docs (base64 images, large translations).
// Exclude from list/search/aggregate endpoints; only return them on detail views.
export const USER_LIST_EXCLUDE = {
  password: 0,
  profilePicture: 0,
  coverImage: 0,
  about: 0,
  aboutTranslations: 0,
  experience: 0,
  education: 0,
  skillsTranslations: 0,
  headlineTranslations: 0,
} as const;
