import { useTranslation } from "react-i18next";
import type { CourseScope, CourseSearch } from "@/lib/courseFilters";

type Label = (kind: "categories" | "subCategories", value: string) => string;

/**
 * Title, lead and breadcrumb of a catalogue for the scope the visitor picked: the whole
 * catalogue, a category, a sub-field or a topic (like a category landing page).
 */
export function useCatalogHeading(
  scope: CourseScope,
  label: Label,
  fallback: { title: string; lead: string },
) {
  const { t, i18n } = useTranslation();
  const { category, subCategory, topic } = scope;
  const crumbs: { text: string; patch: Partial<CourseSearch> }[] = [];
  if (category || subCategory || topic)
    crumbs.push({
      text: t("catalog.header.all"),
      patch: { category: undefined, subCategory: undefined, topic: undefined },
    });
  if (category && (subCategory || topic))
    crumbs.push({
      text: label("categories", category),
      patch: { subCategory: undefined, topic: undefined },
    });
  if (subCategory && topic)
    crumbs.push({ text: label("subCategories", subCategory), patch: { topic: undefined } });

  const where = subCategory
    ? label("subCategories", subCategory)
    : category
      ? label("categories", category)
      : "";
  const heading = topic
    ? {
        title: t("catalog.header.topicTitle", { topic }),
        lead: where
          ? t("catalog.header.topicLeadIn", { topic, where })
          : t("catalog.header.topicLead", { topic }),
      }
    : subCategory
      ? {
          title: label("subCategories", subCategory),
          lead: t("catalog.header.subLead", {
            sub: label("subCategories", subCategory),
            category: category ? label("categories", category) : "",
          }),
        }
      : category
        ? {
            title: label("categories", category),
            lead: i18n.exists(`dynamic.categoryDescriptions.${category}`)
              ? t(`dynamic.categoryDescriptions.${category}`)
              : t("catalog.header.categoryLead", { category: label("categories", category) }),
          }
        : fallback;
  return { ...heading, crumbs, eyebrow: crumbs.length ? undefined : t("catalog.eyebrow") };
}
