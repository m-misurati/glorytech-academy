import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { courses as seedCourses } from '../data/courses';
import { getPublishedCatalog, isSupabaseConfigured } from '../lib/supabase';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [courses, setCourses] = useState(seedCourses);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    getPublishedCatalog().then(({ data }) => {
      if (active && data?.length) setCourses(data);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    courses,
    availableCourses: courses.filter((course) => course.availability !== 'coming_soon'),
    upcomingCourses: courses.filter((course) => course.availability === 'coming_soon'),
    loading,
    getCourseBySlug: (slug) => courses.find((course) => course.slug === slug),
  }), [courses, loading]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}
