import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchSubCategories } from "./courseHelpers";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

// fetched once per page load; the taxonomy is fixed on the server
let taxonomy: Promise<Record<string, string[]>> | null = null;

/**
 * Sub-category and level selects for the course create/edit forms. The sub-category list
 * follows the chosen category and clears itself when the category no longer has it.
 */
export function CourseTaxonomyFields({
  category,
  subCategory,
  onSubCategoryChange,
  level,
  onLevelChange,
  selectClassName,
  labelClassName = "block text-sm font-medium",
}: {
  category: string;
  subCategory: string;
  onSubCategoryChange: (value: string) => void;
  level: string;
  onLevelChange: (value: string) => void;
  selectClassName: string;
  labelClassName?: string;
}) {
  const { t, i18n } = useTranslation();
  const [tree, setTree] = useState<Record<string, string[]> | null>(null);
  useEffect(() => {
    taxonomy ??= fetchSubCategories();
    taxonomy.then(setTree);
  }, []);

  const options = tree?.[category] ?? [];
  useEffect(() => {
    if (tree && subCategory && !options.includes(subCategory)) onSubCategoryChange("");
  }, [tree, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = (s: string) =>
    i18n.exists(`dynamic.subCategories.${s}`) ? t(`dynamic.subCategories.${s}`) : s;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className={labelClassName}>
          {t("courseModal.subCategory")}
          <select
            value={subCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            disabled={options.length === 0}
            className={`mt-1.5 disabled:opacity-60 ${selectClassName}`}
          >
            <option value="">{t("courseModal.selectSubCategory")}</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {sub(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="space-y-1.5">
        <label className={labelClassName}>
          {t("courseModal.level")}
          <select
            value={level}
            onChange={(e) => onLevelChange(e.target.value)}
            className={`mt-1.5 ${selectClassName}`}
          >
            <option value="">{t("courseModal.selectLevel")}</option>
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {t(`catalog.levels.${lv}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
