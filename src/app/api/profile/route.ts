import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCollection } from "@/lib/db";
import { ObjectId } from "mongodb";
import { autoTranslate } from "@/lib/translate";
import { type Locale } from "@/lib/i18n";
import { invalidateUser } from "@/lib/userCache";

// GET - Fetch current user profile
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collection = await getCollection("users");
    const user = await collection.findOne({
      _id: new ObjectId(currentUser.userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      ...userWithoutPassword,
      _id: user._id.toString(),
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: any = await request.json();
    const collection = await getCollection("users");

    const update: any = {
      updatedAt: new Date(),
    };

    // Get current user to check existing translations
    const currentUserDoc = await collection.findOne({
      _id: new ObjectId(currentUser.userId),
    });

    // Update only provided fields
    if (body.displayName !== undefined) update.displayName = body.displayName;
    if (body.organization !== undefined) update.organization = body.organization;
    if (body.location !== undefined) update.location = body.location;
    if (body.country !== undefined) update.country = body.country;
    if (body.city !== undefined) update.city = body.city;
    if (body.region !== undefined) update.region = body.region;
    if (body.role_custom !== undefined) update.role_custom = body.role_custom;
    if (body.interests !== undefined) update.interests = body.interests;
    if (body.profilePicture !== undefined) update.profilePicture = body.profilePicture;
    if (body.coverImage !== undefined) update.coverImage = body.coverImage;
    if (body.website !== undefined) update.website = body.website;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.linkedin !== undefined) update.linkedin = body.linkedin;
    if (body.twitter !== undefined) update.twitter = body.twitter;

    // Auto-translate text fields
    const sourceLocale: Locale = (body.locale as Locale) || "me";

    // Headline auto-translate
    if (body.headline !== undefined && body.headline.trim() !== "") {
      update.headline = body.headline;
      console.log(`[AUTO-TRANSLATE] Translating 'headline' field: "${body.headline}" from ${sourceLocale}`);
      try {
        const headlineTranslations = await autoTranslate(body.headline, sourceLocale);
        console.log(`[AUTO-TRANSLATE] Headline translations received:`, Object.keys(headlineTranslations));
        update.headlineTranslations = headlineTranslations;
      } catch (error) {
        console.error("Error translating headline:", error);
        // Keep original if translation fails
        update.headlineTranslations = {
          me: body.headline,
          en: body.headline,
          it: body.headline,
          sq: body.headline,
        };
      }
    }

    // About auto-translate
    if (body.about !== undefined && body.about.trim() !== "") {
      update.about = body.about;
      console.log(`[AUTO-TRANSLATE] Translating 'about' field: "${body.about.substring(0, 50)}..." from ${sourceLocale}`);
      try {
        const aboutTranslations = await autoTranslate(body.about, sourceLocale);
        console.log(`[AUTO-TRANSLATE] About translations received:`, Object.keys(aboutTranslations));
        update.aboutTranslations = aboutTranslations;
      } catch (error) {
        console.error("Error translating about:", error);
        update.aboutTranslations = {
          me: body.about,
          en: body.about,
          it: body.about,
          sq: body.about,
        };
      }
    }

    // Skills auto-translate
    if (body.skills !== undefined && Array.isArray(body.skills)) {
      update.skills = body.skills;
      try {
        const skillsTranslations: Record<string, string[]> = {
          me: body.skills,
          en: [],
          it: [],
          sq: [],
        };
        
        // Translate each skill
        for (const skill of body.skills) {
          if (skill && typeof skill === "string") {
            const skillTranslations = await autoTranslate(skill, sourceLocale);
            skillsTranslations.en.push(skillTranslations.en);
            skillsTranslations.it.push(skillTranslations.it);
            skillsTranslations.sq.push(skillTranslations.sq);
          }
        }
        
        update.skillsTranslations = skillsTranslations;
      } catch (error) {
        console.error("Error translating skills:", error);
        update.skillsTranslations = {
          me: body.skills,
          en: body.skills,
          it: body.skills,
          sq: body.skills,
        };
      }
    }

    // Experience auto-translate
    if (body.experience !== undefined && Array.isArray(body.experience)) {
      const translatedExperience = await Promise.all(
        body.experience.map(async (exp: any) => {
          const translated = { ...exp };
          
          // Translate title
          if (exp.title) {
            try {
              const titleTranslations = await autoTranslate(exp.title, sourceLocale);
              translated.titleTranslations = titleTranslations;
            } catch (error) {
              console.error("Error translating experience title:", error);
              translated.titleTranslations = {
                me: exp.title,
                en: exp.title,
                it: exp.title,
                sq: exp.title,
              };
            }
          }

          // Translate description
          if (exp.description) {
            try {
              const descTranslations = await autoTranslate(exp.description, sourceLocale);
              translated.descriptionTranslations = descTranslations;
            } catch (error) {
              console.error("Error translating experience description:", error);
              translated.descriptionTranslations = {
                me: exp.description,
                en: exp.description,
                it: exp.description,
                sq: exp.description,
              };
            }
          }

          return translated;
        })
      );
      update.experience = translatedExperience;
    }

    // Education auto-translate
    if (body.education !== undefined && Array.isArray(body.education)) {
      const translatedEducation = await Promise.all(
        body.education.map(async (edu: any) => {
          const translated = { ...edu };
          
          // Translate school name
          if (edu.school) {
            try {
              const schoolTranslations = await autoTranslate(edu.school, sourceLocale);
              translated.schoolTranslations = schoolTranslations;
            } catch (error) {
              console.error("Error translating school:", error);
              translated.schoolTranslations = {
                me: edu.school,
                en: edu.school,
                it: edu.school,
                sq: edu.school,
              };
            }
          }

          // Translate degree
          if (edu.degree) {
            try {
              const degreeTranslations = await autoTranslate(edu.degree, sourceLocale);
              translated.degreeTranslations = degreeTranslations;
            } catch (error) {
              console.error("Error translating degree:", error);
              translated.degreeTranslations = {
                me: edu.degree,
                en: edu.degree,
                it: edu.degree,
                sq: edu.degree,
              };
            }
          }

          // Translate description
          if (edu.description) {
            try {
              const descTranslations = await autoTranslate(edu.description, sourceLocale);
              translated.descriptionTranslations = descTranslations;
            } catch (error) {
              console.error("Error translating education description:", error);
              translated.descriptionTranslations = {
                me: edu.description,
                en: edu.description,
                it: edu.description,
                sq: edu.description,
              };
            }
          }

          return translated;
        })
      );
      update.education = translatedEducation;
    }

    // Log what we're about to save
    console.log(`[AUTO-TRANSLATE] Saving profile update with translations:`, {
      hasAboutTranslations: !!update.aboutTranslations,
      hasHeadlineTranslations: !!update.headlineTranslations,
      hasSkillsTranslations: !!update.skillsTranslations,
      experienceCount: update.experience?.length || 0,
      educationCount: update.education?.length || 0,
    });

    const result = await collection.updateOne(
      { _id: new ObjectId(currentUser.userId) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    invalidateUser(currentUser.userId);

    const updated = await collection.findOne({
      _id: new ObjectId(currentUser.userId),
    });

    // Log what was actually saved
    console.log(`[AUTO-TRANSLATE] Profile saved. Checking saved translations:`, {
      hasAboutTranslations: !!(updated as any)?.aboutTranslations,
      hasHeadlineTranslations: !!(updated as any)?.headlineTranslations,
      aboutTranslationsKeys: (updated as any)?.aboutTranslations ? Object.keys((updated as any).aboutTranslations) : [],
    });

    const { password, ...userWithoutPassword } = updated!;

    return NextResponse.json({
      ...userWithoutPassword,
      _id: userWithoutPassword._id.toString(),
      createdAt: userWithoutPassword.createdAt?.toISOString(),
      updatedAt: userWithoutPassword.updatedAt?.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
