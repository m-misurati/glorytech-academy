import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../../lib/supabase';

// PostgREST answers PGRST202 when the RPC does not exist yet (migration not applied).
function isMissingFunction(error) {
  return error?.code === 'PGRST202' || error?.code === '42883' || /get_dashboard/i.test(error?.message || '');
}

export function useDashboard(instructorId = null) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    const { data, error } = await getDashboard(instructorId);
    setState((current) => ({
      // Keep the previous render while refreshing; replace it only on success.
      data: error ? current.data : data,
      error: error ? { message: error.message, notMigrated: isMissingFunction(error) } : null,
      loading: false,
    }));
  }, [instructorId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
