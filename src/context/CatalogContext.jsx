import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { courses as seedCourses, instructors as seedInstructors } from '../data/courses';
import { getPublishedCatalog, isSupabaseConfigured } from '../lib/supabase';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ courses: seedCourses, instructors: seedInstructors });
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    getPublishedCatalog().then(({ data, error }) => {
      if (!active) return;
      // Keep the bundled catalog when the database is unreachable or not migrated yet.
      if (error) console.warn('Catalog fallback to bundled data:', error.message);
      if (data?.courses.length) setCatalog({ courses: data.courses, instructors: data.instructors.length ? data.instructors : seedInstructors });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => {
    const { courses, instructors } = catalog;
    return {
      courses,
      instructors,
      availableCourses: courses.filter((course) => course.availability !== 'coming_soon'),
      loading,
      getCourseBySlug: (slug) => courses.find((course) => course.slug === slug),
      getInstructor: (id) => instructors.find((instructor) => instructor.id === id),
      getInstructorBySlug: (slug) => instructors.find((instructor) => instructor.slug === slug),
      getCoursesByInstructor: (id) => courses.filter((course) => course.instructorId === id),
    };
  }, [catalog, loading]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}
